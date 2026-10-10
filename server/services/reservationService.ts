import crypto from 'crypto';
import { db } from '../db/database.js';
import type { ReservationRecord, BookingRecord } from '../db/database.js';
import { redisEngine } from '../redis/redisEngine.js';

export interface ReservationHoldRequest {
  eventId: string;
  unitId: string;
  userId: string;
  idempotencyKey?: string;
}

export interface ReservationConfirmRequest {
  reservationId: string;
  userId: string;
  idempotencyKey?: string;
  simulatedPaymentToken?: string;
}

export interface ReservationCancelRequest {
  reservationId: string;
  userId: string;
}

export class ReservationService {
  // Process-local guard complements Redis fencing. PostgreSQL uniqueness constraints remain
  // the cross-process source of truth once the persistent adapter is enabled.
  private static confirmationLocks = new Map<string, Promise<unknown>>();

  private static async withConfirmationLock<T>(reservationId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.confirmationLocks.get(reservationId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const chained = previous.catch(() => undefined).then(() => gate);
    this.confirmationLocks.set(reservationId, chained);
    await previous.catch(() => undefined);
    try { return await work(); }
    finally {
      release();
      if (this.confirmationLocks.get(reservationId) === chained) this.confirmationLocks.delete(reservationId);
    }
  }

  /**
   * Acquire an atomic temporary hold on a specific inventory unit
   */
  public static async createHold(req: ReservationHoldRequest): Promise<{
    reservation: ReservationRecord;
    expiresAt: string;
    serverTime: number;
    generation: number;
  }> {
    const { eventId, unitId, userId, idempotencyKey } = req;

    // 1. Validate event exists and is active
    const event = await db.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      throw new Error('Event is not open for reservation.');
    }

    // 2. Validate unit exists
    const unit = await db.getInventoryUnitById(unitId);
    if (!unit || unit.event_id !== eventId) {
      throw new Error('Requested inventory unit does not exist.');
    }

    // Idempotency keys are scoped to the requesting user and requested resource.
    // Reusing a key for a different request must not leak another user's reservation.
    if (idempotencyKey) {
      if (idempotencyKey.length > 128) {
        throw new Error('Idempotency key must be 128 characters or fewer.');
      }
      const existingHolds = await db.getActiveHolds();
      const match = existingHolds.find(h => h.idempotency_key === idempotencyKey);
      if (match) {
        if (match.user_id !== userId || match.event_id !== eventId || match.unit_id !== unitId) {
          throw new Error('Idempotency key was already used for a different reservation request.');
        }
        return {
          reservation: match,
          expiresAt: match.expires_at,
          serverTime: Date.now(),
          generation: match.generation
        };
      }
    }

    // 3. Generate cryptographic hold token
    const holdToken = `ht_${crypto.randomBytes(16).toString('hex')}`;
    const holdDurationMs = event.hold_duration_seconds * 1000;

    // 4. ATOMIC COORDINATION VIA REDIS LUA ENGINE
    const claimResult = await redisEngine.claimHold(
      eventId,
      unitId,
      userId,
      holdToken,
      holdDurationMs
    );

    if (!claimResult.success) {
      db.logAudit({
        id: `aud_claim_fail_${Date.now()}`,
        event_type: 'HOLD_COLLISION_REJECTED',
        entity_id: unitId,
        user_id: userId,
        details: { reason: claimResult.reason, eventId },
        created_at: new Date().toISOString()
      });

      if (claimResult.reason === 'ALREADY_CONFIRMED') {
        throw new Error('This seat has already been booked by another attendee.');
      } else {
        throw new Error('This seat is currently held by another attendee. Please select another seat.');
      }
    }

    const expiresAtIso = new Date(claimResult.expiresAt!).toISOString();
    const reservationId = `res_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 5. Persist reservation record in database
    const reservation: ReservationRecord = {
      id: reservationId,
      event_id: eventId,
      unit_id: unitId,
      user_id: userId,
      hold_token: holdToken,
      generation: claimResult.generation!,
      status: 'HELD',
      idempotency_key: idempotencyKey || null,
      expires_at: expiresAtIso,
      created_at: new Date().toISOString()
    };
    try {
      await db.createReservation(reservation);

      // Update the durable inventory projection and outbox. If any persistence step fails,
      // release only this exact generation/token so a later holder cannot be cleared.
      await db.updateInventoryUnit(unitId, {
        status: 'HELD',
        current_reservation_id: reservationId,
        current_generation: claimResult.generation!
      });

      await db.queueOutboxEvent('RESERVATION', reservationId, 'HOLD_ACQUIRED', {
        eventId, unitId, userId, generation: claimResult.generation, expiresAt: expiresAtIso
      });
    } catch (persistenceError) {
      try {
        const released = await redisEngine.releaseHold(eventId, unitId, holdToken, claimResult.generation!);
        if (released.success) {
          // Best-effort compensation for adapters that partially wrote the reservation.
          try { await db.updateReservation(reservationId, { status: 'FAILED' }); } catch { /* record may not exist */ }
          try { await db.updateInventoryUnit(unitId, { status: 'AVAILABLE', current_reservation_id: null, current_generation: released.generation ?? claimResult.generation! + 1 }); } catch { /* reconciler repairs projection */ }
        }
      } catch (compensationError) {
        console.error('[PulseReserve] Hold persistence failed and compensation needs reconciliation', { reservationId, compensationError });
      }
      throw new Error(`Could not persist reservation hold; the hold was compensated or queued for reconciliation. ${(persistenceError as Error).message}`);
    }

    db.logAudit({
      id: `aud_hold_${Date.now()}`,
      event_type: 'HOLD_ACQUIRED',
      entity_id: unitId,
      user_id: userId,
      details: {
        reservationId,
        generation: claimResult.generation,
        expiresAt: expiresAtIso
      },
      created_at: new Date().toISOString()
    });

    return {
      reservation,
      expiresAt: expiresAtIso,
      serverTime: Date.now(),
      generation: claimResult.generation!
    };
  }

  /**
   * Authoritatively confirm a hold into a confirmed booking
   */
  public static async confirmHold(req: ReservationConfirmRequest): Promise<{
    booking: BookingRecord;
    serverTime: number;
  }> {
    return this.withConfirmationLock(req.reservationId, () => this.confirmHoldUnlocked(req));
  }

  private static async confirmHoldUnlocked(req: ReservationConfirmRequest): Promise<{
    booking: BookingRecord;
    serverTime: number;
  }> {
    const { reservationId, userId, idempotencyKey } = req;

    // Check if reservation exists
    const reservation = await db.getReservationById(reservationId);
    if (!reservation) {
      throw new Error('Reservation record not found.');
    }

    if (reservation.user_id !== userId) {
      throw new Error('Unauthorized: Reservation does not belong to your account.');
    }

    // Check if already confirmed (idempotency check)
    if (reservation.status === 'CONFIRMED') {
      const existingBooking = await db.getBookingByReservationId(reservationId);
      if (existingBooking) {
        return { booking: existingBooking, serverTime: Date.now() };
      }
    }

    const now = Date.now();
    const expiryTime = new Date(reservation.expires_at).getTime();
    if (reservation.status === 'EXPIRED' || expiryTime <= now) {
      await db.updateReservation(reservationId, { status: 'EXPIRED' });
      throw new Error('Your reservation hold has expired. Please select a seat again.');
    }

    const unit = await db.getInventoryUnitById(reservation.unit_id);
    if (!unit) {
      throw new Error('Inventory unit does not exist.');
    }

    // ATOMIC CONFIRMATION VIA REDIS LUA ENGINE
    const confirmResult = await redisEngine.confirmHold(
      reservation.event_id,
      reservation.unit_id,
      userId,
      reservation.hold_token,
      reservation.generation
    );

    if (!confirmResult.success) {
      db.logAudit({
        id: `aud_conf_fail_${Date.now()}`,
        event_type: 'CONFIRM_REJECTED',
        entity_id: reservation.unit_id,
        user_id: userId,
        details: { reason: confirmResult.reason, status: confirmResult.status },
        created_at: new Date().toISOString()
      });

      if (confirmResult.status === 'HOLD_EXPIRED') {
        await db.updateReservation(reservationId, { status: 'EXPIRED' });
        throw new Error('Your hold expired before confirmation arrived.');
      } else if (confirmResult.status === 'STALE_GENERATION') {
        throw new Error('Stale generation token: unit state has changed since hold was placed.');
      } else {
        throw new Error(`Unable to confirm reservation: ${confirmResult.reason || 'Verification failure'}`);
      }
    }

    // Persist Confirmation to PostgreSQL Source of Truth
    const bookingReference = `PR-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const bookingId = `bk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const booking: BookingRecord = {
      id: bookingId,
      booking_reference: bookingReference,
      reservation_id: reservationId,
      event_id: reservation.event_id,
      unit_id: reservation.unit_id,
      user_id: userId,
      amount: unit.price,
      status: 'CONFIRMED',
      created_at: new Date().toISOString()
    };

    // One PostgreSQL transaction commits booking + reservation + inventory + outbox.
    // If persistence fails after Redis confirmation, retrying is safe: Redis confirmation is idempotent for this token.
    const committedBooking = await db.finalizeBooking(booking, reservationId, reservation.unit_id, confirmResult.generation || reservation.generation + 1, {
      bookingReference, reservationId, eventId: reservation.event_id, unitId: reservation.unit_id, userId, amount: unit.price
    });

    db.logAudit({
      id: `aud_booking_${Date.now()}`,
      event_type: 'BOOKING_CONFIRMED',
      entity_id: reservation.unit_id,
      user_id: userId,
      details: {
        bookingId: committedBooking.id,
        bookingReference: committedBooking.booking_reference,
        amount: committedBooking.amount
      },
      created_at: new Date().toISOString()
    });

    return { booking: committedBooking, serverTime: Date.now() };
  }

  /**
   * Release / Cancel an active hold
   */
  public static async cancelHold(req: ReservationCancelRequest): Promise<{
    success: boolean;
    serverTime: number;
  }> {
    const { reservationId, userId } = req;

    const reservation = await db.getReservationById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found.');
    }

    if (reservation.user_id !== userId) {
      throw new Error('Unauthorized to cancel this reservation.');
    }

    if (reservation.status === 'CONFIRMED') {
      throw new Error('Confirmed bookings cannot be cancelled via temporary hold release.');
    }

    // Release in Redis Lua Engine
    const releaseResult = await redisEngine.releaseHold(
      reservation.event_id,
      reservation.unit_id,
      reservation.hold_token,
      reservation.generation
    );

    if (!releaseResult.success) {
      throw new Error(`Unable to release hold: ${releaseResult.reason}`);
    }

    // Update DB
    await db.updateReservation(reservationId, {
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString()
    });

    await db.updateInventoryUnit(reservation.unit_id, {
      status: 'AVAILABLE',
      current_reservation_id: null,
      current_generation: releaseResult.generation || reservation.generation + 1
    });

    // Queue Outbox Event
    await db.queueOutboxEvent('RESERVATION', reservationId, 'HOLD_CANCELLED', {
      unitId: reservation.unit_id,
      userId,
      generation: releaseResult.generation
    });

    db.logAudit({
      id: `aud_cancel_${Date.now()}`,
      event_type: 'HOLD_CANCELLED',
      entity_id: reservation.unit_id,
      user_id: userId,
      details: { reservationId },
      created_at: new Date().toISOString()
    });

    return { success: true, serverTime: Date.now() };
  }
}

import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  total_units: number;
  base_price: number;
  hold_duration_seconds: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'PAUSED';
  created_at: string;
}

export interface InventoryUnitRecord {
  id: string;
  event_id: string;
  unit_code: string;
  tier: 'VIP' | 'PREMIUM' | 'STANDARD';
  row_label: string;
  seat_number: number;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'RELEASING';
  current_reservation_id: string | null;
  current_generation: number;
  version: number;
  updated_at: string;
}

export interface ReservationRecord {
  id: string;
  event_id: string;
  unit_id: string;
  user_id: string;
  hold_token: string;
  generation: number;
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  idempotency_key?: string | null;
  expires_at: string;
  created_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
}

export interface BookingRecord {
  id: string;
  booking_reference: string;
  reservation_id: string;
  event_id: string;
  unit_id: string;
  user_id: string;
  amount: number;
  status: 'CONFIRMED' | 'REFUNDED';
  created_at: string;
}

export interface OutboxEventRecord {
  id: string;
  aggregate_type: 'RESERVATION' | 'BOOKING' | 'INVENTORY';
  aggregate_id: string;
  event_type: 'HOLD_ACQUIRED' | 'BOOKING_CONFIRMED' | 'HOLD_EXPIRED' | 'HOLD_CANCELLED';
  payload: any;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  retry_count: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface AuditLogRecord {
  id: string;
  event_type: string;
  entity_id: string;
  user_id?: string | null;
  details: any;
  ip_address?: string | null;
  created_at: string;
}

// In-Memory Database Store implementing relational integrity & constraints
class DatabaseEngine {
  private users = new Map<string, UserRecord>();
  private events = new Map<string, EventRecord>();
  private inventoryUnits = new Map<string, InventoryUnitRecord>();
  private reservations = new Map<string, ReservationRecord>();
  private bookings = new Map<string, BookingRecord>();
  private outboxEvents = new Map<string, OutboxEventRecord>();
  private auditLogs: AuditLogRecord[] = [];

  private isInitialized = false;

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.seedInitialData();
  }

  private async seedInitialData() {
    // 1. Seed Admin User
    const adminPasswordHash = await bcrypt.hash('PulseAdmin2026!', 10);
    const adminUser: UserRecord = {
      id: 'usr_admin_001',
      name: 'System Administrator',
      email: 'admin@pulsereserve.io',
      password_hash: adminPasswordHash,
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(adminUser.id, adminUser);

    // Seed Standard Demo User
    const demoPasswordHash = await bcrypt.hash('DemoUser2026!', 10);
    const demoUser: UserRecord = {
      id: 'usr_demo_002',
      name: 'Alex Mercer',
      email: 'alex@example.com',
      password_hash: demoPasswordHash,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(demoUser.id, demoUser);

    // 2. Seed Default Event: "Quantum Cloud Summit 2026"
    const eventId = 'evt_summit_2026';
    const demoEvent: EventRecord = {
      id: eventId,
      title: 'Global Tech Summit 2026 Keynote',
      description: 'Annual high-throughput cloud computing, distributed systems, and real-time infrastructure keynote conference.',
      venue: 'Metropolis Convention Arena · Grand Hall A',
      starts_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      total_units: 200,
      base_price: 180.00,
      hold_duration_seconds: 300, // 5 minute reservation hold
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    this.events.set(demoEvent.id, demoEvent);

    // 3. Seed Exactly 200 Inventory Units: 10 rows (A-J), 20 seats each
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (const row of rows) {
      for (let s = 1; s <= 20; s++) {
        const unitId = `unit_${row}_${s.toString().padStart(2, '0')}`;
        const unitCode = `${row}-${s.toString().padStart(2, '0')}`;
        
        let tier: 'VIP' | 'PREMIUM' | 'STANDARD' = 'STANDARD';
        let price = 140.00;
        if (row === 'A' || row === 'B') {
          tier = 'VIP';
          price = 280.00;
        } else if (row === 'C' || row === 'D' || row === 'E') {
          tier = 'PREMIUM';
          price = 195.00;
        }

        const unitRecord: InventoryUnitRecord = {
          id: unitId,
          event_id: eventId,
          unit_code: unitCode,
          tier,
          row_label: row,
          seat_number: s,
          price,
          status: 'AVAILABLE',
          current_reservation_id: null,
          current_generation: 0,
          version: 1,
          updated_at: new Date().toISOString()
        };
        this.inventoryUnits.set(unitId, unitRecord);
      }
    }

    // Seed 4 initial confirmed sample bookings to demonstrate live visual diversity
    const sampleUnits = ['unit_A_01', 'unit_A_02', 'unit_C_10', 'unit_F_08'];
    for (const uId of sampleUnits) {
      const unit = this.inventoryUnits.get(uId);
      if (unit) {
        const resId = `res_init_${uId}`;
        const bookingId = `bk_init_${uId}`;
        const res: ReservationRecord = {
          id: resId,
          event_id: eventId,
          unit_id: uId,
          user_id: demoUser.id,
          hold_token: `token_init_${Math.random().toString(36).substring(2)}`,
          generation: 1,
          status: 'CONFIRMED',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          created_at: new Date(Date.now() - 3600000).toISOString(),
          confirmed_at: new Date(Date.now() - 3500000).toISOString()
        };
        this.reservations.set(resId, res);

        const booking: BookingRecord = {
          id: bookingId,
          booking_reference: `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          reservation_id: resId,
          event_id: eventId,
          unit_id: uId,
          user_id: demoUser.id,
          amount: unit.price,
          status: 'CONFIRMED',
          created_at: new Date(Date.now() - 3500000).toISOString()
        };
        this.bookings.set(bookingId, booking);

        unit.status = 'CONFIRMED';
        unit.current_reservation_id = resId;
        unit.current_generation = 1;
        unit.version += 1;
      }
    }

    this.logAudit({
      id: `aud_seed_${Date.now()}`,
      event_type: 'SYSTEM_SEEDED',
      entity_id: eventId,
      details: { total_units: 200, seeded_bookings: sampleUnits.length },
      created_at: new Date().toISOString()
    });
  }

  // --- Users Operations ---
  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public async createUser(userData: Omit<UserRecord, 'created_at' | 'updated_at'>): Promise<UserRecord> {
    const normalized = userData.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(normalized);
    if (existing) {
      throw new Error(`User with email "${normalized}" already exists.`);
    }

    const now = new Date().toISOString();
    const record: UserRecord = {
      ...userData,
      email: normalized,
      created_at: now,
      updated_at: now
    };
    this.users.set(record.id, record);
    return { ...record };
  }

  // --- Events Operations ---
  public async getAllEvents(): Promise<EventRecord[]> {
    return Array.from(this.events.values()).map(e => ({ ...e }));
  }

  public async getEventById(id: string): Promise<EventRecord | null> {
    const event = this.events.get(id);
    return event ? { ...event } : null;
  }

  // --- Inventory Units Operations ---
  public async getInventoryUnitsByEvent(eventId: string): Promise<InventoryUnitRecord[]> {
    const list: InventoryUnitRecord[] = [];
    for (const unit of this.inventoryUnits.values()) {
      if (unit.event_id === eventId) {
        list.push({ ...unit });
      }
    }
    // Sort logically by row and seat
    return list.sort((a, b) => {
      if (a.row_label === b.row_label) return a.seat_number - b.seat_number;
      return a.row_label.localeCompare(b.row_label);
    });
  }

  public async getInventoryUnitById(id: string): Promise<InventoryUnitRecord | null> {
    const unit = this.inventoryUnits.get(id);
    return unit ? { ...unit } : null;
  }

  public async updateInventoryUnit(
    id: string,
    updates: Partial<InventoryUnitRecord>
  ): Promise<InventoryUnitRecord> {
    const unit = this.inventoryUnits.get(id);
    if (!unit) {
      throw new Error(`Inventory unit "${id}" not found.`);
    }
    const updated: InventoryUnitRecord = {
      ...unit,
      ...updates,
      version: unit.version + 1,
      updated_at: new Date().toISOString()
    };
    this.inventoryUnits.set(id, updated);
    return { ...updated };
  }

  // --- Reservations Operations ---
  public async createReservation(res: ReservationRecord): Promise<ReservationRecord> {
    if (res.idempotency_key) {
      for (const existing of this.reservations.values()) {
        if (existing.idempotency_key === res.idempotency_key) {
          return { ...existing };
        }
      }
    }
    this.reservations.set(res.id, { ...res });
    return { ...res };
  }

  public async getReservationById(id: string): Promise<ReservationRecord | null> {
    const res = this.reservations.get(id);
    return res ? { ...res } : null;
  }

  public async updateReservation(
    id: string,
    updates: Partial<ReservationRecord>
  ): Promise<ReservationRecord> {
    const res = this.reservations.get(id);
    if (!res) {
      throw new Error(`Reservation "${id}" not found.`);
    }
    const updated: ReservationRecord = {
      ...res,
      ...updates
    };
    this.reservations.set(id, updated);
    return { ...updated };
  }

  public async getActiveHolds(): Promise<ReservationRecord[]> {
    const now = Date.now();
    const active: ReservationRecord[] = [];
    for (const res of this.reservations.values()) {
      if (res.status === 'HELD' && new Date(res.expires_at).getTime() > now) {
        active.push({ ...res });
      }
    }
    return active;
  }

  public async getExpiredUnreleasedHolds(): Promise<ReservationRecord[]> {
    const now = Date.now();
    const expired: ReservationRecord[] = [];
    for (const res of this.reservations.values()) {
      if (res.status === 'HELD' && new Date(res.expires_at).getTime() <= now) {
        expired.push({ ...res });
      }
    }
    return expired;
  }

  // --- Bookings Operations ---
  public async createBooking(booking: BookingRecord): Promise<BookingRecord> {
    // ENFORCE STRICT INVARIANT: UNIQUE(event_id, unit_id)
    for (const existing of this.bookings.values()) {
      if (existing.event_id === booking.event_id && existing.unit_id === booking.unit_id) {
        throw new Error(`Double booking conflict: Unit "${booking.unit_id}" already confirmed for event "${booking.event_id}".`);
      }
    }

    this.bookings.set(booking.id, { ...booking });
    return { ...booking };
  }

  public async getBookingsByUser(userId: string): Promise<BookingRecord[]> {
    const list: BookingRecord[] = [];
    for (const b of this.bookings.values()) {
      if (b.user_id === userId) {
        list.push({ ...b });
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getAllBookings(): Promise<BookingRecord[]> {
    return Array.from(this.bookings.values()).map(b => ({ ...b }));
  }

  public async getBookingById(id: string): Promise<BookingRecord | null> {
    const b = this.bookings.get(id);
    return b ? { ...b } : null;
  }

  public async getBookingByReservationId(resId: string): Promise<BookingRecord | null> {
    for (const b of this.bookings.values()) {
      if (b.reservation_id === resId) return { ...b };
    }
    return null;
  }

  // --- Transactional Outbox Operations ---
  public async queueOutboxEvent(
    aggregate_type: 'RESERVATION' | 'BOOKING' | 'INVENTORY',
    aggregate_id: string,
    event_type: 'HOLD_ACQUIRED' | 'BOOKING_CONFIRMED' | 'HOLD_EXPIRED' | 'HOLD_CANCELLED',
    payload: any
  ): Promise<OutboxEventRecord> {
    const record: OutboxEventRecord = {
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      aggregate_type,
      aggregate_id,
      event_type,
      payload,
      status: 'PENDING',
      retry_count: 0,
      last_error: null,
      created_at: new Date().toISOString(),
      processed_at: null
    };
    this.outboxEvents.set(record.id, record);
    return { ...record };
  }

  public async getPendingOutboxEvents(limit = 20): Promise<OutboxEventRecord[]> {
    const pending: OutboxEventRecord[] = [];
    for (const event of this.outboxEvents.values()) {
      if (event.status === 'PENDING' || (event.status === 'FAILED' && event.retry_count < 5)) {
        pending.push({ ...event });
        if (pending.length >= limit) break;
      }
    }
    return pending;
  }

  public async updateOutboxEvent(
    id: string,
    updates: Partial<OutboxEventRecord>
  ): Promise<OutboxEventRecord> {
    const event = this.outboxEvents.get(id);
    if (!event) throw new Error(`Outbox event "${id}" not found.`);
    const updated: OutboxEventRecord = { ...event, ...updates };
    this.outboxEvents.set(id, updated);
    return { ...updated };
  }

  public async getOutboxCount(): Promise<{ pending: number; processed: number; failed: number }> {
    let pending = 0;
    let processed = 0;
    let failed = 0;
    for (const ev of this.outboxEvents.values()) {
      if (ev.status === 'PENDING' || ev.status === 'PROCESSING') pending++;
      else if (ev.status === 'PROCESSED') processed++;
      else if (ev.status === 'FAILED') failed++;
    }
    return { pending, processed, failed };
  }

  // --- Audit Logs ---
  public logAudit(log: AuditLogRecord): void {
    this.auditLogs.unshift({ ...log });
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  public getRecentAuditLogs(limit = 50): AuditLogRecord[] {
    return this.auditLogs.slice(0, limit);
  }
}

export const db = new DatabaseEngine();

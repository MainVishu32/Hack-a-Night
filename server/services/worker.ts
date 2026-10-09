import { db } from '../db/database.js';
import { redisEngine } from '../redis/redisEngine.js';

export interface ReconciliationReport {
  timestamp: string;
  expiredHoldsChecked: number;
  expiredHoldsReleased: number;
  divergentUnitsDetected: number;
  divergentUnitsHealed: number;
  outboxPendingCount: number;
  outboxProcessedCount: number;
  outboxFailedCount: number;
  status: 'HEALTHY' | 'DEGRADED';
}

class BackgroundWorkerAndReconciler {
  private isRunning = false;
  private workerTimer: NodeJS.Timeout | null = null;
  private reconcilerTimer: NodeJS.Timeout | null = null;
  private lastReport: ReconciliationReport | null = null;
  private reconciliationHistory: ReconciliationReport[] = [];

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run outbox processor every 1.5 seconds
    this.workerTimer = setInterval(() => {
      this.processOutboxBatch().catch(err => {
        console.error('[Worker] Outbox processing error:', err.message);
      });
    }, 1500);
    if (this.workerTimer.unref) this.workerTimer.unref();

    // Run self-healing reconciler every 5 seconds
    this.reconcilerTimer = setInterval(() => {
      this.runReconciliation().catch(err => {
        console.error('[Reconciler] Self-healing error:', err.message);
      });
    }, 5000);
    if (this.reconcilerTimer.unref) this.reconcilerTimer.unref();

    // Initial immediate reconciliation
    const initTimer = setTimeout(() => this.runReconciliation(), 1000);
    if (initTimer.unref) initTimer.unref();
  }

  public stop() {
    this.isRunning = false;
    if (this.workerTimer) clearInterval(this.workerTimer);
    if (this.reconcilerTimer) clearInterval(this.reconcilerTimer);
  }

  /**
   * Durable Transactional Outbox Batch Processor
   */
  public async processOutboxBatch() {
    const pendingEvents = await db.getPendingOutboxEvents(10);
    if (pendingEvents.length === 0) return;

    for (const event of pendingEvents) {
      try {
        await db.updateOutboxEvent(event.id, { status: 'PROCESSING' });

        // Simulate reliable external notification / durable event stream dispatch
        // (e.g. Kafka / SNS / Webhook publish)
        await new Promise(r => setTimeout(r, 10));

        await db.updateOutboxEvent(event.id, {
          status: 'PROCESSED',
          processed_at: new Date().toISOString(),
          last_error: null
        });
      } catch (err: any) {
        const nextRetry = event.retry_count + 1;
        const newStatus = nextRetry >= 5 ? 'FAILED' : 'PENDING';
        await db.updateOutboxEvent(event.id, {
          status: newStatus,
          retry_count: nextRetry,
          last_error: err.message
        });
      }
    }
  }

  /**
   * Self-Healing Reconciliation Cycle
   */
  public async runReconciliation(): Promise<ReconciliationReport> {
    const expiredHolds = await db.getExpiredUnreleasedHolds();
    let expiredReleasedCount = 0;
    let divergentUnitsDetected = 0;
    let divergentUnitsHealed = 0;

    for (const hold of expiredHolds) {
      // Safely release in Redis Lua engine using expected generation
      const released = await redisEngine.reconcileReleaseExpired(
        hold.event_id,
        hold.unit_id,
        hold.generation
      );

      // Transition DB reservation status to EXPIRED
      await db.updateReservation(hold.id, { status: 'EXPIRED' });

      // Update unit status to AVAILABLE if still pointing to this reservation
      const unit = await db.getInventoryUnitById(hold.unit_id);
      if (unit && unit.status === 'HELD' && unit.current_reservation_id === hold.id) {
        await db.updateInventoryUnit(hold.unit_id, {
          status: 'AVAILABLE',
          current_reservation_id: null,
          current_generation: unit.current_generation + 1
        });
      }

      if (released) {
        expiredReleasedCount++;
        db.logAudit({
          id: `aud_recon_${Date.now()}_${hold.unit_id}`,
          event_type: 'RECONCILER_EXPIRED_HOLD_RELEASED',
          entity_id: hold.unit_id,
          details: { reservationId: hold.id, generation: hold.generation },
          created_at: new Date().toISOString()
        });
      }
    }

    // Check divergence between Redis cache and Postgres source of truth for event units
    const events = await db.getAllEvents();
    for (const event of events) {
      const units = await db.getInventoryUnitsByEvent(event.id);
      for (const unit of units) {
        const redisState = await redisEngine.getUnitState(event.id, unit.id);
        if (!redisState) continue;

        // If Postgres has CONFIRMED booking, Redis MUST NEVER be AVAILABLE
        if (unit.status === 'CONFIRMED' && redisState.status !== 'CONFIRMED') {
          divergentUnitsDetected++;
          // Heal Redis state: reassert CONFIRMED
          await redisEngine.confirmHold(
            event.id,
            unit.id,
            'reconciler_system',
            redisState.holdToken || 'recon_sync',
            redisState.generation
          );
          divergentUnitsHealed++;
        }
      }
    }

    const outboxCounts = await db.getOutboxCount();

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      expiredHoldsChecked: expiredHolds.length,
      expiredHoldsReleased: expiredReleasedCount,
      divergentUnitsDetected,
      divergentUnitsHealed,
      outboxPendingCount: outboxCounts.pending,
      outboxProcessedCount: outboxCounts.processed,
      outboxFailedCount: outboxCounts.failed,
      status: outboxCounts.failed > 10 ? 'DEGRADED' : 'HEALTHY'
    };

    this.lastReport = report;
    this.reconciliationHistory.unshift(report);
    if (this.reconciliationHistory.length > 20) {
      this.reconciliationHistory.pop();
    }

    return report;
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastReport: this.lastReport,
      history: this.reconciliationHistory.slice(0, 5)
    };
  }
}

export const worker = new BackgroundWorkerAndReconciler();

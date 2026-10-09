export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  total_units: number;
  base_price: number;
  hold_duration_seconds: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'PAUSED';
}

export interface InventoryUnit {
  id: string;
  unitCode: string;
  tier: 'VIP' | 'PREMIUM' | 'STANDARD';
  rowLabel: string;
  seatNumber: number;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'RELEASING';
  generation: number;
  expiresAt: string | null;
  isMine?: boolean;
}

export interface ReservationDetail {
  reservation: {
    id: string;
    event_id: string;
    unit_id: string;
    user_id: string;
    hold_token: string;
    generation: number;
    status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
    expires_at: string;
    created_at: string;
    confirmed_at?: string;
  };
  unit: {
    id: string;
    unit_code: string;
    tier: 'VIP' | 'PREMIUM' | 'STANDARD';
    row_label: string;
    seat_number: number;
    price: number;
    status: string;
  };
  event: EventItem;
  serverTime: number;
}

export interface Booking {
  id: string;
  booking_reference: string;
  reservation_id: string;
  event_id: string;
  unit_id: string;
  user_id: string;
  amount: number;
  status: 'CONFIRMED' | 'REFUNDED';
  created_at: string;
  unitCode?: string;
  tier?: 'VIP' | 'PREMIUM' | 'STANDARD';
  eventTitle?: string;
  venue?: string;
}

export interface AdminMetrics {
  inventory: {
    totalUnits: number;
    availableUnits: number;
    activeHolds: number;
    confirmedBookings: number;
    expiredHolds: number;
  };
  performance: {
    currentRps: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    totalRequests: number;
    errorRate: number;
    collisionRejections: number;
  };
  queueAndWorker: {
    workerBacklog: number;
    processedOutbox: number;
    failedOutbox: number;
    workerRunning: boolean;
  };
  scheduler: {
    mode: 'FIXED' | 'ADAPTIVE';
    windowMs: number;
    currentQueueDepth: number;
    totalBatchesProcessed: number;
    totalRequestsSequenced: number;
    avgBatchSize: number;
    avgQueueDelayMs: number;
    p95QueueDelayMs: number;
    admissionRateLimit: number;
  };
  redis: {
    connected: boolean;
    activeKeysCount: number;
    totalCommandsExecuted: number;
    luaScriptsExecuted: number;
    activeTimers: number;
  };
  connectivity: {
    database: string;
    redis: string;
    worker: string;
  };
  serverTime: number;
}

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

export interface AuditLog {
  id: string;
  event_type: string;
  entity_id: string;
  user_id?: string;
  details: any;
  ip_address?: string;
  created_at: string;
}

export interface MLForecast {
  modelType: string;
  status: string;
  currentRps: number;
  predictedNextRps: number;
  spikeRiskScore: number;
  isSpikePredicted: boolean;
  recommendedAdmissionRate: number;
  recommendedBatchWindowMs: number;
  confidenceInterval: {
    lowerRps: number;
    upperRps: number;
  };
  sampleSize: number;
  lastCalculatedAt: string;
}

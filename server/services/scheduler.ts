export interface QueuedRequest<T> {
  id: string;
  seqNumber: number;
  admittedAt: number;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export interface SchedulerMetrics {
  mode: 'FIXED' | 'ADAPTIVE';
  windowMs: number;
  currentQueueDepth: number;
  totalBatchesProcessed: number;
  totalRequestsSequenced: number;
  avgBatchSize: number;
  avgQueueDelayMs: number;
  p95QueueDelayMs: number;
  admissionRateLimit: number;
}

class AdaptiveMicroBatchScheduler {
  private mode: 'FIXED' | 'ADAPTIVE' = 'FIXED';
  private windowMs = 10; // Base fixed batch window in ms
  private admissionRateLimit = 500; // max admitted req/sec
  private sequenceCounter = 0;

  private queue: QueuedRequest<any>[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  // Telemetry metrics
  private totalBatches = 0;
  private totalRequests = 0;
  private recentDelays: number[] = [];

  constructor() {
    this.scheduleNextBatch();
  }

  public setConfig(config: { mode?: 'FIXED' | 'ADAPTIVE'; windowMs?: number; admissionRateLimit?: number }) {
    if (config.mode) this.mode = config.mode;
    if (config.windowMs) this.windowMs = Math.max(5, Math.min(100, config.windowMs));
    if (config.admissionRateLimit) this.admissionRateLimit = Math.max(10, config.admissionRateLimit);
  }

  /**
   * Enqueue and sequence an operation
   */
  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.sequenceCounter++;
      const req: QueuedRequest<T> = {
        id: `seq_${this.sequenceCounter}`,
        seqNumber: this.sequenceCounter,
        admittedAt: Date.now(),
        execute: task,
        resolve,
        reject
      };

      this.queue.push(req);
    });
  }

  private scheduleNextBatch() {
    let currentDelay = this.windowMs;

    if (this.mode === 'ADAPTIVE') {
      // In adaptive mode, dynamically scale window between 5ms and 50ms based on queue depth
      const depth = this.queue.length;
      if (depth > 50) {
        currentDelay = Math.max(5, Math.floor(this.windowMs * 0.5)); // Flush faster under high queue
      } else if (depth > 20) {
        currentDelay = Math.max(8, Math.floor(this.windowMs * 0.8));
      } else {
        currentDelay = this.windowMs;
      }
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
      this.scheduleNextBatch();
    }, currentDelay);
    if (this.batchTimer.unref) {
      this.batchTimer.unref();
    }
  }

  private async flushBatch() {
    if (this.queue.length === 0) return;

    // Drain current batch atomically
    const batch = this.queue.splice(0, this.queue.length);
    this.totalBatches++;
    this.totalRequests += batch.length;

    const now = Date.now();
    for (const req of batch) {
      const delay = now - req.admittedAt;
      this.recentDelays.push(delay);
    }
    if (this.recentDelays.length > 200) {
      this.recentDelays = this.recentDelays.slice(-200);
    }

    // Execute batch items sequentially or concurrently within the batch
    for (const item of batch) {
      try {
        const result = await item.execute();
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      }
    }
  }

  public getMetrics(): SchedulerMetrics {
    const avgDelay = this.recentDelays.length > 0
      ? this.recentDelays.reduce((a, b) => a + b, 0) / this.recentDelays.length
      : 0;

    let p95Delay = 0;
    if (this.recentDelays.length > 0) {
      const sorted = [...this.recentDelays].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * 0.95);
      p95Delay = sorted[idx] || sorted[sorted.length - 1];
    }

    return {
      mode: this.mode,
      windowMs: this.windowMs,
      currentQueueDepth: this.queue.length,
      totalBatchesProcessed: this.totalBatches,
      totalRequestsSequenced: this.totalRequests,
      avgBatchSize: this.totalBatches > 0 ? parseFloat((this.totalRequests / this.totalBatches).toFixed(1)) : 0,
      avgQueueDelayMs: parseFloat(avgDelay.toFixed(2)),
      p95QueueDelayMs: parseFloat(p95Delay.toFixed(2)),
      admissionRateLimit: this.admissionRateLimit
    };
  }
}

export const scheduler = new AdaptiveMicroBatchScheduler();

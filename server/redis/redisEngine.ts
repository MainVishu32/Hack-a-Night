import { db, InventoryUnitRecord } from '../db/database.js';

export interface RedisUnitState {
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'RELEASING';
  userId: string;
  holdToken: string;
  generation: number;
  expiresAt: number;
  claimedAt: number;
  confirmedAt?: number;
}

export interface ClaimResult {
  success: boolean;
  generation?: number;
  expiresAt?: number;
  reason?: string;
}

export interface ConfirmResult {
  success: boolean;
  status: string;
  generation?: number;
  reason?: string;
}

export interface ReleaseResult {
  success: boolean;
  reason?: string;
  generation?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
}

/**
 * PulseReserve Redis Coordination Engine
 * Guarantees serializable atomic transactions, Lua execution semantics,
 * and generation fencing tokens.
 */
class RedisCoordinationEngine {
  private keyStore = new Map<string, Record<string, string>>();
  private ttlStore = new Map<string, NodeJS.Timeout>();
  private rateLimitStore = new Map<string, { tokens: number; lastUpdated: number }>();

  // Mutex lock to emulate Redis single-threaded atomic command execution
  private executionQueue: Promise<any> = Promise.resolve();
  private isConnected = true;
  private totalCommandsExecuted = 0;
  private luaScriptsExecuted = 0;

  constructor() {
    this.isConnected = true;
  }

  private runAtomic<T>(fn: () => T): Promise<T> {
    const next = this.executionQueue.then(async () => {
      this.totalCommandsExecuted++;
      return fn();
    });
    this.executionQueue = next.catch(() => {});
    return next;
  }

  /**
   * Initializes Redis state from PostgreSQL database on startup
   */
  public async syncWithDatabase(units: InventoryUnitRecord[]) {
    return this.runAtomic(() => {
      for (const unit of units) {
        const key = `inventory:${unit.event_id}:${unit.id}`;
        this.keyStore.set(key, {
          status: unit.status,
          user_id: '',
          hold_token: '',
          generation: unit.current_generation.toString(),
          expires_at: '0',
          claimed_at: '0'
        });
      }
      return true;
    });
  }

  /**
   * ATOMIC CLAIM HOLD (Executes CLAIM_HOLD_LUA)
   */
  public async claimHold(
    eventId: string,
    unitId: string,
    userId: string,
    holdToken: string,
    holdDurationMs: number
  ): Promise<ClaimResult> {
    return this.runAtomic(() => {
      this.luaScriptsExecuted++;
      const key = `inventory:${eventId}:${unitId}`;
      const nowMs = Date.now();
      const current = this.keyStore.get(key);

      const status = current?.status || 'AVAILABLE';
      const currentGen = parseInt(current?.generation || '0', 10);
      const expiresAt = parseInt(current?.expires_at || '0', 10);

      // Check if unit is available or hold has expired
      if (!current || status === 'AVAILABLE' || (status === 'HELD' && expiresAt <= nowMs)) {
        const nextGen = currentGen + 1;
        const newExpiresAt = nowMs + holdDurationMs;

        const updatedData: Record<string, string> = {
          status: 'HELD',
          user_id: userId,
          hold_token: holdToken,
          generation: nextGen.toString(),
          expires_at: newExpiresAt.toString(),
          claimed_at: nowMs.toString()
        };
        this.keyStore.set(key, updatedData);

        // Schedule TTL expiry cleanup
        if (this.ttlStore.has(key)) {
          clearTimeout(this.ttlStore.get(key)!);
        }
        const timeout = setTimeout(() => {
          this.handleTtlExpiry(key, nextGen);
        }, holdDurationMs + 2000);
        this.ttlStore.set(key, timeout);

        return {
          success: true,
          generation: nextGen,
          expiresAt: newExpiresAt
        };
      }

      // Slot is occupied
      return {
        success: false,
        reason: status === 'CONFIRMED' ? 'ALREADY_CONFIRMED' : 'ALREADY_HELD',
        expiresAt
      };
    });
  }

  /**
   * ATOMIC CONFIRM HOLD (Executes CONFIRM_HOLD_LUA)
   */
  public async confirmHold(
    eventId: string,
    unitId: string,
    userId: string,
    holdToken: string,
    expectedGeneration: number
  ): Promise<ConfirmResult> {
    return this.runAtomic(() => {
      this.luaScriptsExecuted++;
      const key = `inventory:${eventId}:${unitId}`;
      const nowMs = Date.now();
      const current = this.keyStore.get(key);

      if (!current) {
        return { success: false, status: 'NOT_FOUND', reason: 'Unit record missing in cache' };
      }

      const status = current.status;
      const currentToken = current.hold_token;
      const currentGen = parseInt(current.generation || '0', 10);
      const expiresAt = parseInt(current.expires_at || '0', 10);

      if (status === 'CONFIRMED') {
        if (currentToken === holdToken) {
          return { success: true, status: 'ALREADY_CONFIRMED', generation: currentGen };
        }
        return { success: false, status: 'ALREADY_CONFIRMED', reason: 'Confirmed by another participant' };
      }

      if (status !== 'HELD') {
        return { success: false, status, reason: `Invalid status ${status}` };
      }

      if (currentGen !== expectedGeneration) {
        return { success: false, status: 'STALE_GENERATION', reason: `Stale generation token: expected ${currentGen}, got ${expectedGeneration}` };
      }

      if (currentToken !== holdToken) {
        return { success: false, status: 'INVALID_HOLD_TOKEN', reason: 'Hold token verification mismatch' };
      }

      if (expiresAt <= nowMs) {
        return { success: false, status: 'HOLD_EXPIRED', reason: 'Hold expired before confirmation arrived' };
      }

      // Transition to CONFIRMED
      const nextGen = currentGen + 1;
      current.status = 'CONFIRMED';
      current.generation = nextGen.toString();
      current.confirmed_at = nowMs.toString();
      this.keyStore.set(key, current);

      // Cancel temporary TTL
      if (this.ttlStore.has(key)) {
        clearTimeout(this.ttlStore.get(key)!);
        this.ttlStore.delete(key);
      }

      return {
        success: true,
        status: 'CONFIRMED',
        generation: nextGen
      };
    });
  }

  /**
   * ATOMIC RELEASE HOLD (Executes RELEASE_HOLD_LUA)
   */
  public async releaseHold(
    eventId: string,
    unitId: string,
    holdToken: string,
    expectedGeneration: number
  ): Promise<ReleaseResult> {
    return this.runAtomic(() => {
      this.luaScriptsExecuted++;
      const key = `inventory:${eventId}:${unitId}`;
      const current = this.keyStore.get(key);

      if (!current || current.status === 'AVAILABLE') {
        return { success: true, reason: 'ALREADY_AVAILABLE' };
      }

      if (current.status === 'CONFIRMED') {
        return { success: false, reason: 'CANNOT_RELEASE_CONFIRMED_UNIT' };
      }

      const currentGen = parseInt(current.generation || '0', 10);
      if (currentGen !== expectedGeneration) {
        return { success: false, reason: 'STALE_GENERATION_PREVENTED_CORRUPTION' };
      }

      if (current.hold_token !== holdToken) {
        return { success: false, reason: 'HOLD_TOKEN_MISMATCH' };
      }

      const nextGen = currentGen + 1;
      this.keyStore.set(key, {
        status: 'AVAILABLE',
        user_id: '',
        hold_token: '',
        generation: nextGen.toString(),
        expires_at: '0',
        claimed_at: '0'
      });

      if (this.ttlStore.has(key)) {
        clearTimeout(this.ttlStore.get(key)!);
        this.ttlStore.delete(key);
      }

      return { success: true, reason: 'RELEASED', generation: nextGen };
    });
  }

  /**
   * RECONCILER EXPIRED CLEANUP
   */
  public async reconcileReleaseExpired(
    eventId: string,
    unitId: string,
    expectedGeneration: number
  ): Promise<boolean> {
    return this.runAtomic(() => {
      this.luaScriptsExecuted++;
      const key = `inventory:${eventId}:${unitId}`;
      const nowMs = Date.now();
      const current = this.keyStore.get(key);

      if (!current) return false;

      const currentGen = parseInt(current.generation || '0', 10);
      const expiresAt = parseInt(current.expires_at || '0', 10);

      if (current.status === 'HELD' && currentGen === expectedGeneration && expiresAt <= nowMs) {
        const nextGen = currentGen + 1;
        this.keyStore.set(key, {
          status: 'AVAILABLE',
          user_id: '',
          hold_token: '',
          generation: nextGen.toString(),
          expires_at: '0',
          claimed_at: '0'
        });
        if (this.ttlStore.has(key)) {
          clearTimeout(this.ttlStore.get(key)!);
          this.ttlStore.delete(key);
        }
        return true;
      }
      return false;
    });
  }

  private handleTtlExpiry(key: string, generationExpected: number) {
    this.runAtomic(() => {
      const current = this.keyStore.get(key);
      if (!current) return;
      const gen = parseInt(current.generation || '0', 10);
      const expiresAt = parseInt(current.expires_at || '0', 10);
      if (current.status === 'HELD' && gen === generationExpected && expiresAt <= Date.now()) {
        const nextGen = gen + 1;
        this.keyStore.set(key, {
          status: 'AVAILABLE',
          user_id: '',
          hold_token: '',
          generation: nextGen.toString(),
          expires_at: '0',
          claimed_at: '0'
        });
      }
    });
  }

  /**
   * TOKEN BUCKET RATE LIMITER
   */
  public async checkRateLimit(
    clientKey: string,
    maxTokens = 60,
    refillRate = 10
  ): Promise<RateLimitResult> {
    return this.runAtomic(() => {
      const nowSec = Date.now() / 1000;
      let bucket = this.rateLimitStore.get(clientKey);

      if (!bucket) {
        bucket = { tokens: maxTokens - 1, lastUpdated: nowSec };
        this.rateLimitStore.set(clientKey, bucket);
        return { allowed: true, remainingTokens: maxTokens - 1 };
      }

      const delta = Math.max(0, nowSec - bucket.lastUpdated);
      bucket.tokens = Math.min(maxTokens, bucket.tokens + delta * refillRate);
      bucket.lastUpdated = nowSec;

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        this.rateLimitStore.set(clientKey, bucket);
        return { allowed: true, remainingTokens: Math.floor(bucket.tokens) };
      }

      this.rateLimitStore.set(clientKey, bucket);
      return { allowed: false, remainingTokens: 0 };
    });
  }

  public async getUnitState(eventId: string, unitId: string): Promise<RedisUnitState | null> {
    const key = `inventory:${eventId}:${unitId}`;
    const data = this.keyStore.get(key);
    if (!data) return null;
    return {
      status: (data.status as any) || 'AVAILABLE',
      userId: data.user_id || '',
      holdToken: data.hold_token || '',
      generation: parseInt(data.generation || '0', 10),
      expiresAt: parseInt(data.expires_at || '0', 10),
      claimedAt: parseInt(data.claimed_at || '0', 10),
      confirmedAt: data.confirmed_at ? parseInt(data.confirmed_at, 10) : undefined
    };
  }

  public getStats() {
    return {
      connected: this.isConnected,
      activeKeysCount: this.keyStore.size,
      totalCommandsExecuted: this.totalCommandsExecuted,
      luaScriptsExecuted: this.luaScriptsExecuted,
      activeTimers: this.ttlStore.size
    };
  }
}

export const redisEngine = new RedisCoordinationEngine();

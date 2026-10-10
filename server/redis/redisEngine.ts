import { createClient } from 'redis';
import type { InventoryUnitRecord } from '../db/database.js';
import { CLAIM_HOLD_LUA, CONFIRM_HOLD_LUA, RELEASE_HOLD_LUA, RECONCILE_RELEASE_EXPIRED_LUA, TOKEN_BUCKET_RATE_LIMIT_LUA } from './luaScripts.js';

export interface RedisUnitState { status: 'AVAILABLE'|'HELD'|'CONFIRMED'|'RELEASING'; userId:string; holdToken:string; generation:number; expiresAt:number; claimedAt:number; confirmedAt?:number; }
export interface ClaimResult { success:boolean; generation?:number; expiresAt?:number; reason?:string; }
export interface ConfirmResult { success:boolean; status:string; generation?:number; reason?:string; }
export interface ReleaseResult { success:boolean; reason?:string; generation?:number; }
export interface RateLimitResult { allowed:boolean; remainingTokens:number; }

/** Real Redis-backed inventory coordinator. No in-memory fallback is used: a missing Redis connection is a startup error. */
class RedisCoordinationEngine {
  
private client: ReturnType<typeof createClient> | null = null;

  private connected = false;
  private commands = 0;
  private scripts = 0;
  private knownKeys = new Set<string>();
  async connect() {
    if (this.connected) return;
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const client = createClient({ url, socket: { reconnectStrategy: retries => Math.min(retries * 250, 3000) } });
    client.on('error', err => console.error('[PulseReserve] Redis error:', err.message));
    await client.connect();
    await client.ping();
    this.client = client;
    this.connected = true;
    console.log(`[PulseReserve] Connected to Redis at ${url.replace(/:\/\/.*@/, '://[credentials]@')}`);
  }
  async close() { if (this.client?.isOpen) await this.client.quit(); this.connected = false; this.client = null; }
  
private get redis(): NonNullable<typeof this.client> { if (!this.client || !this.connected) throw new Error('Redis is not connected. Start Redis and configure REDIS_URL.'); return this.client; }
  private key(eventId:string, unitId:string) { return `inventory:${eventId}:${unitId}`; }
  async syncWithDatabase(units: InventoryUnitRecord[]) {
    const r = this.redis;
    for (const u of units) {
      const key = this.key(u.event_id,u.id); this.knownKeys.add(key);
      // Preserve active Redis coordination state on app restarts; seed only absent keys.
      const exists = await r.exists(key);
      if (!exists) await r.hSet(key, { status:u.status, user_id:'', hold_token:'', generation:String(u.current_generation), expires_at:'0', claimed_at:'0' });
    }
    return true;
  }
  async claimHold(eventId:string, unitId:string, userId:string, holdToken:string, holdDurationMs:number):Promise<ClaimResult> {
    this.commands++; this.scripts++; this.knownKeys.add(this.key(eventId,unitId));
    const out = await this.redis.eval(CLAIM_HOLD_LUA,{keys:[this.key(eventId,unitId)],arguments:[userId,holdToken,String(holdDurationMs),String(Date.now())]}) as (string|number)[];
    if (Number(out[0]) === 1) return {success:true,generation:Number(out[1]),expiresAt:Number(out[2])};
    const state=String(out[1] ?? 'UNAVAILABLE');
    return {success:false,reason:state==='CONFIRMED'?'ALREADY_CONFIRMED':state==='HELD'?'ALREADY_HELD':state==='NOT_FOUND'?'INVENTORY_NOT_INITIALIZED':state};
  }
  async confirmHold(eventId:string, unitId:string, userId:string, holdToken:string, expectedGeneration:number):Promise<ConfirmResult> {
    this.commands++; this.scripts++;
    const out = await this.redis.eval(CONFIRM_HOLD_LUA,{keys:[this.key(eventId,unitId)],arguments:[userId,holdToken,String(expectedGeneration),String(Date.now())]}) as (string|number)[];
    const ok=Number(out[0])===1, status=String(out[1]??'UNKNOWN');
    return {success:ok,status,generation:out[2]===undefined?undefined:Number(out[2]),reason:ok?undefined:status};
  }
  async releaseHold(eventId:string,unitId:string,holdToken:string,expectedGeneration:number):Promise<ReleaseResult> {
    this.commands++; this.scripts++;
    const out = await this.redis.eval(RELEASE_HOLD_LUA,{keys:[this.key(eventId,unitId)],arguments:[holdToken,String(expectedGeneration)]}) as (string|number)[];
    return {success:Number(out[0])===1,reason:String(out[1]??'UNKNOWN'),generation:out[2]===undefined?undefined:Number(out[2])};
  }
  async reconcileReleaseExpired(eventId:string,unitId:string,expectedGeneration:number):Promise<boolean> {
    this.commands++; this.scripts++;
    const out=await this.redis.eval(RECONCILE_RELEASE_EXPIRED_LUA,{keys:[this.key(eventId,unitId)],arguments:[String(expectedGeneration),String(Date.now())]}) as (string|number)[];
    return Number(out[0])===1;
  }
  async checkRateLimit(clientKey:string,maxTokens=60,refillRate=10):Promise<RateLimitResult> {
    this.commands++; this.scripts++;
    const out=await this.redis.eval(TOKEN_BUCKET_RATE_LIMIT_LUA,{keys:[`ratelimit:${clientKey}`],arguments:[String(maxTokens),String(refillRate),String(Date.now()/1000)]}) as (string|number)[];
    return {allowed:Number(out[0])===1,remainingTokens:Math.floor(Number(out[1]??0))};
  }
  async getUnitState(eventId:string,unitId:string):Promise<RedisUnitState|null> {
    const key=this.key(eventId,unitId); this.knownKeys.add(key); const d=await this.redis.hGetAll(key); if (!Object.keys(d).length) return null;
    return {status:(d.status||'AVAILABLE') as RedisUnitState['status'],userId:d.user_id||'',holdToken:d.hold_token||'',generation:Number(d.generation||0),expiresAt:Number(d.expires_at||0),claimedAt:Number(d.claimed_at||0),confirmedAt:d.confirmed_at?Number(d.confirmed_at):undefined};
  }
  getStats(){return {connected:this.connected,activeKeysCount:this.knownKeys.size,totalCommandsExecuted:this.commands,luaScriptsExecuted:this.scripts,activeTimers:0};}
}
export const redisEngine = new RedisCoordinationEngine();

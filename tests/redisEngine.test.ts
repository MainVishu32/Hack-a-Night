import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { db, type InventoryUnitRecord } from '../server/db/database.js';
import { redisEngine } from '../server/redis/redisEngine.js';

const eventId = `evt_test_${process.pid}_${Date.now()}`;
const seats = ['test_A_01','test_A_02','test_A_03'];
async function prepare() {
  await db.init();
  await redisEngine.connect();
  const fakeUnits: InventoryUnitRecord[] = seats.map((id,i)=>({id,event_id:eventId,unit_code:id,tier:'STANDARD',row_label:'T',seat_number:i+1,price:1,status:'AVAILABLE',current_reservation_id:null,current_generation:0,version:1,updated_at:new Date().toISOString()}));
  await redisEngine.syncWithDatabase(fakeUnits);
}

test('unknown inventory keys fail closed', async () => {
  await prepare();
  const result = await redisEngine.claimHold(eventId, 'unit_NOT_REAL', 'test-user', 'missing-key-token', 1000);
  assert.equal(result.success, false);
  assert.equal(result.reason, 'INVENTORY_NOT_INITIALIZED');
});

test('100 simultaneous claims for one seat have exactly one winner', async () => {
  await prepare();
  const seat = seats[0];
  const attempts = await Promise.all(Array.from({ length: 100 }, (_, i) => redisEngine.claimHold(eventId, seat, `claim-user-${i}`, `claim-token-${i}`, 10_000)));
  assert.equal(attempts.filter((r) => r.success).length, 1);
  assert.equal(attempts.filter((r) => !r.success).length, 99);
  assert.equal((await redisEngine.getUnitState(eventId, seat))?.status, 'HELD');
  const winner = attempts.find((r) => r.success)!;
  await redisEngine.releaseHold(eventId, seat, `claim-token-${attempts.findIndex(r=>r.success)}`, winner.generation!);
  // Find the actual token from Redis state because winner order is independent of request index.
  const state=await redisEngine.getUnitState(eventId,seat);
  if(state?.status==='HELD') await redisEngine.releaseHold(eventId,seat,state.holdToken,state.generation);
});

test('expired hold can be reclaimed with a higher generation', async () => {
  await prepare();
  const seat = seats[1];
  const first = await redisEngine.claimHold(eventId, seat, 'expiry-user-1', 'expiry-token-1', 20);
  assert.equal(first.success, true);
  await new Promise((resolve) => setTimeout(resolve, 40));
  const second = await redisEngine.claimHold(eventId, seat, 'expiry-user-2', 'expiry-token-2', 10_000);
  assert.equal(second.success, true);
  assert.ok((second.generation ?? 0) > (first.generation ?? 0));
  const state = await redisEngine.getUnitState(eventId, seat);
  assert.equal(state?.holdToken, 'expiry-token-2');
  assert.equal(state?.status, 'HELD');
  await redisEngine.releaseHold(eventId, seat, 'expiry-token-2', second.generation!);
});

test('confirmed seat cannot be released', async () => {
  await prepare();
  const seat = seats[2];
  const claim = await redisEngine.claimHold(eventId, seat, 'confirm-user', 'confirm-token', 10_000);
  assert.equal(claim.success, true);
  const confirmed = await redisEngine.confirmHold(eventId, seat, 'confirm-user', 'confirm-token', claim.generation!);
  assert.equal(confirmed.success, true);
  const release = await redisEngine.releaseHold(eventId, seat, 'confirm-token', confirmed.generation!);
  assert.equal(release.success, false);
  assert.equal((await redisEngine.getUnitState(eventId, seat))?.status, 'CONFIRMED');
});

after(async () => {
  await redisEngine.close();
  await db.close();
});
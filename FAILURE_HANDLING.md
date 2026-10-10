# Failure handling and consistency model

## Redis / PostgreSQL are real services
- `server/redis/redisEngine.ts` uses `redis` client `EVAL` calls to execute the Lua scripts. No in-memory coordination fallback is used.
- `server/db/database.ts` uses a PostgreSQL pool and applies `server/db/schema.sql` on startup. A startup connection failure is fatal instead of silently switching to memory.

## Hold acquisition
1. Lua atomically claims a seat with token, generation and logical expiry.
2. PostgreSQL persists reservation, inventory projection and outbox event.
3. If any persistence step fails, compensation attempts to release only the matching token+generation. If compensation cannot run, the reconciler must repair the divergent state; this failure should be visible in logs.

## Confirmation
1. Redis atomically validates holder, token, generation and expiry.
2. PostgreSQL transaction writes booking + reservation confirmation + inventory projection + outbox together; database unique constraints prevent duplicate booking for `(event_id, unit_id)` and duplicate booking per reservation.
3. If PostgreSQL is unavailable after Redis confirms, the request returns an error. Retry after PostgreSQL recovers is safe for the same hold token and completes the durable transaction. The Redis confirmed state intentionally cannot be released by a stale compensation.
4. Same-process concurrent confirmation requests are serialized. Across multiple app instances, PostgreSQL unique constraints and transaction checks remain the final duplicate-booking guard.

## Hold expiry
- Expiration is evaluated inside Lua using `expires_at`; the persistent inventory hash is not allowed to vanish and erase its generation counter. The background reconciler releases only matching expired generations and updates PostgreSQL.

## Required verification
This is an implementation, not a claim of measured 5,000-VU success. Start real services, run typecheck/build/integration tests, run k6, and execute `loadtests/audit_bookings.sql`. Inspect both query results and logs for reconciliation errors.

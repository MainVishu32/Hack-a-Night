# PulseReserve final implementation checklist

## Implemented in this source tree
- Redis coordination uses the real `redis` Node client and executes claim, confirm, release, expiry reconciliation, and token-bucket Lua scripts with `EVAL`.
- PostgreSQL is required at startup; the schema is applied and records are loaded from PostgreSQL. Users, events, inventory, reservations, bookings, outbox events, and audit events are persisted.
- Missing Redis inventory fails closed. Inventory hashes are persistent so generation fencing survives hold expiry; expiry is checked atomically from `expires_at` and cleaned by the reconciler.
- Hold persistence failures attempt token+generation-fenced compensation. Confirmation writes booking, reservation, inventory projection, and outbox in one PostgreSQL transaction. A retry after Redis confirmation can finish persistence because the Redis confirmation is idempotent for the same token.
- k6 load scenario ramps to 5,000 VUs and distributes claims across all 200 seeded seats. `loadtests/audit_bookings.sql` provides a separate post-run database invariant audit.
- `Dockerfile` and `docker-compose.yml` provide an app + PostgreSQL + Redis setup. Frontend source/CSS/assets are preserved from the uploaded baseline.

## Must be run in the target environment before claiming verified performance
1. `docker compose up --build`
2. `npm run typecheck` and `npm run build`
3. Run integration tests with live PostgreSQL and Redis configured.
4. Run k6 against the running app: `k6 run loadtests/k6_reservation_concurrency.js`
5. Run `psql "$DATABASE_URL" -f loadtests/audit_bookings.sql`; both audit results must show no violations.

The 5,000-VU test has not been executed in this packaging environment. Therefore no measured throughput, latency, or zero-double-booking result is claimed here.

# Engine validation and architecture status

The current project supplied in `Hack-a-Night-main.zip` is preserved as the UI baseline. The changes in this package are intentionally limited to backend correctness, tests, configuration, and documentation.

## Implemented source fixes
- Unknown coordination keys reject instead of silently becoming AVAILABLE.
- TTL callback checks its generation before releasing state and avoids deleting a newer timer reference.
- Startup synchronizes every event's inventory.
- Idempotency replay requires the same user, event, and seat; conflicting reuse is rejected.
- Booking reference randomness is cryptographic.
- k6 targets all 200 seed inventory units and no longer includes a never-incremented double-booking metric.

## Architecture limitation
`redisEngine.ts` currently stores inventory in JavaScript `Map` instances and serializes operations with a promise queue. It does not connect to Redis or execute the Lua examples. `database.ts` stores users, events, inventory, reservations, bookings, and outbox events in memory. PostgreSQL schema and Docker Compose values are not proof that the application connects to PostgreSQL. Data resets on server restart and separate processes do not share inventory.

Therefore this build is not yet a real distributed multi-process reservation engine. Real Redis and PostgreSQL adapters plus integration/recovery tests remain necessary for the original high-contention objective.

## Local checks
```powershell
npm install
npm run test:engine
npm run typecheck
npm run build
npm run dev
```
Use Node.js 20+ and npm 10+. To load test, start the app first and run `k6 run loadtests/k6_reservation_concurrency.js` in another terminal. The k6 script is a load scenario, not a correctness proof by itself.


## Real service integration update
The current source now requires live PostgreSQL and Redis, applies the SQL schema at startup, and executes the Lua scripts through the Redis client. Run the checks in FINAL_CHECKLIST.md on a machine with Docker and k6. The 5,000-VU test has not been run in this environment.

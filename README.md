# PulseReserve — consolidated demo project

PulseReserve is a high-contention reservation demo with separate attendee and administrator experiences.

## What's included

- Brand-first booking homepage with event-style cards and seat preview.
- Attendee flow: account creation/sign-in, active event listing, seat selection, temporary hold, demo checkout, and personal booking history.
- Admin flow: separate operations console, inventory/booking reports, simulation controls, audit and reconciliation views.
- Server-side role checks for admin routes and authenticated booking endpoints.
- Demo event and inventory data, plus a k6 concurrency test scenario.
- Express SPA fallback compatible with the installed modern router syntax.

## Important demo-data note

The backend currently seeds one event with real seat inventory: **Global Tech Summit 2026 Keynote**. The other cards on the landing page are visual sample listings and route to the active event list; they do not have their own inventory. Do not claim those sample cards are independently bookable until event-specific inventory is added.

The current database and Redis coordination adapters are in-memory demo implementations. The repository includes PostgreSQL schema and Redis Lua examples, but these are not proof of a live PostgreSQL database or Redis service. Demo data resets when the server restarts. Do not describe the project as durable production infrastructure until persistent adapters are implemented and verified.

## Engine validation

See `FINAL_CHECKLIST.md` and `ENGINE_VALIDATION.md` for included fixes and known gaps. The current Redis/database adapters remain in-memory demo implementations; do not describe them as live Redis/PostgreSQL.

Run `npm run test:engine`, `npm run typecheck`, and `npm run build` before considering this package verified.

## Requirements

- Node.js 20+ (Node 22 LTS recommended)
- npm 10+

## Run on Windows

1. Extract the ZIP into a writable folder.
2. Open PowerShell in the folder containing `package.json`.
3. Run:

   ```powershell
   npm install
   npm run dev
   ```

4. Open the Vite URL printed in the terminal (usually `http://127.0.0.1:5173`). The API server listens on port `3000`.
5. Keep the terminal open. Press `Ctrl+C` to stop both processes.

Build the frontend with `npm run build`. Run `npm start` only after building if you want the server to serve the `dist` bundle.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Attendee | `alex@example.com` | `DemoUser2026!` |
| Admin | `admin@pulsereserve.io` | `PulseAdmin2026!` |

These are local demo credentials only. Remove or rotate them before any public deployment. Do not use real passwords.

## Recommended acceptance tests

1. Sign in as attendee; verify Browse Shows and My Bookings appear, and admin metrics do not.
2. Sign out; sign in as admin; verify the operations console and reports appear, and attendee checkout is blocked.
3. Place a hold, confirm a demo booking, and verify the booking appears in that attendee's history.
4. Attempt two holds for the same unit and confirm only one can own the active hold.
5. Verify the admin dashboard reflects the same inventory state.
6. Restart the server and observe the documented in-memory reset behavior.
7. Test admin API authorization directly; hiding admin navigation alone is not sufficient.

## Layout

- `src/pages/` — homepage, attendee screens, admin observability
- `src/context/AuthContext.tsx` — authentication state
- `src/services/api.ts` — frontend API client
- `server/api/router.ts` — API routes and authorization
- `server/services/` — reservation, scheduler, worker, and forecasting logic
- `server/db/schema.sql` — PostgreSQL schema reference
- `server/redis/luaScripts.ts` — Redis Lua examples
- `loadtests/` — k6 contention scenario


### Failure-handling and validation status
See [FAILURE_HANDLING.md](./FAILURE_HANDLING.md) for the implemented compensations and the remaining real Redis/PostgreSQL integration requirements.

## Real Redis + PostgreSQL setup

This revision uses live Redis and PostgreSQL; the backend intentionally fails startup if either service is unavailable. Configure `DATABASE_URL` and `REDIS_URL` (see `.env.example`). The included `docker-compose.yml` starts both services and the app. Run `docker compose up --build` from the project root. Demo accounts are for local demonstration only; change credentials/secrets before any public deployment.

## High-contention validation

Run `k6 run loadtests/k6_reservation_concurrency.js` against the running service (override `API_URL` if needed). Then run `psql "$DATABASE_URL" -f loadtests/audit_bookings.sql`. The SQL audit must return no duplicate-booking rows and a mismatch count of zero. This environment did not have Redis/PostgreSQL/k6 available, so the live integration and 5,000-VU run are not represented as passed.

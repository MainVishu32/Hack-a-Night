# Spotly

### Find it. Lock it. Love it.

**Spotly is a smart reservation and booking platform designed to make high-demand bookings seamless, reliable, and conflict-free.** It combines an intuitive booking experience with temporary seat holds, concurrency control, role-based access, and real-time reservation monitoring to help manage limited inventory under high demand.

Built with a focus on user experience and reliable reservation management, Spotly aims to make booking easier for customers while giving administrators the tools to monitor and manage reservation activity.

---

## ✨ Key Features

- **Intuitive Booking Experience** — Browse event listings and explore available seats through a user-friendly interface.
- **User Authentication** — Separate attendee and administrator experiences.
- **Smart Seat Selection** — Select seats and place temporary holds before confirming a reservation.
- **Demo Checkout & Booking History** — Complete demo bookings and view personal reservation history.
- **Admin Dashboard** — Monitor inventory, bookings, reports, and system activity.
- **Concurrency Control** — Coordinate competing booking requests to prevent conflicting seat reservations.
- **Audit & Reconciliation** — Inspect reservation activity and check inventory consistency.
- **Simulation & Forecasting** — Explore reservation patterns using administrative simulation controls.
- **Concurrent Load Testing** — Includes k6 scenarios for testing booking behavior under concurrent requests.
- **Role-Based Authorization** — Restrict administrative functionality and protect authenticated booking endpoints.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Building the user interface |
| TypeScript | Type-safe application development |
| Vite | Frontend development and production builds |
| Node.js | Backend runtime |
| Express | Backend API and request handling |
| In-memory adapters | Demo data storage and reservation coordination |
| PostgreSQL | Reference database schema |
| Redis Lua | Reference reservation coordination scripts |
| k6 | Concurrent load testing |

---

## 🚀 Getting Started

Follow these steps to run Spotly locally.

### Prerequisites

Make sure you have the following installed:

- **Node.js:** Version 20 or later (Node.js 22 LTS recommended)
- **npm:** Version 10 or later
- **Git:** To clone the repository

### 1. Clone the Repository

Replace the placeholder with your actual GitHub repository URL.

```bash
git clone <your-repository-url>
cd <your-project-folder>
```

Alternatively, download the repository as a ZIP file and extract it.

### 2. Install Dependencies

Open a terminal in the project root directory containing `package.json` and run:

```bash
npm install
```

### 3. Start the Development Servers

Run:

```bash
npm run dev
```

If the project is configured to start both the frontend and backend, the development servers will start according to the project's scripts.

- **Frontend:** Usually available at `http://127.0.0.1:5173`
- **Backend API:** Runs on port `3000`

Check the terminal output for the actual URLs and any startup errors.

### 4. Open Spotly

Open the frontend URL displayed in your terminal to explore the application.

Keep the development processes running while using Spotly. Press `Ctrl+C` in the relevant terminal to stop them.

### 5. Create a Production Build

Build the frontend:

```bash
npm run build
```

Start the backend using the production command, if configured:

```bash
npm start
```

**Note:** The production build and server startup depend on the scripts configured in `package.json`. A successful frontend build alone does not mean the backend is production-ready.

---

## 🔑 Demo Accounts

Use the following demo credentials to explore the different user experiences.

| Role | Email | Password |
|---|---|---|
| Attendee | `alex@example.com` | `DemoUser2026!` |
| Administrator | `admin@pulsereserve.io` | `PulseAdmin2026!` |

**Security note:** These credentials are intended for local demonstration purposes only. Do not reuse them in production or expose real credentials, API keys, or secrets in your repository.

---

## 🧪 Key Scenarios to Test

Explore Spotly's functionality with these scenarios:

1. **Attendee Experience** — Sign in and explore events, seat availability, and personal bookings.
2. **Administrator Experience** — Sign in as an administrator and inspect the operations dashboard, reports, and reservation activity.
3. **Temporary Seat Holds** — Select a seat and verify that a temporary hold is created before booking confirmation.
4. **Concurrent Booking Requests** — Simulate multiple requests for the same seat and verify that conflicting active holds are prevented.
5. **Reservation Monitoring** — Check whether reservation changes are reflected in the administrative interface.
6. **Authorization Checks** — Verify that protected API endpoints reject unauthorized requests independently of frontend navigation.
7. **Data Reset Behavior** — Restart the backend and observe how in-memory reservation data is reset.

For concurrency testing, use the provided k6 scenarios in the `loadtests/` directory, where supported by the current implementation.

---

## 📁 Project Structure

The following is a high-level overview of the project's main directories and files.

```text
Spotly/
├── src/
│   ├── pages/                  # Homepage, attendee and admin screens
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication state
│   └── services/
│       └── api.ts              # Frontend API client
│
├── server/
│   ├── api/
│   │   └── router.ts            # API routes and authorization
│   ├── services/                # Reservation, scheduler, worker
│   │                             # and forecasting logic
│   ├── db/
│   │   └── schema.sql           # PostgreSQL schema reference
│   └── redis/
│       └── luaScripts.ts        # Redis Lua examples
│
├── loadtests/                   # k6 concurrency scenarios
├── package.json                 # Project scripts and dependencies
└── README.md                    # Project documentation
```

*Note: This structure is representative of the documented project layout. Actual files may vary as development continues.*

---

## ⚠️ Current Implementation & Limitations

Spotly is currently a demonstration project. The following limitations are important when evaluating its capabilities.

- **Limited Bookable Inventory:** Only *Global Tech Summit 2026 Keynote* has seeded seat inventory. Other event cards are visual samples and do not have independent bookable inventory.
- **In-Memory Storage:** The current demo uses in-memory adapters for reservation data and coordination. Data may reset when the backend restarts.
- **Database Integration:** The PostgreSQL schema is provided as a reference and does not, by itself, mean a live PostgreSQL database is connected.
- **Redis Integration:** Redis Lua scripts are reference implementations. Live Redis coordination must be configured and integrated before relying on them in a deployed environment.
- **Concurrency Guarantees:** The effectiveness of reservation coordination depends on the active implementation. Production-grade guarantees must be verified through integration tests and concurrent load testing.
- **Production Readiness:** Persistent storage, distributed coordination, deployment security, monitoring, and failure recovery require further implementation and validation before production use.

---

## 🔮 Future Scope

Spotly can be extended with capabilities such as:

- **Persistent Reservation Storage** — Integrate PostgreSQL for durable booking records.
- **Distributed Coordination** — Implement and validate Redis-backed atomic reservation operations.
- **Adaptive Reservation Scheduling** — Explore smarter handling of booking demand and limited inventory.
- **Demand Forecasting** — Use historical reservation data to estimate demand and identify high-traffic periods.
- **Scalable Infrastructure** — Improve reliability under high concurrency through load testing and performance optimization.
- **Production-Grade Security** — Strengthen authentication, authorization, input validation, secret management, and operational monitoring.
- **Real Payment Integration** — Replace demo checkout with a secure payment workflow when appropriate.

These are potential enhancements, not claims that the capabilities are already implemented.

---

## 🎯 Project Goal

Spotly aims to simplify high-demand reservations by combining a customer-friendly booking experience with reliable reservation coordination.

Its core objective is to help users discover and reserve available seats while helping administrators monitor inventory, understand booking activity, and manage competing reservation requests.

By bringing usability and reservation reliability together, Spotly explores how booking systems can better handle limited inventory and periods of high demand.

---

## 💙 Spotly

**Find it. Lock it. Love it.**

*Discover your spot. Reserve it with confidence.*

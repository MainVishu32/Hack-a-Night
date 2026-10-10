Spotly
Find it. Lock it. Love it.
Spotly is a smart reservation and booking platform built to deliver a seamless booking experience while managing high demand for limited seats. It combines temporary seat holds, concurrency control, secure role-based access, and real-time reservation monitoring in a unified platform.

✨ Features
Intuitive Booking Experience — Browse event listings and preview available seats.
User Authentication — Separate experiences for attendees and administrators.
Seat Selection & Temporary Holds — Temporarily hold a seat before confirming a booking.
Demo Checkout & Booking History — Confirm demo bookings and view personal reservations.
Admin Dashboard — Monitor inventory, bookings, reports, and system activity.
Concurrency Control — Prevent multiple users from holding the same seat simultaneously.
Audit & Reconciliation — Inspect reservation activity and inventory consistency.
Simulation & Forecasting — Explore reservation behavior through administrative controls.
Load Testing — Includes a k6 scenario for testing concurrent booking requests.
Role-Based Authorization — Protect administrative routes and authenticated booking endpoints.
🛠️ Tech Stack
Technology	Purpose
React & TypeScript	Frontend interface
Vite	Development server and frontend build
Node.js & Express	Backend API
In-memory adapters	Demo data and reservation coordination
PostgreSQL	Database schema reference
Redis Lua	Reservation coordination examples
k6	Concurrent load testing
🚀 Getting Started
Prerequisites
Node.js 20 or later (Node.js 22 LTS recommended)
npm 10 or later
Installation
1. Clone the repository

git clone <your-repository-url>
cd <your-project-folder>
Alternatively, download and extract the project ZIP.

2. Install dependencies

Run the following command in the project directory containing package.json:

npm install
3. Start the development servers

npm run dev
4. Open Spotly

Visit the Vite URL displayed in your terminal, usually:

http://127.0.0.1:5173

The API server runs on port 3000.

Keep the terminal open while using the application. Press Ctrl+C to stop the development servers.

Production Build
Build the frontend:

npm run build
To run the server after building:

npm start
🔑 Demo Accounts
Use these credentials to explore the attendee and administrator experiences.

Role	Email	Password
Attendee	alex@example.com	DemoUser2026!
Admin	admin@pulsereserve.io	PulseAdmin2026!
These credentials are for local demonstrations only. Replace or rotate demo credentials and secure all secrets before any public deployment.

🧪 Key Scenarios to Test
Sign in as an attendee and verify access to event browsing and personal bookings.
Sign in as an administrator and verify access to the operations dashboard and reports.
Place a temporary seat hold and confirm a demo booking.
Attempt simultaneous holds on the same seat and verify that only one request acquires the active hold.
Check that the administrator dashboard reflects the reservation state.
Test administrative API authorization independently of frontend navigation.
Restart the server and verify the documented in-memory data reset.
📁 Project Structure
src/
├── pages/                  # Homepage, attendee and admin screens
├── context/
│   └── AuthContext.tsx     # Authentication state
└── services/
    └── api.ts              # Frontend API client

server/
├── api/
│   └── router.ts           # API routes and authorization
├── services/               # Reservation, scheduler, worker and forecasting
├── db/
│   └── schema.sql          # PostgreSQL schema reference
└── redis/
    └── luaScripts.ts       # Redis Lua examples

loadtests/                  # k6 concurrency scenarios
⚠️ Demo Limitations
Single bookable event: Only Global Tech Summit 2026 Keynote has seeded seat inventory. Other homepage cards are visual samples and do not have independent bookable inventory.
In-memory storage: The current database and Redis coordination adapters are demo implementations. Data resets when the server restarts.
Reference implementations: The PostgreSQL schema and Redis Lua scripts are included as references; they do not indicate that live PostgreSQL or Redis services are connected.
Production readiness: Persistent storage, production-grade coordination, and deployment security must be implemented and verified before production use.
🎯 Project Goal
Spotly aims to make high-demand reservations smoother and more reliable by coordinating temporary holds, preventing conflicting seat claims, enforcing role-based access, and providing visibility into booking activity.

Spotly — Find it. Lock it. Love it.

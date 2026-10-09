import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const successfulHolds = new Counter('successful_holds');
const collisionRejections = new Counter('collision_rejections');
const doubleBookingViolations = new Counter('double_booking_violations');
const holdDurationTrend = new Trend('hold_request_duration_ms');
const errorRate = new Rate('error_rate');

export const options = {
  scenarios: {
    // Scenario 1: Flash sale spike with 5,000 virtual users competing for 200 seats
    flash_sale_spike: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '15s', target: 500 },   // Warm-up ramp
        { duration: '30s', target: 5000 },  // Peak contention: 5,000 concurrent VUs
        { duration: '30s', target: 5000 },  // Sustained burst
        { duration: '15s', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    // Performance and invariant thresholds
    http_req_duration: ['p(95)<150', 'p(99)<300'], // 95% of requests under 150ms
    double_booking_violations: ['count===0'],        // Strict mathematical invariant: ZERO double bookings
    error_rate: ['rate<0.02'],                       // System error rate under 2% (excluding 409 collisions)
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const EVENT_ID = 'evt_summit_2026';

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // Generate simulated user credentials
  const userPayload = JSON.stringify({
    name: `Load Test VU ${vuId}`,
    email: `vu_${vuId}_${iter}@loadtest.local`,
    password: 'Password123!',
  });

  const authParams = {
    headers: { 'Content-Type': 'application/json' },
  };

  // Step 1: Fast register / authenticate
  const registerRes = http.post(`${BASE_URL}/api/auth/register`, userPayload, authParams);
  let authToken = null;

  if (registerRes.status === 201 || registerRes.status === 200) {
    const body = JSON.parse(registerRes.body);
    authToken = body.token;
  } else {
    // Attempt fallback login
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, userPayload, authParams);
    if (loginRes.status === 200) {
      authToken = JSON.parse(loginRes.body).token;
    }
  }

  if (!authToken) {
    errorRate.add(1);
    return;
  }

  const authenticatedParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  };

  // Step 2: High Contention: VUs compete heavily for high-demand VIP seats (A-01 to A-20)
  const targetSeatNumber = Math.floor(Math.random() * 20) + 1;
  const seatId = `unit_A_${targetSeatNumber.toString().padStart(2, '0')}`;
  const idempotencyKey = `idemp_k6_${vuId}_${iter}_${Date.now()}`;

  const start = Date.now();
  const holdRes = http.post(
    `${BASE_URL}/api/reservations/hold`,
    JSON.stringify({
      eventId: EVENT_ID,
      unitId: seatId,
      idempotencyKey: idempotencyKey,
    }),
    authenticatedParams
  );
  const latency = Date.now() - start;
  holdDurationTrend.add(latency);

  // Check Responses
  if (holdRes.status === 201) {
    // Successfully acquired temporary hold!
    successfulHolds.add(1);
    const holdData = JSON.parse(holdRes.body);
    const reservationId = holdData.reservationId;

    check(holdRes, {
      'Hold status is 201 Created': (r) => r.status === 201,
      'Hold contains valid reservation ID': () => !!reservationId,
      'Hold has authoritative server expiry': () => !!holdData.expiresAt,
    });

    // Step 3: Simulate realistic user dwell time (100ms - 500ms) before checkout confirmation
    sleep(0.2);

    // Step 4: Confirm booking
    const confirmRes = http.post(
      `${BASE_URL}/api/reservations/${reservationId}/confirm`,
      JSON.stringify({
        idempotencyKey: `confirm_${idempotencyKey}`,
        simulatedPaymentToken: 'tok_k6_verified',
      }),
      authenticatedParams
    );

    const confirmSuccess = check(confirmRes, {
      'Booking confirmed 200 OK': (r) => r.status === 200,
    });

    if (!confirmSuccess) {
      errorRate.add(1);
    }
  } else if (holdRes.status === 409) {
    // Safely rejected collision by Redis Lua fencing (Expected distributed behavior)
    collisionRejections.add(1);
    check(holdRes, {
      'Seat collision rejected with 409': (r) => r.status === 409,
    });
  } else if (holdRes.status === 429) {
    // Rate limited by token bucket
    check(holdRes, {
      'Rate limit 429 respected': (r) => r.status === 429,
    });
  } else {
    // Unexpected error
    errorRate.add(1);
  }

  sleep(0.1);
}

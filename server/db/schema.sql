-- ==============================================================================
-- PulseReserve PostgreSQL Database Schema
-- High-Contention Reservation & Self-Healing Inventory Engine
-- ==============================================================================

-- 1. User Accounts & Identity
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL, -- 'user' | 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Events & Performance Venues
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_units INTEGER NOT NULL DEFAULT 200,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 149.00,
    hold_duration_seconds INTEGER NOT NULL DEFAULT 300, -- 5 minute hold duration
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL, -- 'ACTIVE' | 'ARCHIVED' | 'PAUSED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Inventory Units (Physical Seats / Slots)
CREATE TABLE IF NOT EXISTS inventory_units (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    unit_code VARCHAR(50) NOT NULL, -- e.g. 'A-01', 'VIP-05'
    tier VARCHAR(50) NOT NULL,      -- 'VIP' | 'PREMIUM' | 'STANDARD'
    row_label VARCHAR(10) NOT NULL,
    seat_number INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'RELEASING'
    current_reservation_id VARCHAR(36),
    current_generation BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_event_unit_code UNIQUE (event_id, unit_code)
);

CREATE INDEX IF NOT EXISTS idx_units_event_status ON inventory_units(event_id, status);

-- 4. Temporary Reservations & Holds
CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    unit_id VARCHAR(36) NOT NULL REFERENCES inventory_units(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hold_token VARCHAR(64) NOT NULL,
    generation BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'HELD', -- 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'FAILED'
    idempotency_key VARCHAR(128) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_res_unit_status ON reservations(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_res_expires_at ON reservations(expires_at) WHERE status = 'HELD';
CREATE INDEX IF NOT EXISTS idx_res_user ON reservations(user_id);

-- 5. Confirmed Bookings (Source of Truth)
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    booking_reference VARCHAR(32) UNIQUE NOT NULL,
    reservation_id VARCHAR(36) UNIQUE NOT NULL REFERENCES reservations(id),
    event_id VARCHAR(36) NOT NULL REFERENCES events(id),
    unit_id VARCHAR(36) NOT NULL REFERENCES inventory_units(id),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED' | 'REFUNDED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- CRITICAL INVARIANT: No event and inventory unit can have more than one confirmed booking!
    CONSTRAINT uq_confirmed_booking_event_unit UNIQUE (event_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);

-- 6. Transactional Outbox Pattern for Durable Processing
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(36) PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL, -- 'RESERVATION' | 'BOOKING' | 'INVENTORY'
    aggregate_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(100) NOT NULL,    -- 'HOLD_ACQUIRED' | 'BOOKING_CONFIRMED' | 'HOLD_EXPIRED' | 'HOLD_CANCELLED'
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at);

-- 7. Audit Log Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Run after k6: psql "$DATABASE_URL" -f loadtests/audit_bookings.sql
-- Both result sets must be empty/zero for the no-double-booking invariant.
SELECT event_id, unit_id, COUNT(*) AS confirmed_booking_count
FROM bookings
WHERE status = 'CONFIRMED'
GROUP BY event_id, unit_id
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS confirmed_booking_inventory_mismatches
FROM bookings b
JOIN inventory_units i ON i.id = b.unit_id AND i.event_id = b.event_id
WHERE b.status = 'CONFIRMED'
  AND (i.status <> 'CONFIRMED' OR i.current_reservation_id IS DISTINCT FROM b.reservation_id);

-- Seed script for assigned_drivers table
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)

-- Step 1: Get existing driver IDs
SELECT id, name, license_plate FROM drivers ORDER BY name;

-- Step 2: Get existing request IDs that are in driver-related statuses
SELECT id, status, station_id FROM transport_requests 
WHERE status IN ('driver_assigned', 'order_picked_up', 'delivered')
ORDER BY created_at DESC LIMIT 10;

-- Step 3: Get a warehouse user ID for assigned_by_user_id
SELECT id, name FROM users WHERE role = 'warehouse' LIMIT 1;

-- Step 4: Run INSERT with actual UUIDs (replace these placeholders)
-- Get the IDs from Step 1, 2, 3 and replace below:

-- Example (replace with actual UUIDs from your database):
-- INSERT INTO assigned_drivers (request_id, driver_id, assigned_by_user_id)
-- VALUES 
--   ('REPLACE_WITH_REQUEST_UUID_1', 'REPLACE_WITH_DRIVER_UUID_1', 'REPLACE_WITH_USER_UUID'),
--   ('REPLACE_WITH_REQUEST_UUID_2', 'REPLACE_WITH_DRIVER_UUID_2', 'REPLACE_WITH_USER_UUID');

-- Dynamic insert using subqueries (run this to auto-assign drivers to pending requests):
INSERT INTO assigned_drivers (request_id, driver_id, assigned_by_user_id)
SELECT 
    tr.id,
    d.id,
    u.id
FROM transport_requests tr
CROSS JOIN LATERAL (
    SELECT id FROM drivers 
    WHERE is_available = true 
    ORDER BY rating DESC 
    LIMIT 1
) d
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'warehouse' LIMIT 1
) u
WHERE tr.status = 'driver_assigned'
AND NOT EXISTS (
    SELECT 1 FROM assigned_drivers ad WHERE ad.request_id = tr.id
)
LIMIT 5;

-- Verify the assignments
SELECT 
    ad.id,
    ad.request_id,
    ad.driver_id,
    d.name as driver_name,
    d.license_plate,
    tr.status as request_status
FROM assigned_drivers ad
JOIN drivers d ON ad.driver_id = d.id
JOIN transport_requests tr ON ad.request_id = tr.id;
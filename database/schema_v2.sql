-- AgriFlo (Agricultural Fertilizer Logistics System)
-- PostgreSQL Database Schema v2.0
-- Designed for: React + TypeScript frontend with full type alignment
-- WHY: New schema built from scratch to match frontend types/index.ts exactly

-- ============================================================
-- SECTION 1: CORE ENTITIES (Users, Stations, Receivers)
-- WHY: Separated to support the multi-role workflow and separate
-- station portal (origin) from receiver portal (destination)
-- ============================================================

-- USERS: System users with roles (admin_staff, admin_manager, finance, warehouse)
-- WHY: Added receiver role since frontend supports it; external systems/stations 
-- don't have logins - their requests come via admin_staff
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL 
        CHECK (role IN (
            'admin_staff',    -- Receives requests from stations
            'admin_manager',  -- Approves/declines requests
            'finance',       -- Handles invoicing & payments
            'warehouse',     -- Stock management & driver assignment
            'receiver'       -- Can view their deliveries
        )),
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE UNIQUE INDEX idx_users_employee ON users(employee_id);

-- WHY: Role-based filtering is the primary query pattern

-- STATIONS: Service centers that ORIGINATE fertilizer requests
-- WHY: Stations are the "origin" - they submit requests via admin_staff
-- NOT the same as receivers (destination)
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,    -- Physical location
    district VARCHAR(50) NOT NULL,    -- Administrative district
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stations_district ON stations(district);
CREATE UNIQUE INDEX idx_stations_code ON stations(station_code);

-- WHY: District filtering is a primary query pattern

-- RECEIVERS: Final destination for fertilizer deliveries
-- WHY: Frontend has receiver role and ReceiverPortal - distinct from stations
CREATE TABLE receivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiver_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    district VARCHAR(50) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_receivers_district ON receivers(district);

-- WHY: Receivers are lookup destinations in transport_requests

-- ============================================================
-- SECTION 2: INVENTORY & PRODUCTS
-- WHY: Separated catalog (reference) from inventory (transactions)
-- for better data integrity and pricing history
-- ============================================================

-- FERTILIZERS: Product catalog with pricing
-- WHY: Reference data - price may change but we need audit trail
-- Also stores NPK values in name for display
CREATE TABLE fertilizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,        -- e.g., "Urea 46-0-0"
    type VARCHAR(30) NOT NULL,        -- e.g., "Urea", "DAP", "MOP", "NPK"
    description VARCHAR(500),
    npk_values VARCHAR(20),         -- Store NPK for filtering: "46-0-0"
    unit_cost DECIMAL(12, 2) NOT NULL,        -- Per bag/unit price
    tax_rate DECIMAL(5, 2) DEFAULT 5.00,    -- Tax percentage
    unit_type VARCHAR(10) DEFAULT 'bag',       -- 'bag', 'ton', etc.
    unit_weight_kg DECIMAL(6, 2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fertilizers_type ON fertilizers(type);
CREATE INDEX idx_fertilizers_sku ON fertilizers(sku);

-- WHY: Filter by type is common; SKU is unique lookup

-- STOCK: Current inventory levels per product per warehouse
-- WHY: Denormalized for performance - computed totals
-- Tracks state transitions: available -> booked -> prepping -> shipped
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fertilizer_id UUID NOT NULL REFERENCES fertilizers(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(50) DEFAULT 'Main Warehouse',
    
    -- Three states of inventory (per frontend types/index.ts)
    available_qty DECIMAL(12, 2) DEFAULT 0,   -- Free for booking
    booked_qty DECIMAL(12, 2) DEFAULT 0,         -- Reserved for approved orders
    prepping_qty DECIMAL(12, 2) DEFAULT 0,      -- Being loaded/prepared
    
    -- Computed total (WHY: Avoids recalculation on every query)
    total_qty DECIMAL(12, 2) GENERATED ALWAYS AS (
        available_qty + booked_qty + prepping_qty
    ) STORED,
    
    -- Reorder thresholds (WHY: Enable low-stock alerts)
    min_threshold_qty DECIMAL(12, 2) DEFAULT 50.00,
    reorder_level_qty DECIMAL(12, 2) DEFAULT 100.00,
    
    last_restocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(fertilizer_id, warehouse_location)
);

CREATE INDEX idx_stock_fertilizer ON stock(fertilizer_id);
CREATE INDEX idx_stock_warehouse ON stock(warehouse_location);

-- WHY: Compound unique ensures one stock record per product per warehouse

-- ============================================================
-- SECTION 3: TRANSPORT ORDERS
-- WHY: Central entity tying all workflow together
-- Single table with status field (not separate workflow tables)
-- ============================================================

-- TRANSPORT_REQUESTS: Core order entity
-- WHY: Frontend has linear workflow, not state machine
-- Single table with status enum matches type index.ts exactly
CREATE TABLE transport_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code VARCHAR(20) UNIQUE NOT NULL,   -- e.g., "REQ-8900"
    
    -- ========== REQUEST METADATA ==========
    origin VARCHAR(50) DEFAULT 'Station Portal',   -- How request was received
    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (status IN (
            'new',                   -- Admin staff receives from station
            'pending_admin_manager',-- Sent to admin manager for approval
            'approved',              -- Approved (rare - usually goes to finance)
            'declined',             -- Declined by admin manager
            'pending_finance',     -- Sent to finance
            'invoiced',             -- Invoice generated
            'invoice_declined',      -- Invoice declined by finance
            'paid',                -- Payment confirmed (manual)
            'released',             -- Released to warehouse
            'booking_stock',       -- Stock being reserved
            'prepping',            -- Stock being loaded
            'driver_assigned',     -- Driver assigned to route
            'order_picked_up',     -- Driver picked up the order
            'delivered'            -- Order delivered to receiver
        )),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- ========== RELATIONSHIPS ==========
    station_id UUID NOT NULL REFERENCES stations(id),      -- Origin (requesting station)
    receiver_id UUID REFERENCES receivers(id),         -- Destination (delivery point)
    created_by_user_id UUID REFERENCES users(id),         -- admin_staff who created
    assigned_to_user_id UUID REFERENCES users(id),    -- Current assignee
    
    -- ========== ORDER DETAILS ==========
    destination VARCHAR(100),               -- Name of receiver destination
    order_created_date TIMESTAMP,                -- When station created request
    
    -- ========== SLA (72 hours per types/index.ts) ==========
    sla_deadline TIMESTAMP,                  -- Calculated deadline
    
    -- ========== FINANCIAL SUMMARY (denormalized for performance) ==========
    subtotal DECIMAL(14, 2) DEFAULT 0,
    tax_total DECIMAL(14, 2) DEFAULT 0,
    grand_total DECIMAL(14, 2) DEFAULT 0,
    
    -- ========== WORKFLOW TIMESTAMPS ==========
    -- Status transition timestamps (WHY: Track SLA adherence)
    invoice_id UUID,
    invoice_generated_at TIMESTAMP,
    released_at TIMESTAMP,                  -- Finance released to warehouse
    cleared_at TIMESTAMP,                   -- Cleared for processing
    stock_booked_at TIMESTAMP,             -- Stock reserved
    driver_assigned_at TIMESTAMP,
    picked_up_at TIMESTAMP,                -- Driver picked up
    delivered_at TIMESTAMP,                -- Completed delivery
    
    -- ========== NOTES & REJECTIONS ==========
    warehouse_notes TEXT,
    decline_reason TEXT,
    
    -- ========== ROUTE INFO ==========
    route_from VARCHAR(50),
    route_to VARCHAR(50),
    route_distance_km DECIMAL(10, 2),
    
    -- ========== METADATA ==========
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- WHY: Composite indexes for common query patterns
CREATE INDEX idx_requests_status ON transport_requests(status);
CREATE INDEX idx_requests_station ON transport_requests(station_id);
CREATE INDEX idx_requests_receiver ON transport_requests(receiver_id);
CREATE INDEX idx_requests_sla ON transport_requests(sla_deadline);
CREATE INDEX idx_requests_created_at ON transport_requests(created_at DESC);
CREATE INDEX idx_requests_priority ON transport_requests(priority);
CREATE INDEX idx_requests_district ON transport_requests(route_from);

-- REQUEST_ITEMS: Line items for each transport request
-- WHY: Normalized - quantity/price captured at request time
-- If fertilizer prices change, historical requests keep old prices
CREATE TABLE request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    fertilizer_id UUID REFERENCES fertilizers(id),
    sku VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,           -- Snapshot: "Urea 46-0-0"
    fertilizer_type VARCHAR(30) NOT NULL, -- Snapshot: "Urea"
    quantity INTEGER NOT NULL,            -- Number of bags
    unit_cost DECIMAL(12, 2) NOT NULL,    -- Price at time of request
    tax DECIMAL(12, 2) NOT NULL,           -- Tax amount (snapshot)
    total DECIMAL(14, 2) NOT NULL,        -- line total (snapshot)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_request_items_request ON request_items(request_id);
CREATE INDEX idx_request_items_sku ON request_items(sku);

-- WHY: request_id is always queried with this table

-- ============================================================
-- SECTION 4: INVOICING
-- WHY: Separated from requests for financial workflows
-- Invoice can exist independently of request status
-- ============================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_code VARCHAR(20) UNIQUE NOT NULL,   -- e.g., "INV-8900"
    request_id UUID NOT NULL REFERENCES transport_requests(id),
    generated_by_user_id UUID REFERENCES users(id),
    
    status VARCHAR(20) DEFAULT 'generated'
        CHECK (status IN ('generated', 'released', 'declined', 'paid')),
    
    -- Financial snapshot (from request_items at generation time)
    subtotal DECIMAL(14, 2) NOT NULL,
    tax_total DECIMAL(14, 2) NOT NULL,
    grand_total DECIMAL(14, 2) NOT NULL,
    
    -- Payment details
    payment_method VARCHAR(20)
        CHECK (payment_method IN ('cash', 'credit', 'account')),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid')),
    paid_at TIMESTAMP,
    
    -- Release workflow
    released_at TIMESTAMP,
    released_by_user_id UUID REFERENCES users(id),
    
    -- Decline workflow
    decline_reason TEXT,
    
    -- Timestamps
    generated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_request ON invoices(request_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE UNIQUE INDEX idx_invoices_code ON invoices(invoice_code);

-- WHY: Request lookup and status filtering are primary queries

-- INVOICE_ITEMS: Line items for invoice
-- WHY: Separate from request_items - allows invoice adjustments
-- without modifying original request
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    fertilizer_id UUID REFERENCES fertilizers(id),
    sku VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    tax DECIMAL(12, 2) NOT NULL,
    total DECIMAL(14, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================
-- SECTION 5: DRIVERS & TRANSPORT
-- WHY: External to main workflow - drivers may not have system logins
-- Bilingual support for driver bidding system
-- ============================================================

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),      -- If driver has login account
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL,   -- "10-Wheeler", "6-Wheeler", "Trailer"
    capacity_kg DECIMAL(10, 2) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 4.50,
    is_available BOOLEAN DEFAULT true,
    
    -- Location tracking (WHY: Enable nearby driver lookup)
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    current_district VARCHAR(50),
    last_location_update TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drivers_vehicle ON drivers(vehicle_type);
CREATE INDEX idx_drivers_location ON drivers(current_district);
CREATE INDEX idx_drivers_availability ON drivers(is_available);

-- DRIVER_BIDS: Bidding for transport requests
-- WHY: Enables competitive driver assignment
-- Drivers bid on available transport requests
CREATE TABLE driver_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    driver_name VARCHAR(100) NOT NULL,
    bid_amount DECIMAL(12, 2) NOT NULL,     -- Bid price for transport
    estimated_minutes INTEGER,              -- Estimated delivery time
    distance_km DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    submitted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_driver_bids_request ON driver_bids(request_id);
CREATE INDEX idx_driver_bids_driver ON driver_bids(driver_id);
CREATE INDEX idx_driver_bids_status ON driver_bids(status);

-- ASSIGNED_DRIVER: Active driver assignment per request
-- WHY: Current assignment, not historical bids
CREATE TABLE assigned_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES transport_requests(id),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_assigned_driver_request ON assigned_drivers(request_id);

-- ============================================================
-- SECTION 6: AUDIT & COMPLIANCE
-- WHY: Financial/operational audit trail required
-- Full history of all state changes
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(30) NOT NULL,       -- 'request', 'invoice', 'stock', 'user'
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100),
    user_role VARCHAR(20),
    action VARCHAR(50) NOT NULL,          -- 'REQUEST_CREATED', 'APPROVED', 'ROUTED', etc.
    details TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Composite indexes for audit queries
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- WHY: Entity+ID lookup is primary pattern, then user, then timestamp

-- ============================================================
-- SECTION 7: SESSIONS & AUTH
-- WHY: Secure session management
-- ============================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- WHY: Automate common operations and enforce business rules
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- WHY: Single function can be used across all tables

-- Apply to all timestamped tables
CREATE TRIGGER users_updated_at 
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stations_updated_at 
    BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER receivers_updated_at 
    BEFORE UPDATE ON receivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fertilizers_updated_at 
    BEFORE UPDATE ON fertilizers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stock_updated_at 
    BEFORE UPDATE ON stock FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transport_requests_updated_at 
    BEFORE UPDATE ON transport_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invoices_updated_at 
    BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER drivers_updated_at 
    BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate SLA deadline (72 hours from creation)
CREATE OR REPLACE FUNCTION calculate_sla_deadline(created_date TIMESTAMP)
RETURNS TIMESTAMP AS $$
BEGIN
    RETURN created_date + INTERVAL '72 hours';
END;
$$ LANGUAGE plpgsql;

-- Check if request is overdue
CREATE OR REPLACE FUNCTION is_request_overdue(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(30);
    v_sla TIMESTAMP;
BEGIN
    SELECT tr.status, tr.sla_deadline INTO v_status, v_sla
    FROM transport_requests tr
    WHERE tr.id = request_id;
    
    -- Final statuses that are not "overdue"
    IF v_status IN ('delivered', 'declined', 'invoice_declined') THEN
        RETURN FALSE;
    END IF;
    
    RETURN NOW() > v_sla;
END;
$$ LANGUAGE plpgsql;

-- Auto-create audit log entry on status change
CREATE OR REPLACE FUNCTION audit_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (entity_type, entity_id, user_id, user_name, user_role, action, details)
        VALUES (
            'request',
            NEW.id,
            NEW.assigned_to_user_id,
            COALESCE(NEW.created_by_user_id::text, 'system'),
            NULL,
            'STATUS_CHANGED',
            'Status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-audit
CREATE TRIGGER request_status_audit
    AFTER UPDATE ON transport_requests
    FOR EACH ROW EXECUTE FUNCTION audit_status_change();

-- ============================================================
-- VIEWS
-- WHY: Common query patterns as reusable views
-- ============================================================

-- View: Request with full details for dashboard
CREATE OR REPLACE VIEW v_request_details AS
SELECT 
    tr.id,
    tr.request_code,
    tr.status,
    tr.priority,
    tr.created_at,
    tr.sla_deadline,
    tr.grand_total,
    s.name AS station_name,
    s.district AS station_district,
    r.name AS receiver_name,
    r.district AS receiver_district,
    tr.route_distance_km,
    is_request_overdue(tr.id) AS is_overdue,
    TIMESTAMPDIFF(HOURS, tr.created_at, NOW()) AS hours_since_created
FROM transport_requests tr
LEFT JOIN stations s ON s.id = tr.station_id
LEFT JOIN receivers r ON r.id = tr.receiver_id;

-- View: Stock levels with status indicators
CREATE OR REPLACE VIEW v_stock_with_status AS
SELECT 
    f.sku,
    f.name,
    f.type,
    f.unit_cost,
    s.available_qty,
    s.booked_qty,
    s.prepping_qty,
    s.total_qty,
    s.min_threshold_qty,
    s.reorder_level_qty,
    s.warehouse_location,
    CASE 
        WHEN s.available_qty <= s.min_threshold_qty THEN 'critical'
        WHEN s.available_qty <= s.reorder_level_qty THEN 'low'
        WHEN s.available_qty <= s.reorder_level_qty * 1.5 THEN 'medium'
        ELSE 'healthy'
    END AS stock_status,
    CASE 
        WHEN s.available_qty <= s.min_threshold_qty THEN 'Place emergency order'
        WHEN s.available_qty <= s.reorder_level_qty THEN 'Consider reordering'
        ELSE 'Stock OK'
    END AS recommended_action
FROM stock s
JOIN fertilizers f ON f.id = s.fertilizer_id
WHERE f.is_active = true;

-- View: Pending requests grouped by status for admin dashboards
CREATE OR REPLACE VIEW v_requests_by_status AS
SELECT 
    tr.status,
    COUNT(*) AS count,
    SUM(tr.grand_total) AS total_value,
    AVG(EXTRACT(EPOCH FROM (NOW() - tr.created_at)) / 3600) AS avg_age_hours
FROM transport_requests tr
WHERE tr.status NOT IN ('delivered', 'declined', 'invoice_declined')
GROUP BY tr.status;

-- View: Finance dashboard summary
CREATE OR REPLACE VIEW v_finance_summary AS
SELECT 
    COUNT(CASE WHEN tr.status = 'pending_finance' THEN 1 END) AS pending_invoicing,
    COUNT(CASE WHEN tr.status = 'invoiced' THEN 1 END) AS invoiced_awaiting_payment,
    COUNT(CASE WHEN tr.status = 'paid' THEN 1 END) AS paid_awaiting_release,
    SUM(CASE WHEN tr.status = 'invoiced' THEN tr.grand_total ELSE 0 END) AS pending_revenue,
    COUNT(CASE WHEN tr.status = 'delivered' 
        AND tr.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS delivered_30_days
FROM transport_requests tr;

-- View: Warehouse workload
CREATE OR REPLACE VIEW v_warehouse_workload AS
SELECT 
    tr.status,
    COUNT(*) AS requests_count,
    SUM(ri.quantity) AS total_bags,
    COUNT(DISTINCT tr.driver_id) AS active_drivers
FROM transport_requests tr
LEFT JOIN request_items ri ON ri.request_id = tr.id
WHERE tr.status IN ('booking_stock', 'prepping', 'driver_assigned', 'order_picked_up')
GROUP BY tr.status;

-- View: SLA dashboard for monitoring
CREATE OR REPLACE VIEW v_sla_monitoring AS
SELECT 
    tr.id,
    tr.request_code,
    tr.status,
    tr.priority,
    tr.sla_deadline,
    CASE 
        WHEN is_request_overdue(tr.id) THEN 'OVERDUE'
        WHEN tr.sla_deadline - NOW() < INTERVAL '24 hours' THEN 'AT_RISK'
        ELSE 'ON_TRACK'
    END AS sla_status,
    EXTRACT(EPOCH FROM (tr.sla_deadline - NOW())) / 3600 AS hours_remaining
FROM transport_requests tr
WHERE tr.status NOT IN ('delivered', 'declined', 'invoice_declined');

-- ============================================================
-- SEED DATA
-- WHY: Minimal data to make the system operable
-- Password is 'fdms123' - bcrypt hash needed for production
-- ============================================================

-- Users
INSERT INTO users (employee_id, name, role, password_hash) VALUES
('ADM001', 'Kasun Perera', 'admin_staff', '$2a$10$placeholder'),
('MGR001', 'Nimal Fernando', 'admin_manager', '$2a$10$placeholder'),
('FIN001', 'Dilani Silva', 'finance', '$2a$10$placeholder'),
('WAR001', 'Ruwan Kumara', 'warehouse', '$2a$10$placeholder'),
('RCV001', 'Gamage Dissanayake', 'receiver', '$2a$10$placeholder');

-- Stations (Origins)
INSERT INTO stations (station_code, name, location, district, contact_person, phone) VALUES
('STN-1001', 'Colombo Central Station', 'Colombo', 'Colombo', 'Station Manager 1', '+94 11 2000123'),
('STN-1002', 'Kandy District Office', 'Kandy', 'Kandy', 'Station Manager 2', '+94 81 2000124'),
('STN-1003', 'Galle Regional Hub', 'Galle', 'Galle', 'Station Manager 3', '+94 91 2000125'),
('STN-1004', 'Jaffna Branch', 'Jaffna', 'Jaffna', 'Station Manager 4', '+94 21 2000126'),
('STN-1005', 'Matale Supply Point', 'Matale', 'Matale', 'Station Manager 5', '+94 66 2000127'),
('STN-1006', 'Kalutara Distribution Center', 'Kalutara', 'Kalutara', 'Station Manager 6', '+94 34 2000128'),
('STN-1007', 'Gampaha Station', 'Gampaha', 'Gampaha', 'Station Manager 7', '+94 33 2000129'),
('STN-1008', 'Kurunegala Depot', 'Kurunegala', 'Kurunegala', 'Station Manager 8', '+94 37 2000130');

-- Receivers (Destinations)
INSERT INTO receivers (receiver_code, name, location, district, contact_person, phone) VALUES
('RCV-2001', 'Anuradhapura Farming Coop', 'Anuradhapura', 'Anuradhapura', 'Coop Manager 1', '+94 25 2000223'),
('RCV-2002', 'Polonnaruwa Agri Center', 'Polonnaruwa', 'Polonnaruwa', 'Coop Manager 2', '+94 27 2000224'),
('RCV-2003', 'Hambantota Rice Mill', 'Hambantota', 'Hambantota', 'Mill Manager 1', '+94 47 2000225'),
('RCV-2004', 'Badulla Plantation Supply', 'Badulla', 'Badulla', 'Plantation Manager 1', '+94 55 2000226'),
('RCV-2005', 'Ratnapura Agri Depot', 'Ratnapura', 'Ratnapura', 'Depot Manager 1', '+94 45 2000227'),
('RCV-2006', 'Moneragala Farm Store', 'Moneragala', 'Moneragala', 'Store Manager 1', '+94 55 2000228'),
('RCV-2007', 'Ampara Irrigation Project', 'Ampara', 'Ampara', 'Project Manager 1', '+94 61 2000229'),
('RCV-2008', 'Trincomalee Harbor Storage', 'Trincomalee', 'Trincomalee', 'Storage Manager 1', '+94 26 2000230');

-- Fertilizers (Product Catalog)
INSERT INTO fertilizers (sku, name, type, npk_values, unit_cost, tax_rate, unit_weight_kg) VALUES
('FER-UREA-50', 'Urea (46-0-0)', 'Urea', '46-0-0', 4500.00, 5.00, 50.00),
('FER-DAP-50', 'DAP (18-46-0)', 'DAP', '18-46-0', 8200.00, 5.00, 50.00),
('FER-MOP-50', 'MOP (0-0-60)', 'MOP', '0-0-60', 6800.00, 5.00, 50.00),
('FER-NPK-50', 'NPK (15-15-15)', 'NPK', '15-15-15', 7500.00, 5.00, 50.00),
('FER-TSP-50', 'TSP (0-46-0)', 'TSP', '0-46-0', 5200.00, 5.00, 50.00),
('FER-SUL-50', 'Sulphur (90%)', 'Sulphur', '0-0-0', 3200.00, 5.00, 50.00);

-- Stock (Inventory Levels - in metric tons converted from bags)
INSERT INTO stock (fertilizer_id, available_qty, booked_qty, prepping_qty, min_threshold_qty, reorder_level_qty)
SELECT id, 450, 50, 20, 50, 100 FROM fertilizers WHERE type = 'Urea'
UNION ALL
SELECT id, 280, 30, 10, 30, 80 FROM fertilizers WHERE type = 'DAP'
UNION ALL
SELECT id, 180, 20, 5, 25, 60 FROM fertilizers WHERE type = 'MOP'
UNION ALL
SELECT id, 350, 40, 15, 40, 90 FROM fertilizers WHERE type = 'NPK'
UNION ALL
SELECT id, 120, 10, 0, 20, 50 FROM fertilizers WHERE type = 'TSP'
UNION ALL
SELECT id, 90, 5, 0, 10, 30 FROM fertilizers WHERE type = 'Sulphur';

-- Drivers
INSERT INTO drivers (name, phone, license_plate, vehicle_type, capacity_kg, rating, current_district) VALUES
('Sunil Wijesinghe', '+94 77 123 4567', 'CBA-3421', '10-Wheeler', 20000, 4.8, 'Colombo'),
('Mahinda Rathnayake', '+94 77 234 5678', 'CBB-7823', '6-Wheeler', 10000, 4.9, 'Kandy'),
('Pradeep Silva', '+94 77 345 6789', 'CBA-9934', '10-Wheeler', 20000, 4.7, 'Galle'),
('Chamara Bandara', '+94 77 456 7890', 'CBA-2156', 'Trailer', 30000, 4.6, 'Jaffna'),
('Nuwan Dissanayake', '+94 77 567 8901', 'CBB-6678', '6-Wheeler', 10000, 4.9, 'Matale'),
('Ajith Gunawardena', '+94 77 678 9012', 'CBA-1122', '10-Wheeler', 20000, 4.5, 'Kalutara'),
('Roshan Perera', '+94 77 789 0123', 'CBB-3344', '6-Wheeler', 10000, 4.8, 'Gampaha'),
('Lalith Jayasinghe', '+94 77 890 1234', 'CBA-5566', 'Trailer', 30000, 4.7, 'Panadura');

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- WHY: Enable multi-tenant isolation (future-proofing)
-- ============================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Bypass policy for admins (would be checked in app logic)
CREATE POLICY "service_account_access" ON users FOR ALL USING (true);
CREATE POLICY "service_account_access_sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "service_account_access_audit" ON audit_logs FOR ALL USING (true);

-- ============================================================
-- END OF SCHEMA v2.0
-- ============================================================
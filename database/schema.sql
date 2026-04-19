-- FDMS (Fertilizer Distribution Management System)
-- PostgreSQL Database Schema
-- Version: 1.0

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin_staff', 'admin_manager', 'finance', 'warehouse', 'driver')),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- STATIONS (Service Centers)
-- ============================================================

CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(20) UNIQUE NOT NULL,
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

CREATE INDEX idx_stations_district ON stations(district);

-- ============================================================
-- FERTILIZERS (Product Catalog with Pricing)
-- ============================================================

CREATE TABLE fertilizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 5.00,
    unit_type VARCHAR(10) DEFAULT 'bag',
    unit_weight_kg DECIMAL(6, 2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STOCK (Inventory Management)
-- ============================================================

CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fertilizer_id UUID REFERENCES fertilizers(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(50) DEFAULT 'Main Warehouse',
    available_qty DECIMAL(12, 2) DEFAULT 0,
    booked_qty DECIMAL(12, 2) DEFAULT 0,
    prepping_qty DECIMAL(12, 2) DEFAULT 0,
    total_qty DECIMAL(12, 2) GENERATED ALWAYS AS (available_qty + booked_qty + prepping_qty) STORED,
    min_threshold_qty DECIMAL(12, 2) DEFAULT 50.00,
    reorder_level_qty DECIMAL(12, 2) DEFAULT 100.00,
    last_restocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(fertilizer_id, warehouse_location)
);

CREATE INDEX idx_stock_fertilizer ON stock(fertilizer_id);

-- ============================================================
-- TRANSPORT REQUESTS (Orders)
-- ============================================================

CREATE TABLE transport_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Request Metadata
    origin VARCHAR(50) DEFAULT 'Station Portal',
    status VARCHAR(30) NOT NULL DEFAULT 'new' 
        CHECK (status IN (
            'new', 'pending_admin_manager', 'approved', 'declined', 
            'pending_finance', 'invoiced', 'released', 
            'booking_stock', 'prepping', 'shipped', 
            'driver_assigned', 'in_transit', 'invoice_declined'
        )),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Relationships
    station_id UUID REFERENCES stations(id),
    created_by_user_id UUID REFERENCES users(id),
    assigned_to_user_id UUID REFERENCES users(id),
    
    -- Order Details
    destination VARCHAR(100),  -- Now equals station name
    order_created_date TIMESTAMP,
    
    -- SLA (72 hours / 3 business days)
    sla_deadline TIMESTAMP,
    
    -- Financials
    subtotal DECIMAL(14, 2) DEFAULT 0,
    tax_total DECIMAL(14, 2) DEFAULT 0,
    grand_total DECIMAL(14, 2) DEFAULT 0,
    
    -- Timestamps for workflow
    invoice_id UUID,
    invoice_generated_at TIMESTAMP,
    released_at TIMESTAMP,
    cleared_at TIMESTAMP,
    stock_booked_at TIMESTAMP,
    warehouse_notes TEXT,
    driver_assigned_at TIMESTAMP,
    shipped_at TIMESTAMP,
    
    -- Rejection
    decline_reason TEXT,
    
    -- Route Info
    route_from VARCHAR(50),
    route_to VARCHAR(50),
    route_distance_km DECIMAL(10, 2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_requests_status ON transport_requests(status);
CREATE INDEX idx_requests_station ON transport_requests(station_id);
CREATE INDEX idx_requests_sla ON transport_requests(sla_deadline);
CREATE INDEX idx_requests_created_at ON transport_requests(created_at DESC);

-- ============================================================
-- REQUEST ITEMS (Line Items per Order)
-- ============================================================

CREATE TABLE request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES transport_requests(id) ON DELETE CASCADE,
    fertilizer_id UUID REFERENCES fertilizers(id),
    sku VARCHAR(30) NOT NULL,
    fertilizer_type VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    tax DECIMAL(12, 2) NOT NULL,
    total DECIMAL(14, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_request_items_request ON request_items(request_id);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_code VARCHAR(20) UNIQUE NOT NULL,
    request_id UUID REFERENCES transport_requests(id),
    generated_by_user_id UUID REFERENCES users(id),
    
    status VARCHAR(20) DEFAULT 'generated'
        CHECK (status IN ('generated', 'released', 'declined', 'paid')),
    
    -- Financials
    subtotal DECIMAL(14, 2) NOT NULL,
    tax_total DECIMAL(14, 2) NOT NULL,
    grand_total DECIMAL(14, 2) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid')),
    paid_at TIMESTAMP,
    
    -- Release
    released_at TIMESTAMP,
    released_by_user_id UUID REFERENCES users(id),
    
    -- Decline
    decline_reason TEXT,
    
    -- Generated timestamp
    generated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_request ON invoices(request_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================
-- DRIVERS
-- ============================================================

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    license_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL,
    capacity_kg DECIMAL(10, 2) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 4.50,
    is_available BOOLEAN DEFAULT true,
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    current_district VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- DRIVER BIDS
-- ============================================================

CREATE TABLE driver_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES transport_requests(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id),
    driver_name VARCHAR(100) NOT NULL,
    bid_amount DECIMAL(12, 2) NOT NULL,
    estimated_minutes INTEGER,
    distance_km DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    submitted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_driver_bids_request ON driver_bids(request_id);
CREATE INDEX idx_driver_bids_driver ON driver_bids(driver_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(30) NOT NULL,  -- 'request', 'invoice', 'stock', etc.
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100),
    user_role VARCHAR(20),
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users (password is 'fdms123' - bcrypt hash needed for production)
INSERT INTO users (employee_id, name, role, password_hash) VALUES
('ADM001', 'Kasun Perera', 'admin_staff', '$2a$10$placeholder'),
('MGR001', 'Nimal Fernando', 'admin_manager', '$2a$10$placeholder'),
('FIN001', 'Dilani Silva', 'finance', '$2a$10$placeholder'),
('WAR001', 'Ruwan Kumara', 'warehouse', '$2a$10$placeholder'),
('DRV001', 'Saman Jayasinghe', 'driver', '$2a$10$placeholder');

-- Stations
INSERT INTO stations (station_code, name, location, district, contact_person, phone) VALUES
('STN-1001', 'Colombo Central Station', 'Colombo', 'Colombo', 'Station Manager 1', '+94 11 2000123'),
('STN-1002', 'Kandy District Office', 'Kandy', 'Kandy', 'Station Manager 2', '+94 81 2000124'),
('STN-1003', 'Galle Regional Hub', 'Galle', 'Galle', 'Station Manager 3', '+94 91 2000125'),
('STN-1004', 'Jaffna Branch', 'Jaffna', 'Jaffna', 'Station Manager 4', '+94 21 2000126'),
('STN-1005', 'Matale Supply Point', 'Matale', 'Matale', 'Station Manager 5', '+94 66 2000127'),
('STN-1006', 'Kalutara Distribution Center', 'Kalutara', 'Kalutara', 'Station Manager 6', '+94 34 2000128'),
('STN-1007', 'Gampaha Station', 'Gampaha', 'Gampaha', 'Station Manager 7', '+94 33 2000129'),
('STN-1008', 'Kurunegala Depot', 'Kurunegala', 'Kurunegala', 'Station Manager 8', '+94 37 2000130');

-- Fertilizers with pricing
INSERT INTO fertilizers (sku, name, type, unit_cost, tax_rate) VALUES
('FER-UREA-50', 'Urea (46-0-0) - 50kg bag', 'Urea', 4500.00, 5.00),
('FER-DAP-50', 'DAP (18-46-0) - 50kg bag', 'DAP', 8200.00, 5.00),
('FER-MOP-50', 'MOP (0-0-60) - 50kg bag', 'MOP', 6800.00, 5.00),
('FER-NPK-50', 'NPK (15-15-15) - 50kg bag', 'NPK', 7500.00, 5.00),
('FER-TSP-50', 'TSP (0-46-0) - 50kg bag', 'TSP', 5200.00, 5.00),
('FER-SUL-50', 'Sulphur (90%) - 50kg bag', 'Sulphur', 3200.00, 5.00);

-- Stock (metric tons)
INSERT INTO stock (fertilizer_id, available_qty, booked_qty, prepping_qty, min_threshold_qty, reorder_level_qty)
SELECT id, 450, 50, 0, 50, 100 FROM fertilizers WHERE type = 'Urea'
UNION ALL
SELECT id, 280, 30, 0, 30, 80 FROM fertilizers WHERE type = 'DAP'
UNION ALL
SELECT id, 320, 20, 0, 40, 90 FROM fertilizers WHERE type = 'MOP'
UNION ALL
SELECT id, 180, 15, 0, 25, 60 FROM fertilizers WHERE type = 'NPK'
UNION ALL
SELECT id, 150, 10, 0, 20, 50 FROM fertilizers WHERE type = 'TSP'
UNION ALL
SELECT id, 0, 0, 0, 10, 30 FROM fertilizers WHERE type = 'Sulphur';

-- Drivers
INSERT INTO drivers (user_id, license_plate, vehicle_type, capacity_kg, rating, current_district)
SELECT id, '10-ABCD', '10-Wheeler', 12000, 4.8, 'Colombo' FROM users WHERE role = 'driver';

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fertilizers_updated_at BEFORE UPDATE ON fertilizers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stock_updated_at BEFORE UPDATE ON stock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate SLA deadline (72 hours from creation)
CREATE OR REPLACE FUNCTION calculate_sla_deadline(created_date TIMESTAMP)
RETURNS TIMESTAMP AS $$
BEGIN
    RETURN created_date + INTERVAL '72 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to check if request is overdue
CREATE OR REPLACE FUNCTION is_request_overdue(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(30);
    v_sla TIMESTAMP;
BEGIN
    SELECT status, sla_deadline INTO v_status, v_sla
    FROM transport_requests WHERE id = request_id;
    
    IF v_status IN ('shipped', 'declined', 'invoice_declined') THEN
        RETURN FALSE;
    END IF;
    
    RETURN NOW() > v_sla;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-release stock on Admin Manager approval
CREATE OR REPLACE FUNCTION release_stock_on_approval(request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_item RECORD;
    v_stock RECORD;
BEGIN
    FOR v_item IN 
        SELECT ri.fertilizer_id, ri.quantity, f.type, f.unit_weight_kg
        FROM request_items ri
        JOIN fertilizers f ON f.id = ri.fertilizer_id
        WHERE ri.request_id = request_id
    LOOP
        UPDATE stock 
        SET available_qty = available_qty - (v_item.quantity * v_item.unit_weight_kg / 1000),
            booked_qty = booked_qty + (v_item.quantity * v_item.unit_weight_kg / 1000),
            updated_at = NOW()
        WHERE fertilizer_id = v_item.fertilizer_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Pending requests for Admin Manager
CREATE OR REPLACE VIEW v_pending_admin_manager AS
SELECT tr.request_code, tr.status, tr.priority, tr.created_at, tr.sla_deadline,
       s.name AS station_name, s.district, tr.grand_total,
       is_request_overdue(tr.id) AS is_overdue
FROM transport_requests tr
JOIN stations s ON s.id = tr.station_id
WHERE tr.status = 'pending_admin_manager';

-- View: Stock levels with status
CREATE OR REPLACE VIEW v_stock_with_status AS
SELECT f.sku, f.name, f.type, f.unit_cost,
       s.available_qty, s.booked_qty, s.prepping_qty, s.total_qty,
       CASE 
           WHEN s.available_qty <= s.min_threshold_qty THEN 'Critical'
           WHEN s.available_qty <= s.reorder_level_qty THEN 'Low Stock'
           ELSE 'In Stock'
       END AS stock_status
FROM stock s
JOIN fertilizers f ON f.id = s.fertilizer_id;

-- View: Request with items for invoice
CREATE OR REPLACE VIEW v_invoice_preview AS
SELECT tr.request_code, tr.station_id, s.name AS station_name, 
       s.location, s.district, s.contact_person, s.phone,
       tr.grand_total, tr.tax_total, tr.subtotal,
       tr.created_at AS order_date
FROM transport_requests tr
JOIN stations s ON s.id = tr.station_id;

-- ============================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own role's data (simplified)
CREATE POLICY "Users see all" ON users
    FOR ALL USING (true);

-- Policy: Role-based access would be handled in backend API
-- (RLS policies depend on application logic)

-- ============================================================
-- END OF SCHEMA
-- ============================================================
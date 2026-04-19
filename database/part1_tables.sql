-- ============================================================
-- AgriFlo Schema v2.3 — PART 1 of 2: Tables, Functions, Seed Data
-- Run this first, then run part2_views.sql
-- ============================================================

-- ============================================================
-- SECTION 1: CORE ENTITIES
-- ============================================================

CREATE TABLE users (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id       VARCHAR(20)  UNIQUE NOT NULL,
    name              VARCHAR(100) NOT NULL,
    role              VARCHAR(20)  NOT NULL
        CHECK (role IN ('admin_staff','admin_manager','finance','warehouse','receiver')),
    password_hash     VARCHAR(255) NOT NULL,
    avatar_url        VARCHAR(500),
    is_active         BOOLEAN      DEFAULT true,
    last_login_at     TIMESTAMP,
    created_at        TIMESTAMP    DEFAULT NOW(),
    updated_at       TIMESTAMP    DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_employee ON users(employee_id);
CREATE INDEX        idx_users_role     ON users(role);


CREATE TABLE stations (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code     VARCHAR(20)  UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    location         VARCHAR(100) NOT NULL,
    district         VARCHAR(50)  NOT NULL,
    contact_person   VARCHAR(100),
    phone            VARCHAR(20),
    email            VARCHAR(100),
    is_active        BOOLEAN      DEFAULT true,
    created_at       TIMESTAMP    DEFAULT NOW(),
    updated_at       TIMESTAMP    DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_stations_code     ON stations(station_code);
CREATE INDEX        idx_stations_district ON stations(district);


CREATE TABLE receivers (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    receiver_code    VARCHAR(20)  UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    location         VARCHAR(100) NOT NULL,
    district         VARCHAR(50)  NOT NULL,
    contact_person   VARCHAR(100),
    phone            VARCHAR(20),
    email            VARCHAR(100),
    is_active        BOOLEAN      DEFAULT true,
    created_at       TIMESTAMP    DEFAULT NOW(),
    updated_at       TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX idx_receivers_district ON receivers(district);


-- ============================================================
-- SECTION 2: INVENTORY & PRODUCTS
-- ============================================================

CREATE TABLE fertilizers (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    sku              VARCHAR(30)    UNIQUE NOT NULL,
    name             VARCHAR(100)   NOT NULL,
    type             VARCHAR(30)    NOT NULL,
    description      VARCHAR(500),
    npk_values       VARCHAR(20),
    unit_cost        DECIMAL(12,2)  NOT NULL,
    tax_rate         DECIMAL(5,2)   DEFAULT 5.00,
    unit_type        VARCHAR(10)    DEFAULT 'bag',
    unit_weight_kg   DECIMAL(6,2)   DEFAULT 50.00,
    is_active        BOOLEAN        DEFAULT true,
    created_at       TIMESTAMP      DEFAULT NOW(),
    updated_at       TIMESTAMP      DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_fertilizers_sku  ON fertilizers(sku);
CREATE INDEX        idx_fertilizers_type ON fertilizers(type);


CREATE TABLE stock (
    id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    fertilizer_id      UUID           NOT NULL REFERENCES fertilizers(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(50)    DEFAULT 'Main Warehouse',
    available_qty      DECIMAL(12,2)  DEFAULT 0,
    booked_qty         DECIMAL(12,2)  DEFAULT 0,
    prepping_qty       DECIMAL(12,2)  DEFAULT 0,
    total_qty          DECIMAL(12,2)  GENERATED ALWAYS AS (available_qty + booked_qty + prepping_qty) STORED,
    min_threshold_qty  DECIMAL(12,2)  DEFAULT 50.00,
    reorder_level_qty  DECIMAL(12,2)  DEFAULT 100.00,
    last_restocked_at  TIMESTAMP,
    created_at         TIMESTAMP      DEFAULT NOW(),
    updated_at         TIMESTAMP      DEFAULT NOW(),
    UNIQUE (fertilizer_id, warehouse_location)
);
CREATE INDEX idx_stock_fertilizer ON stock(fertilizer_id);
CREATE INDEX idx_stock_warehouse  ON stock(warehouse_location);


-- ============================================================
-- SECTION 3: INVOICES (declared before transport_requests for FK)
-- ============================================================

CREATE TABLE invoices (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_code         VARCHAR(20)    UNIQUE NOT NULL,
    request_id           UUID,
    generated_by_user_id UUID           REFERENCES users(id),
    status               VARCHAR(20)    DEFAULT 'generated'
        CHECK (status IN ('generated','released','declined','paid')),
    subtotal             DECIMAL(14,2)  NOT NULL,
    tax_total            DECIMAL(14,2)  NOT NULL,
    grand_total          DECIMAL(14,2)  NOT NULL,
    payment_method       VARCHAR(20)
        CHECK (payment_method IN ('cash','credit','account')),
    payment_status       VARCHAR(20)    DEFAULT 'pending'
        CHECK (payment_status IN ('pending','paid')),
    paid_at              TIMESTAMP,
    released_at          TIMESTAMP,
    released_by_user_id  UUID           REFERENCES users(id),
    decline_reason       TEXT,
    generated_at         TIMESTAMP      DEFAULT NOW(),
    created_at           TIMESTAMP      DEFAULT NOW(),
    updated_at           TIMESTAMP      DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_invoices_code   ON invoices(invoice_code);
CREATE INDEX        idx_invoices_status ON invoices(status);


-- ============================================================
-- SECTION 4: TRANSPORT REQUESTS
-- ============================================================

CREATE TABLE transport_requests (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code         VARCHAR(20)    UNIQUE NOT NULL,
    origin               VARCHAR(50)    DEFAULT 'Station Portal',
    status               VARCHAR(30)    NOT NULL DEFAULT 'new'
        CHECK (status IN (
            'new','pending_admin_manager','approved','declined',
            'pending_finance','invoiced','invoice_declined',
            'paid','released','booking_stock','prepping',
            'driver_assigned','order_picked_up','delivered'
        )),
    priority             VARCHAR(20)    DEFAULT 'medium'
        CHECK (priority IN ('low','medium','high','critical')),
    station_id           UUID           NOT NULL REFERENCES stations(id),
    receiver_id          UUID           REFERENCES receivers(id),
    created_by_user_id   UUID           REFERENCES users(id),
    assigned_to_user_id  UUID           REFERENCES users(id),
    destination          VARCHAR(100),
    order_created_date   TIMESTAMP,
    sla_deadline         TIMESTAMP,
    subtotal             DECIMAL(14,2)  DEFAULT 0,
    tax_total            DECIMAL(14,2)  DEFAULT 0,
    grand_total          DECIMAL(14,2)  DEFAULT 0,
    invoice_id           UUID           REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_generated_at TIMESTAMP,
    released_at          TIMESTAMP,
    cleared_at           TIMESTAMP,
    stock_booked_at      TIMESTAMP,
    driver_assigned_at   TIMESTAMP,
    picked_up_at         TIMESTAMP,
    delivered_at         TIMESTAMP,
    warehouse_notes      TEXT,
    decline_reason       TEXT,
    route_from           VARCHAR(50),
    route_to             VARCHAR(50),
    route_distance_km    DECIMAL(10,2),
    created_at           TIMESTAMP      DEFAULT NOW(),
    updated_at           TIMESTAMP      DEFAULT NOW()
);
CREATE INDEX idx_requests_status     ON transport_requests(status);
CREATE INDEX idx_requests_station    ON transport_requests(station_id);
CREATE INDEX idx_requests_receiver   ON transport_requests(receiver_id);
CREATE INDEX idx_requests_sla        ON transport_requests(sla_deadline);
CREATE INDEX idx_requests_created_at ON transport_requests(created_at DESC);
CREATE INDEX idx_requests_priority   ON transport_requests(priority);
CREATE INDEX idx_requests_route_from ON transport_requests(route_from);
CREATE INDEX idx_requests_invoice    ON transport_requests(invoice_id);

-- Wire the FK back from invoices to transport_requests
ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_request
    FOREIGN KEY (request_id) REFERENCES transport_requests(id);
CREATE INDEX idx_invoices_request ON invoices(request_id);


-- ============================================================
-- SECTION 5: REQUEST & INVOICE LINE ITEMS
-- ============================================================

CREATE TABLE request_items (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID           NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    fertilizer_id   UUID           REFERENCES fertilizers(id),
    sku             VARCHAR(30)    NOT NULL,
    name            VARCHAR(100)   NOT NULL,
    fertilizer_type VARCHAR(30)    NOT NULL,
    quantity        INTEGER        NOT NULL,
    unit_cost       DECIMAL(12,2)  NOT NULL,
    tax             DECIMAL(12,2)  NOT NULL,
    total           DECIMAL(14,2)  NOT NULL,
    created_at      TIMESTAMP      DEFAULT NOW()
);
CREATE INDEX idx_request_items_request ON request_items(request_id);
CREATE INDEX idx_request_items_sku     ON request_items(sku);


CREATE TABLE invoice_items (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id    UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    fertilizer_id UUID           REFERENCES fertilizers(id),
    sku           VARCHAR(30)    NOT NULL,
    name          VARCHAR(100)   NOT NULL,
    quantity      INTEGER        NOT NULL,
    unit_cost     DECIMAL(12,2)  NOT NULL,
    tax           DECIMAL(12,2)  NOT NULL,
    total         DECIMAL(14,2)  NOT NULL,
    created_at    TIMESTAMP      DEFAULT NOW()
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);


-- ============================================================
-- SECTION 6: DRIVERS & TRANSPORT
-- ============================================================

CREATE TABLE drivers (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID           REFERENCES users(id),
    name                 VARCHAR(100)   NOT NULL,
    phone                VARCHAR(20)    NOT NULL,
    license_plate        VARCHAR(20)    NOT NULL,
    vehicle_type         VARCHAR(30)    NOT NULL,
    capacity_kg          DECIMAL(10,2)  NOT NULL,
    rating               DECIMAL(3,2)   DEFAULT 4.50,
    is_available         BOOLEAN        DEFAULT true,
    current_location_lat DECIMAL(10,8),
    current_location_lng DECIMAL(11,8),
    current_district     VARCHAR(50),
    last_location_update TIMESTAMP,
    created_at           TIMESTAMP      DEFAULT NOW(),
    updated_at           TIMESTAMP      DEFAULT NOW()
);
CREATE INDEX idx_drivers_vehicle      ON drivers(vehicle_type);
CREATE INDEX idx_drivers_location     ON drivers(current_district);
CREATE INDEX idx_drivers_availability ON drivers(is_available);


CREATE TABLE driver_bids (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id        UUID           NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    driver_id         UUID           NOT NULL REFERENCES drivers(id),
    driver_name       VARCHAR(100)   NOT NULL,
    bid_amount        DECIMAL(12,2)  NOT NULL,
    estimated_minutes INTEGER,
    distance_km       DECIMAL(10,2),
    status            VARCHAR(20)    DEFAULT 'pending'
        CHECK (status IN ('pending','accepted','rejected')),
    submitted_at      TIMESTAMP      DEFAULT NOW(),
    created_at        TIMESTAMP      DEFAULT NOW(),
    UNIQUE (request_id, driver_id)
);
CREATE INDEX idx_driver_bids_request ON driver_bids(request_id);
CREATE INDEX idx_driver_bids_driver  ON driver_bids(driver_id);
CREATE INDEX idx_driver_bids_status  ON driver_bids(status);


CREATE TABLE assigned_drivers (
    id                  UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          UUID      NOT NULL REFERENCES transport_requests(id),
    driver_id           UUID      NOT NULL REFERENCES drivers(id),
    assigned_at         TIMESTAMP DEFAULT NOW(),
    assigned_by_user_id UUID      REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_assigned_driver_request ON assigned_drivers(request_id);


-- ============================================================
-- SECTION 7: AUDIT & SESSIONS
-- ============================================================

CREATE TABLE audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(30) NOT NULL,
    entity_id   UUID        NOT NULL,
    user_id     UUID        REFERENCES users(id),
    user_name   VARCHAR(100),
    user_role   VARCHAR(20),
    action      VARCHAR(50) NOT NULL,
    details     TEXT,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    created_at  TIMESTAMP   DEFAULT NOW()
);
CREATE INDEX idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action  ON audit_logs(action);


CREATE TABLE sessions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    created_at  TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_token   ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);


-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stations_updated_at
    BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_receivers_updated_at
    BEFORE UPDATE ON receivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fertilizers_updated_at
    BEFORE UPDATE ON fertilizers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_updated_at
    BEFORE UPDATE ON stock FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transport_requests_updated_at
    BEFORE UPDATE ON transport_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE OR REPLACE FUNCTION calculate_sla_deadline(created_date TIMESTAMP)
RETURNS TIMESTAMP AS $$
BEGIN
    RETURN created_date + INTERVAL '72 hours';
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION audit_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (entity_type, entity_id, user_id, user_name, user_role, action, details)
        VALUES (
            'request', NEW.id,
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

CREATE TRIGGER trg_request_status_audit
    AFTER UPDATE ON transport_requests
    FOR EACH ROW EXECUTE FUNCTION audit_status_change();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_account_access"          ON users      FOR ALL USING (true);
CREATE POLICY "service_account_access_sessions" ON sessions   FOR ALL USING (true);
CREATE POLICY "service_account_access_audit"    ON audit_logs FOR ALL USING (true);


-- ============================================================
-- SEED DATA
-- ============================================================

-- DEV ONLY: password is 'agriflo123'. Regenerate for production:
-- SELECT crypt('yourpassword', gen_salt('bf', 10));
INSERT INTO users (employee_id, name, role, password_hash) VALUES
('ADM001', 'Kasun Perera',       'admin_staff',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.2'),
('MGR001', 'Nimal Fernando',     'admin_manager', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.2'),
('FIN001', 'Dilani Silva',       'finance',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.2'),
('WAR001', 'Ruwan Kumara',       'warehouse',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.2'),
('RCV001', 'Gamage Dissanayake', 'receiver',      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.2');

INSERT INTO stations (station_code, name, location, district, contact_person, phone) VALUES
('STN-1001', 'Colombo Central Station',      'Colombo',    'Colombo',    'Station Manager 1', '+94 11 2000123'),
('STN-1002', 'Kandy District Office',        'Kandy',      'Kandy',      'Station Manager 2', '+94 81 2000124'),
('STN-1003', 'Galle Regional Hub',           'Galle',      'Galle',      'Station Manager 3', '+94 91 2000125'),
('STN-1004', 'Jaffna Branch',                'Jaffna',     'Jaffna',     'Station Manager 4', '+94 21 2000126'),
('STN-1005', 'Matale Supply Point',          'Matale',     'Matale',     'Station Manager 5', '+94 66 2000127'),
('STN-1006', 'Kalutara Distribution Center', 'Kalutara',   'Kalutara',   'Station Manager 6', '+94 34 2000128'),
('STN-1007', 'Gampaha Station',              'Gampaha',    'Gampaha',    'Station Manager 7', '+94 33 2000129'),
('STN-1008', 'Kurunegala Depot',             'Kurunegala', 'Kurunegala', 'Station Manager 8', '+94 37 2000130');

INSERT INTO receivers (receiver_code, name, location, district, contact_person, phone) VALUES
('RCV-2001', 'Anuradhapura Farming Coop',  'Anuradhapura', 'Anuradhapura', 'Coop Manager 1',     '+94 25 2000223'),
('RCV-2002', 'Polonnaruwa Agri Center',    'Polonnaruwa',  'Polonnaruwa',  'Coop Manager 2',     '+94 27 2000224'),
('RCV-2003', 'Hambantota Rice Mill',       'Hambantota',   'Hambantota',   'Mill Manager 1',     '+94 47 2000225'),
('RCV-2004', 'Badulla Plantation Supply',  'Badulla',      'Badulla',      'Plantation Manager', '+94 55 2000226'),
('RCV-2005', 'Ratnapura Agri Depot',       'Ratnapura',    'Ratnapura',    'Depot Manager 1',   '+94 45 2000227'),
('RCV-2006', 'Moneragala Farm Store',   'Moneragala',   'Moneragala',   'Store Manager 1',   '+94 55 2000228'),
('RCV-2007', 'Ampara Irrigation Project','Ampara',      'Ampara',      'Project Manager 1',  '+94 61 2000229'),
('RCV-2008', 'Trincomalee Harbor Storage', 'Trincomalee','Trincomalee','Storage Manager 1','+94 26 2000230');

INSERT INTO fertilizers (sku, name, type, npk_values, unit_cost, tax_rate, unit_weight_kg) VALUES
('FER-UREA-50', 'Urea (46-0-0)',   'Urea', '46-0-0', 4500.00, 5.00, 50.00),
('FER-DAP-50',  'DAP (18-46-0)',  'DAP',  '18-46-0', 8200.00, 5.00, 50.00),
('FER-MOP-50',  'MOP (0-0-60)',  'MOP',  '0-0-60', 6800.00, 5.00, 50.00),
('FER-NPK-50',  'NPK (15-15-15)', 'NPK',  '15-15-15',7500.00, 5.00, 50.00),
('FER-TSP-50',  'TSP (0-46-0)',  'TSP',  '0-46-0', 5200.00, 5.00, 50.00),
('FER-SUL-50',  'Sulphur (90%)', 'Sulphur','0-0-0', 3200.00, 5.00, 50.00);

INSERT INTO stock (fertilizer_id, available_qty, booked_qty, prepping_qty, min_threshold_qty, reorder_level_qty)
SELECT id, 450, 50, 0, 50, 100 FROM fertilizers WHERE type = 'Urea'
UNION ALL
SELECT id, 280, 30, 0, 30, 80 FROM fertilizers WHERE type = 'DAP'
UNION ALL
SELECT id, 180, 20, 0, 25, 60 FROM fertilizers WHERE type = 'MOP'
UNION ALL
SELECT id, 350, 40, 0, 40, 90 FROM fertilizers WHERE type = 'NPK'
UNION ALL
SELECT id, 120, 10, 0, 20, 50 FROM fertilizers WHERE type = 'TSP'
UNION ALL
SELECT id, 90, 5, 0, 10, 30 FROM fertilizers WHERE type = 'Sulphur';

INSERT INTO drivers (name, phone, license_plate, vehicle_type, capacity_kg, rating, current_district) VALUES
('Sunil Wijesinghe',   '+94 77 123 4567', 'CBA-3421', '10-Wheeler', 20000, 4.8, 'Colombo'),
('Mahinda Rathnayake','+94 77 234 5678', 'CBB-7823', '6-Wheeler', 10000, 4.9, 'Kandy'),
('Pradeep Silva',     '+94 77 345 6789', 'CBA-9934', '10-Wheeler', 20000, 4.7, 'Galle'),
('Chamara Bandara',  '+94 77 456 7890', 'CBA-2156', 'Trailer',   30000, 4.6, 'Jaffna'),
('Nuwan Dissanayake',  '+94 77 567 8901', 'CBB-6678', '6-Wheeler', 10000, 4.9, 'Matale'),
('Ajith Gunawardena', '+94 77 678 9012', 'CBA-1122', '10-Wheeler', 20000, 4.5, 'Kalutara'),
('Roshan Perera',    '+94 77 789 0123', 'CBB-3344', '6-Wheeler', 10000, 4.8, 'Gampaha'),
('Lalith Jayasinghe','+94 77 890 1234', 'CBA-5566', 'Trailer',   30000, 4.7, 'Panadura');

-- ============================================================
-- END OF PART 1
-- ============================================================
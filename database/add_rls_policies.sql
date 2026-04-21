-- ============================================================
-- RLS Policies for MVP Demo
-- ============================================================
-- WARNING: These policies allow all operations for authenticated users.
-- This is OK for MVP demo because:
-- 1. The app is internal with authenticated users
-- 2. Supabase Auth is not enabled (using mock login)
-- 
-- For production, implement proper Supabase Auth and use:
--   FOR ALL USING (auth.uid() = created_by_user_id)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fertilizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- MVP Policy: Allow all operations (authenticated users only)
CREATE POLICY "authenticated_access_users" ON users FOR ALL USING (true);
CREATE POLICY "authenticated_access_stations" ON stations FOR ALL USING (true);
CREATE POLICY "authenticated_access_receivers" ON receivers FOR ALL USING (true);
CREATE POLICY "authenticated_access_fertilizers" ON fertilizers FOR ALL USING (true);
CREATE POLICY "authenticated_access_stock" ON stock FOR ALL USING (true);
CREATE POLICY "authenticated_access_transport_requests" ON transport_requests FOR ALL USING (true);
CREATE POLICY "authenticated_access_request_items" ON request_items FOR ALL USING (true);
CREATE POLICY "authenticated_access_invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "authenticated_access_invoice_items" ON invoice_items FOR ALL USING (true);
CREATE POLICY "authenticated_access_drivers" ON drivers FOR ALL USING (true);
CREATE POLICY "authenticated_access_assigned_drivers" ON assigned_drivers FOR ALL USING (true);
CREATE POLICY "authenticated_access_driver_bids" ON driver_bids FOR ALL USING (true);
CREATE POLICY "authenticated_access_sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "authenticated_access_audit" ON audit_logs FOR ALL USING (true);
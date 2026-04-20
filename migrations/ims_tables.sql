-- IMS Database Schema for AgriFlo
-- Run this in Supabase SQL Editor

-- 1. Add new columns to existing fertilizers table
ALTER TABLE fertilizers 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'bag',
ADD COLUMN IF NOT EXISTS unit_weight_kg NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS min_stock_threshold NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create stock_logs table for tracking all stock changes
CREATE TABLE IF NOT EXISTS stock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fertilizer_id UUID REFERENCES fertilizers(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('stock_in', 'stock_out', 'adjustment', 'initial')),
    quantity_before NUMERIC NOT NULL,
    quantity_change NUMERIC NOT NULL,
    quantity_after NUMERIC NOT NULL,
    reason TEXT,
    reference_id TEXT,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_logs_fertilizer_id ON stock_logs(fertilizer_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON stock_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_logs_change_type ON stock_logs(change_type);

-- 4. Create function to log stock changes automatically
CREATE OR REPLACE FUNCTION log_stock_change(
    p_fertilizer_id UUID,
    p_change_type TEXT,
    p_quantity_change NUMERIC,
    p_reason TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL,
    p_performed_by TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock NUMERIC;
    v_quantity_before NUMERIC;
    v_quantity_after NUMERIC;
BEGIN
    -- Get current stock quantity
    SELECT COALESCE(available_qty, 0) INTO v_current_stock
    FROM stock 
    WHERE fertilizer_id = p_fertilizer_id;

    v_quantity_before := COALESCE(v_current_stock, 0);
    v_quantity_after := v_quantity_before + p_quantity_change;

    -- Prevent negative stock
    IF v_quantity_after < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative. Current: %, Requested change: %', v_quantity_before, p_quantity_change;
    END IF;

    -- Insert log entry
    INSERT INTO stock_logs (
        fertilizer_id,
        product_name,
        product_sku,
        change_type,
        quantity_before,
        quantity_change,
        quantity_after,
        reason,
        reference_id,
        performed_by
    )
    SELECT 
        p_fertilizer_id,
        f.name,
        f.sku,
        p_change_type,
        v_quantity_before,
        p_quantity_change,
        v_quantity_after,
        p_reason,
        p_reference_id,
        p_performed_by
    FROM fertilizers f
    WHERE f.id = p_fertilizer_id;
END;
$$;

-- 5. Create view for stock with logs
CREATE OR REPLACE VIEW v_stock_with_logs AS
SELECT 
    f.id as fertilizer_id,
    f.sku,
    f.name,
    f.type as fertilizer_type,
    f.category,
    f.unit,
    f.unit_weight_kg,
    f.min_stock_threshold,
    f.unit_cost,
    COALESCE(s.available_qty, 0) as available_qty,
    COALESCE(s.booked_qty, 0) as booked_qty,
    COALESCE(s.prepping_qty, 0) as prepping_qty,
    COALESCE(s.total_qty, 0) as total_qty,
    CASE 
        WHEN COALESCE(s.available_qty, 0) <= 0 THEN 'out_of_stock'
        WHEN COALESCE(s.available_qty, 0) <= f.min_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status,
    f.is_active,
    f.created_at,
    f.updated_at
FROM fertilizers f
LEFT JOIN stock s ON s.fertilizer_id = f.id
WHERE f.is_active = true;

-- 6. Insert sample fertilizers if table is empty
INSERT INTO fertilizers (sku, name, type, category, unit, unit_weight_kg, unit_cost, min_stock_threshold, is_active)
SELECT * FROM (VALUES
    ('FER-UREA-50', 'Urea (46-0-0)', 'Urea', 'Nitrogen', 'bag', 50, 4500, 20, true),
    ('FER-DAP-50', 'DAP (18-46-0)', 'DAP', 'Phosphate', 'bag', 50, 8200, 15, true),
    ('FER-MOP-50', 'MOP (0-0-60)', 'MOP', 'Potassium', 'bag', 50, 6800, 15, true),
    ('FER-NPK-50', 'NPK (15-15-15)', 'NPK', 'Compound', 'bag', 50, 7500, 20, true),
    ('FER-TSP-50', 'TSP (0-46-0)', 'TSP', 'Phosphate', 'bag', 50, 5200, 10, true),
    ('FER-SUL-50', 'Sulphur (90%)', 'Sulphur', 'Other', 'bag', 50, 3200, 10, true)
) AS v(sku, name, type, category, unit, unit_weight_kg, unit_cost, min_stock_threshold, is_active)
WHERE NOT EXISTS (SELECT 1 FROM fertilizers WHERE sku = v.sku);

-- 7. Initialize stock for new fertilizers
INSERT INTO stock (fertilizer_id, available_qty, booked_qty, prepping_qty)
SELECT f.id, 0, 0, 0
FROM fertilizers f
WHERE NOT EXISTS (SELECT 1 FROM stock WHERE fertilizer_id = f.id)
ON CONFLICT DO NOTHING;

-- 8. Create initial stock log entries for existing stock
INSERT INTO stock_logs (fertilizer_id, product_name, product_sku, change_type, quantity_before, quantity_change, quantity_after, reason, performed_by)
SELECT 
    f.id,
    f.name,
    f.sku,
    'initial',
    0,
    COALESCE(s.total_qty, 0),
    COALESCE(s.total_qty, 0),
    'Initial stock setup',
    'System'
FROM fertilizers f
LEFT JOIN stock s ON s.fertilizer_id = f.id
WHERE NOT EXISTS (
    SELECT 1 FROM stock_logs sl WHERE sl.fertilizer_id = f.id AND sl.change_type = 'initial'
)
AND COALESCE(s.total_qty, 0) > 0;

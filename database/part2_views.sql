-- ============================================================
-- AgriFlo Schema v2.3 — PART 2 of 2: Views
-- Run this after part1_tables.sql succeeds
-- ============================================================


-- View: Full request details for dashboards
CREATE VIEW v_request_details AS
SELECT
    tr.id,
    tr.request_code,
    tr.status,
    tr.priority,
    tr.created_at,
    tr.sla_deadline,
    tr.grand_total,
    s.name                                                  AS station_name,
    s.district                                              AS station_district,
    r.name                                                  AS receiver_name,
    r.district                                              AS receiver_district,
    tr.route_distance_km, CASE
        WHEN tr.status IN ('delivered','declined','invoice_declined') THEN false
        WHEN tr.sla_deadline IS NULL THEN false
        ELSE NOW() > tr.sla_deadline
    END                                                     AS is_overdue,
    EXTRACT(EPOCH FROM (NOW() - tr.created_at)) / 3600     AS hours_since_created
FROM transport_requests tr
LEFT JOIN stations  s ON s.id = tr.station_id
LEFT JOIN receivers r ON r.id = tr.receiver_id;


-- View: Stock levels with status indicators
CREATE VIEW v_stock_with_status AS
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
        WHEN s.available_qty <= s.min_threshold_qty        THEN 'critical'
        WHEN s.available_qty <= s.reorder_level_qty        THEN 'low'
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


-- View: Request counts grouped by status
CREATE VIEW v_requests_by_status AS
SELECT
    tr.status                                                        AS request_status,
    COUNT(tr.id)                                                     AS request_count,
    SUM(tr.grand_total)                                              AS total_value,
    AVG(EXTRACT(EPOCH FROM (NOW() - tr.created_at)) / 3600)         AS avg_age_hours
FROM transport_requests tr
WHERE tr.status NOT IN ('delivered','declined','invoice_declined')
GROUP BY tr.status;


-- View: Finance dashboard summary
CREATE VIEW v_finance_summary AS
SELECT
    COUNT(tr.id) FILTER (WHERE tr.status = 'pending_finance')                        AS pending_invoicing,
    COUNT(tr.id) FILTER (WHERE tr.status = 'invoiced')                               AS invoiced_awaiting_payment,
    COUNT(tr.id) FILTER (WHERE tr.status = 'paid')                                   AS paid_awaiting_release,
    COALESCE(SUM(tr.grand_total) FILTER (WHERE tr.status = 'invoiced'), 0)           AS pending_revenue,
    COUNT(tr.id) FILTER (
        WHERE tr.status = 'delivered'
        AND tr.created_at >= CURRENT_DATE - INTERVAL '30 days'
    )                                                                                 AS delivered_last_30_days
FROM transport_requests tr;


-- View: Warehouse workload by status
CREATE VIEW v_warehouse_workload AS
SELECT
    tr.status                        AS request_status,
    COUNT(DISTINCT tr.id)            AS requests_count,
    COALESCE(SUM(ri.quantity), 0)    AS total_bags,
    COUNT(DISTINCT ad.driver_id)     AS active_drivers
FROM transport_requests tr
LEFT JOIN request_items    ri ON ri.request_id = tr.id
LEFT JOIN assigned_drivers ad ON ad.request_id = tr.id
WHERE tr.status IN ('booking_stock','prepping','driver_assigned','order_picked_up')
GROUP BY tr.status;


-- View: SLA monitoring dashboard
CREATE VIEW v_sla_monitoring AS
SELECT
    tr.id,
    tr.request_code,
    tr.status,
    tr.priority,
    tr.sla_deadline,
    CASE
        WHEN tr.sla_deadline IS NULL             THEN 'NO_DEADLINE'
        WHEN NOW() > tr.sla_deadline             THEN 'OVERDUE'
        WHEN tr.sla_deadline - NOW() < INTERVAL '24 hours' THEN 'AT_RISK'
        ELSE 'ON_TRACK'
    END                                                          AS sla_status,
    CASE
        WHEN tr.sla_deadline IS NULL THEN NULL
        ELSE EXTRACT(EPOCH FROM (tr.sla_deadline - NOW())) / 3600
    END                                                          AS hours_remaining
FROM transport_requests tr
WHERE tr.status NOT IN ('delivered','declined','invoice_declined');

-- ============================================================
-- END OF PART 2
-- ============================================================
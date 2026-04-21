import os
import sys
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://yodbstzhhihmndnfitvj.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZGJzdHpoaGlobW5kbmZpdHZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU5OTY2MywiZXhwIjoyMDkyMTc1NjYzfQ.aETWjqgENVhCQhHHMQcSlnbURp_XfPCAq4CZR91rkEY")

def get_table_count(supabase, table):
    return supabase.table(table).select("*", count="exact", head=True).execute().count

def main():
    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("\n=== Checking existing data ===")
    tables = ["users", "stations", "fertilizers", "stock", "drivers", "transport_requests", "request_items", "invoices"]
    table_counts = {}
    for t in tables:
        count = get_table_count(supabase, t)
        table_counts[t] = count
        print(f"  {t}: {count}")
    
    users = supabase.table("users").select("*").execute().data
    stations = supabase.table("stations").select("*").execute().data
    fertilizers = supabase.table("fertilizers").select("*").execute().data
    
    print("\n=== Seeding Transport Requests ===")
    
    statuses = [
        ("new", 3),
        ("pending_admin_manager", 2),
        ("approved", 2),
        ("declined", 1),
        ("pending_finance", 1),
        ("invoiced", 2),
        ("released", 2),
        ("booking_stock", 1),
        ("prepping", 2),
    ]
    
    transport_requests = []
    station_ids = [s["id"] for s in stations]
    user_ids = [u["id"] for u in users]
    
    base_date = datetime.now() - timedelta(days=15)
    
    for idx, (status, count) in enumerate(statuses):
        for c in range(count):
            req_num = len(transport_requests) + 1
            station = stations[req_num % len(stations)]
            created_by = user_ids[req_num % len(user_ids)]
            
            created_at = base_date + timedelta(days=(req_num // 2))
            sla_deadline = created_at + timedelta(hours=72)
            
            req_data = {
                "request_code": f"TR-{2024000 + req_num:06d}",
                "origin": "Station Portal",
                "status": status,
                "priority": ["low", "medium", "high", "critical"][req_num % 4],
                "station_id": station["id"],
                "created_by_user_id": created_by,
                "destination": station["name"],
                "order_created_date": created_at.isoformat(),
                "sla_deadline": sla_deadline.isoformat(),
                "created_at": created_at.isoformat(),
                "route_from": "Main Warehouse",
                "route_to": station["location"],
                "route_distance_km": 10.0 + (req_num * 5.5),
            }
            
            if status in ["approved", "declined", "pending_finance", "invoiced", "released", "booking_stock", "prepping"]:
                admin_manager_ids = [u["id"] for u in users if u["role"] == "admin_manager"]
                if admin_manager_ids:
                    req_data["assigned_to_user_id"] = admin_manager_ids[req_num % len(admin_manager_ids)]
            
            transport_requests.append(req_data)
    
    tr_response = supabase.table("transport_requests").insert(transport_requests).execute()
    trs = tr_response.data
    print(f"Inserted {len(trs)} transport requests")
    
    print("\n=== Seeding Request Items ===")
    request_items = []
    
    items_by_status = {
        "new": [(0, 100), (1, 50)],
        "pending_admin_manager": [(2, 80), (3, 40)],
        "approved": [(4, 60), (5, 30)],
        "declined": [(0, 20)],
        "pending_finance": [(0, 120), (2, 60)],
        "invoiced": [(1, 90)],
        "released": [(3, 75), (4, 35)],
        "booking_stock": [(5, 100)],
        "prepping": [(0, 50), (1, 25)],
    }
    
    for tr in trs:
        status = tr["status"]
        items = items_by_status.get(status, [(0, 50)])
        
        subtotal = 0
        tax_total = 0
        
        for fer_idx, qty in items:
            fer = fertilizers[fer_idx]
            total = float(fer["unit_cost"]) * qty
            tax = total * (float(fer["tax_rate"]) / 100)
            
            request_items.append({
                "request_id": tr["id"],
                "fertilizer_id": fer["id"],
                "sku": fer["sku"],
                "fertilizer_type": fer["type"],
                "name": fer["name"],
                "quantity": qty,
                "unit_cost": fer["unit_cost"],
                "tax": tax,
                "total": total + tax,
            })
            
            subtotal += total
            tax_total += tax
        
        supabase.table("transport_requests").update({
            "subtotal": subtotal,
            "tax_total": tax_total,
            "grand_total": subtotal + tax_total
        }).eq("id", tr["id"]).execute()
    
    ri_response = supabase.table("request_items").insert(request_items).execute()
    print(f"Inserted {len(ri_response.data)} request items")
    
    print("\n=== Seeding Invoices ===")
    invoiced_statuses = ["invoiced", "released"]
    
    invoices_data = []
    invoice_idx = 0
    
    for status in invoiced_statuses:
        matching_trs = [tr for tr in trs if tr["status"] == status]
        for tr in matching_trs:
            invoice_idx += 1
            inv_code = f"INV-2024{invoice_idx:04d}"
            
            invoices_data.append({
                "invoice_code": inv_code,
                "request_id": tr["id"],
                "generated_by_user_id": user_ids[invoice_idx % len(user_ids)],
                "status": "generated" if status == "invoiced" else "released",
                "subtotal": tr["subtotal"],
                "tax_total": tr["tax_total"],
                "grand_total": tr["grand_total"],
            })
    
    inv_response = supabase.table("invoices").insert(invoices_data).execute()
    print(f"Inserted {len(inv_response.data)} invoices")
    
    print("\n=== Verifying Counts ===")
    tables = ["users", "stations", "fertilizers", "stock", "drivers", "transport_requests", "request_items", "invoices"]
    for table in tables:
        response = supabase.table(table).select("*", count="exact", head=True).execute()
        print(f"  {table}: {response.count} rows")
    
    # Verify by status
    print("\n=== Requests by Status ===")
    tr_all = supabase.table("transport_requests").select("status").execute().data
    from collections import Counter
    status_counts = Counter([tr["status"] for tr in tr_all])
    for s, c in status_counts.items():
        print(f"  {s}: {c}")
    
    print("\n=== Seed Complete ===")

if __name__ == "__main__":
    main()
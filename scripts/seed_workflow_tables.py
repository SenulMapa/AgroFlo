import os
import sys
import uuid
import secrets
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://yodbstzhhihmndnfitvj.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZGJzdHpoaGlobW5kbmZpdHZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjU5OTY2MywiZXhwIjoyMDkyMTc1NjYzfQ.aETWjqgENVhCQhHHMQcSlnbURp_XfPCAq4CZR91rkEY")

def get_table_count(supabase, table):
    return supabase.table(table).select("*", count="exact", head=True).execute().count

def get_bid_amount():
    return round(5000 + (secrets.randbelow(20) * 1000), 2)

def main():
    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("\n=== Current DB State ===")
    tables = ["transport_requests", "request_items", "invoices", "assigned_drivers", "audit_logs", "driver_bids", "invoice_items", "sessions"]
    for t in tables:
        count = get_table_count(supabase, t)
        print(f"  {t}: {count}")
    
    trs = supabase.table("transport_requests").select("id, request_code, status").execute().data
    invoices = supabase.table("invoices").select("*").execute().data
    users = supabase.table("users").select("*").execute().data
    drivers = supabase.table("drivers").select("*").execute().data
    fertilizers = supabase.table("fertilizers").select("*").execute().data
    
    print("\n=== Seeding Driver Bids ===")
    
    bid_statuses = ["approved", "pending_finance", "invoiced", "released", "booking_stock"]
    driver_bids = []
    
    sri_lankan_names = [
        "Saman Jayasinghe", "Kasun Fernando", "Nuwan Perera", "Chamara Silva", 
        "Lasith Wickramasinghe", "Dimuthu Rajapaksa", "Hasitha Gunawardena",
        "Madushan Fernando", "Thilina Jayasinghe", "Thusitha Mendis"
    ]
    vehicle_types = ["10-Wheeler", "6-Wheeler", "Trailer"]
    license_prefixes = ["WP", "CP", "SP", "NP", "EP", "LP", "ND", "JY"]
    
    bid_id = 0
    for tr in trs:
        if tr["status"] in bid_statuses:
            bid_id += 1
            num_bids = 2 if bid_id % 3 != 0 else 3
            
            available_drivers = drivers.copy()
            for bid_num in range(num_bids):
                if not available_drivers:
                    break
                driver = available_drivers.pop(secrets.randbelow(len(available_drivers)))
                bid_amount = get_bid_amount()
                
                driver_bids.append({
                    "request_id": tr["id"],
                    "driver_id": driver["id"],
                    "driver_name": driver["name"],
                    "vehicle_type": driver["vehicle_type"],
                    "license_plate": driver["license_plate"],
                    "bid_amount": bid_amount,
                    "bid_status": "pending" if bid_num > 0 else ("accepted" if tr["status"] in ["released", "booking_stock"] else "pending"),
                    "created_at": datetime.now().isoformat(),
                })
    
    bid_response = supabase.table("driver_bids").insert(driver_bids).execute()
    print(f"Inserted {len(bid_response.data)} driver bids")
    
    print("\n=== Seeding Assigned Drivers ===")
    
    assign_statuses = ["released", "booking_stock", "prepping", "shipped", "driver_assigned"]
    assigned_drivers = []
    
    assign_count = 0
    for tr in trs:
        if tr["status"] in assign_statuses:
            assign_count += 1
            driver = drivers[assign_count % len(drivers)]
            
            assigned_drivers.append({
                "request_id": tr["id"],
                "driver_id": driver["id"],
                "status": "assigned",
                "assigned_at": datetime.now().isoformat(),
                "estimated_arrival": (datetime.now() + timedelta(hours=48)).isoformat(),
                "vehicle_type": driver["vehicle_type"],
                "license_plate": driver["license_plate"],
                "driver_contact": "+94" + str(700000000 + secrets.randbelow(99999999)),
                "notes": f"Driver assigned for delivery to destination",
            })
            
            supabase.table("transport_requests").update({
                "status": "driver_assigned"
            }).eq("id", tr["id"]).execute()
    
    ad_response = supabase.table("assigned_drivers").insert(assigned_drivers).execute()
    print(f"Inserted {len(ad_response.data)} assigned drivers")
    
    print("\n=== Seeding Audit Logs ===")
    
    audit_actions = [
        ("request_created", "New transport request created"),
        ("status_change", "Status changed"),
        ("assigned_to_changed", "Request assigned to manager"),
        ("invoice_generated", "Invoice generated"),
        ("driver_assigned", "Driver assigned"),
        ("released", "Request released"),
        ("booking_stock", "Stock booking initiated"),
        ("prepping", "Preparation started"),
        ("shipped", "Shipment in transit"),
    ]
    
    audit_logs = []
    audit_idx = 0
    
    for tr in trs:
        audit_idx += 1
        created_user = users[audit_idx % len(users)]
        
        audit_logs.append({
            "request_id": tr["id"],
            "user_id": created_user["id"],
            "user_name": created_user["name"],
            "user_role": created_user["role"],
            "action": "request_created",
            "description": f"Transport request {tr['request_code']} created",
            "created_at": (datetime.now() - timedelta(days=10)).isoformat(),
        })
        
        if tr["status"] != "new":
            admin_mgr_users = [u for u in users if u["role"] == "admin_manager"]
            if admin_mgr_users:
                audit_logs.append({
                    "request_id": tr["id"],
                    "user_id": admin_mgr_users[0]["id"],
                    "user_name": admin_mgr_users[0]["name"],
                    "user_role": "admin_manager",
                    "action": "status_change",
                    "description": f"Status changed to {tr['status']}",
                    "created_at": (datetime.now() - timedelta(days=8)).isoformat(),
                })
            
            if tr["status"] in ["invoiced", "released"]:
                finance_users = [u for u in users if u["role"] == "finance"]
                if finance_users:
                    audit_logs.append({
                        "request_id": tr["id"],
                        "user_id": finance_users[0]["id"],
                        "user_name": finance_users[0]["name"],
                        "user_role": "finance",
                        "action": "invoice_generated",
                        "description": f"Invoice generated for request",
                        "created_at": (datetime.now() - timedelta(days=5)).isoformat(),
                    })
            
            if tr["status"] in assign_statuses:
                wh_users = [u for u in users if u["role"] == "warehouse"]
                if wh_users:
                    audit_logs.append({
                        "request_id": tr["id"],
                        "user_id": wh_users[0]["id"],
                        "user_name": wh_users[0]["name"],
                        "user_role": "warehouse",
                        "action": "driver_assigned",
                        "description": f"Driver assigned for delivery",
                        "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
                    })
    
    audit_response = supabase.table("audit_logs").insert(audit_logs).execute()
    print(f"Inserted {len(audit_response.data)} audit logs")
    
    print("\n=== Seeding Invoice Items ===")
    
    invoice_items = []
    
    for inv in invoices:
        inv_items = [ri for ri in supabase.table("request_items").select("*").eq("request_id", inv["request_id"]).execute().data]
        
        for item in inv_items:
            invoice_items.append({
                "invoice_id": inv["id"],
                "fertilizer_id": item["fertilizer_id"],
                "fertilizer_name": item["name"],
                "sku": item["sku"],
                "quantity": item["quantity"],
                "unit_cost": item["unit_cost"],
                "tax": item["tax"],
                "total": item["total"],
            })
    
    ii_response = supabase.table("invoice_items").insert(invoice_items).execute()
    print(f"Inserted {len(ii_response.data)} invoice items")
    
    print("\n=== Seeding Sessions ===")
    
    sessions = []
    
    for user in users:
        sessions.append({
            "user_id": user["id"],
            "session_token": secrets.token_urlsafe(32),
            "created_at": (datetime.now() - timedelta(hours=secrets.randbelow(48))).isoformat(),
            "expires_at": (datetime.now() + timedelta(hours=secrets.randbelow(72) + 24)).isoformat(),
            "ip_address": f"192.168.{secrets.randbelow(256)}.{secrets.randbelow(256)}",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "is_active": True,
        })
    
    sess_response = supabase.table("sessions").insert(sessions).execute()
    print(f"Inserted {len(sess_response.data)} sessions")
    
    print("\n=== Final Verifying Counts ===")
    tables = ["transport_requests", "request_items", "invoices", "assigned_drivers", "audit_logs", "driver_bids", "invoice_items", "sessions"]
    for t in tables:
        count = get_table_count(supabase, t)
        print(f"  {t}: {count}")
    
    print("\n=== Seed Complete ===")

if __name__ == "__main__":
    main()
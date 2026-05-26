#!/usr/bin/env python3
"""
Simple demo data setup script for test@test.com account
Usage: python setup_demo_data.py
"""

import os
import sys
from datetime import datetime, timezone
from supabase import create_client
from app.core.config import settings

# Demo account credentials
DEMO_EMAIL = "test@test.com"
DEMO_PASSWORD = "417230"

print("🔧 Setting up demo data for LoadMind")
print("=" * 60)

try:
    # Initialize Supabase client
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    print("✓ Connected to Supabase")
    
    # Step 1: Create or get user
    print("\n[STEP 1] Creating/Finding Auth User...")
    try:
        # Try to create user
        user = supabase.auth.admin.create_user(
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            email_confirm=True
        )
        user_id = user.id
        print(f"✓ Created new user: {DEMO_EMAIL}")
    except Exception as e:
        if "already registered" in str(e).lower():
            # User exists, find them
            response = supabase.auth.admin.list_users()
            user_id = None
            for user in response.users:
                if user.email == DEMO_EMAIL:
                    user_id = user.id
                    break
            if user_id:
                print(f"✓ Found existing user: {DEMO_EMAIL}")
            else:
                print(f"✗ Could not find user: {DEMO_EMAIL}")
                sys.exit(1)
        else:
            raise
    
    print(f"  User ID: {user_id}")
    
    # Step 2: Create user roles
    print("\n[STEP 2] Creating User Roles...")
    try:
        # Check for existing roles
        existing = supabase.table("user_roles").select("*").eq("user_id", user_id).execute()
        existing_roles = {r["role"] for r in existing.data}
        
        if "shipper" not in existing_roles:
            supabase.table("user_roles").insert({
                "user_id": user_id,
                "role": "shipper"
            }).execute()
            print("✓ Created shipper role")
        else:
            print("✓ Shipper role already exists")
        
        if "carrier" not in existing_roles:
            supabase.table("user_roles").insert({
                "user_id": user_id,
                "role": "carrier"
            }).execute()
            print("✓ Created carrier role")
        else:
            print("✓ Carrier role already exists")
    except Exception as e:
        print(f"✗ Error creating roles: {e}")
    
    # Step 3: Create demo vehicles
    print("\n[STEP 3] Creating Demo Vehicles...")
    vehicles = [
        {
            "carrier_id": user_id,
            "unit_id": "DEMO-VEH-001",
            "status": "idle",
            "capacity_t": 25.0,
            "model": "Volvo FH16",
            "trailers": [
                {
                    "id": "DEMO-TRAILER-001",
                    "type": "box",
                    "length_m": 13.6,
                    "width_m": 2.5,
                    "height_m": 2.7
                }
            ]
        },
        {
            "carrier_id": user_id,
            "unit_id": "DEMO-VEH-002",
            "status": "idle",
            "capacity_t": 20.0,
            "model": "Scania R440",
            "trailers": [
                {
                    "id": "DEMO-TRAILER-002",
                    "type": "flatbed",
                    "length_m": 12.5,
                    "width_m": 2.4,
                    "height_m": 2.2
                }
            ]
        }
    ]
    
    try:
        existing_vehicles = supabase.table("vehicles").select("unit_id").eq("carrier_id", user_id).execute()
        existing_ids = {v["unit_id"] for v in existing_vehicles.data}
        
        for vehicle in vehicles:
            if vehicle["unit_id"] not in existing_ids:
                supabase.table("vehicles").insert(vehicle).execute()
                print(f"✓ Created vehicle: {vehicle['unit_id']} ({vehicle['capacity_t']}T)")
            else:
                print(f"✓ Vehicle already exists: {vehicle['unit_id']}")
    except Exception as e:
        print(f"✗ Error creating vehicles: {e}")
    
    # Step 4: Create demo shipments
    print("\n[STEP 4] Creating Demo Shipments...")
    loads = [
        {
            "shipper_id": user_id,
            "shipment_code": "DEMO-MEL-CBD-001",
            "cargo": "Electronics & Appliances",
            "weight_kg": 5000,
            "volume_m3": 12.5,
            "pickup": "123 Manufacturing St, Dandenong, VIC 3175, Australia",
            "delivery": "456 Retail Ave, Melbourne CBD, VIC 3000, Australia",
            "pickup_time": "2026-05-27T08:00:00Z",
            "delivery_time": "2026-05-27T12:00:00Z",
            "status": "open",
            "match_score": 95,
            "empty_miles_saved": 150,
            "ai_reasoning": "High-value electronics shipment with immediate pickup"
        },
        {
            "shipper_id": user_id,
            "shipment_code": "DEMO-SYD-NBR-001",
            "cargo": "Automotive Parts",
            "weight_kg": 8500,
            "volume_m3": 18.0,
            "pickup": "789 Industrial Way, Western Sydney, NSW 2154, Australia",
            "delivery": "321 Auto Blvd, Newcastle, NSW 2300, Australia",
            "pickup_time": "2026-05-27T10:00:00Z",
            "delivery_time": "2026-05-27T18:00:00Z",
            "status": "open",
            "match_score": 88,
            "empty_miles_saved": 280,
            "ai_reasoning": "Regional automotive parts distribution"
        },
        {
            "shipper_id": user_id,
            "shipment_code": "DEMO-BNE-GC-001",
            "cargo": "Furniture & Home Goods",
            "weight_kg": 3200,
            "volume_m3": 22.0,
            "pickup": "555 Warehouse Rd, Brisbane West, QLD 4014, Australia",
            "delivery": "888 Coastal Mall, Gold Coast, QLD 4217, Australia",
            "pickup_time": "2026-05-28T09:00:00Z",
            "delivery_time": "2026-05-28T16:00:00Z",
            "status": "open",
            "match_score": 92,
            "empty_miles_saved": 220,
            "ai_reasoning": "Large furniture consolidation shipment"
        },
        {
            "shipper_id": user_id,
            "shipment_code": "DEMO-MEL-ADL-001",
            "cargo": "Food & Beverage",
            "weight_kg": 4100,
            "volume_m3": 9.5,
            "pickup": "222 Distribution Centre, Coburg, VIC 3058, Australia",
            "delivery": "333 Retail Park, Adelaide, SA 5000, Australia",
            "pickup_time": "2026-05-28T06:00:00Z",
            "delivery_time": "2026-05-29T08:00:00Z",
            "status": "open",
            "match_score": 85,
            "empty_miles_saved": 320,
            "ai_reasoning": "Food and beverage consolidation shipment"
        }
    ]
    
    try:
        existing_loads = supabase.table("loads").select("shipment_code").eq("shipper_id", user_id).execute()
        existing_codes = {l["shipment_code"] for l in existing_loads.data}
        
        for load in loads:
            if load["shipment_code"] not in existing_codes:
                supabase.table("loads").insert(load).execute()
                print(f"✓ Created shipment: {load['shipment_code']} ({load['weight_kg']}kg)")
            else:
                print(f"✓ Shipment already exists: {load['shipment_code']}")
    except Exception as e:
        print(f"✗ Error creating shipments: {e}")
    
    # Step 5: Verify data
    print("\n[STEP 5] Verifying Created Data...")
    
    roles = supabase.table("user_roles").select("*").eq("user_id", user_id).execute()
    print(f"✓ User Roles: {len(roles.data)} ({', '.join(r['role'] for r in roles.data)})")
    
    vehicles_result = supabase.table("vehicles").select("*").eq("carrier_id", user_id).execute()
    print(f"✓ Vehicles: {len(vehicles_result.data)}")
    for v in vehicles_result.data:
        print(f"  - {v['unit_id']} ({v['capacity_t']}T capacity)")
    
    loads_result = supabase.table("loads").select("*").eq("shipper_id", user_id).execute()
    print(f"✓ Shipments: {len(loads_result.data)}")
    for l in loads_result.data:
        print(f"  - {l['shipment_code']}: {l['cargo']} ({l['weight_kg']}kg)")
    
    print("\n" + "=" * 60)
    print("✨ Demo data setup complete!")
    print("\n🚀 Next Steps:")
    print("  1. Go to http://localhost:8080")
    print("  2. Click 'Sign In'")
    print("  3. Enter: test@test.com / 417230")
    print("  4. Select 'Shipper' or 'Carrier' role")
    print("\n📊 You now have:")
    print("  - 2 demo vehicles (DEMO-VEH-001, DEMO-VEH-002)")
    print("  - 4 demo shipments (DEMO-MEL-CBD-001, etc.)")
    print("  - Both Shipper and Carrier roles")
    print("=" * 60)

except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

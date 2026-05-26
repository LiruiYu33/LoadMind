"""
USAGE:
  cd Backend
  source .venv/bin/activate
  python3.11 create_all_demo_data.py test@test.com 417230
"""

import sys
from datetime import datetime, timezone
from supabase import create_client
from app.core.config import settings

# ============================================
# CONFIGURATION
# ============================================

DEMO_EMAIL = "test@test.com"
DEMO_PASSWORD = "417230"

# Use from command line args or defaults
if len(sys.argv) > 1:
    DEMO_EMAIL = sys.argv[1]
if len(sys.argv) > 2:
    DEMO_PASSWORD = sys.argv[2]

# Initialize Supabase client
supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

print(f"🔧 Creating demo data for: {DEMO_EMAIL}")
print("=" * 60)

# ============================================
# STEP 1: GET OR CREATE AUTH USER
# ============================================

print("\n[STEP 1] Finding/Creating Auth User...")

try:
    # List all users to find our test user
    response = supabase.auth.admin.list_users()
    
    user_id = None
    for user in response.users:
        if user.email == DEMO_EMAIL:
            user_id = user.id
            print(f"✓ Found existing user: {DEMO_EMAIL}")
            print(f"  User ID: {user_id}")
            break
    
    # If user doesn't exist, create one
    if not user_id:
        print("✗ User not found, creating new user...")
        user = supabase.auth.admin.create_user(
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            email_confirm=True  # Auto-confirm
        )
        user_id = user.id
        print(f"✓ Created user: {DEMO_EMAIL}")
        print(f"  User ID: {user_id}")

except Exception as e:
    print(f"✗ Error with auth user: {e}")
    print("  Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env")
    sys.exit(1)

# ============================================
# STEP 2: CREATE USER ROLES (Shipper + Carrier)
# ============================================

print("\n[STEP 2] Creating User Roles...")

try:
    # Check if roles already exist
    existing_roles = supabase.table("user_roles").select("*").eq(
        "user_id", user_id
    ).execute()
    
    has_shipper = any(r["role"] == "shipper" for r in existing_roles.data)
    has_carrier = any(r["role"] == "carrier" for r in existing_roles.data)
    
    # Create shipper role if missing
    if not has_shipper:
        supabase.table("user_roles").insert({
            "user_id": user_id,
            "role": "shipper"
        }).execute()
        print("✓ Created shipper role")
    else:
        print("✓ Shipper role already exists")
    
    # Create carrier role if missing
    if not has_carrier:
        supabase.table("user_roles").insert({
            "user_id": user_id,
            "role": "carrier"
        }).execute()
        print("✓ Created carrier role")
    else:
        print("✓ Carrier role already exists")

except Exception as e:
    print(f"✗ Error creating roles: {e}")
    sys.exit(1)

# ============================================
# STEP 3: CREATE DEMO VEHICLES
# ============================================

print("\n[STEP 3] Creating Demo Vehicles...")

vehicles = [
    {
        "carrier_id": user_id,
        "unit_id": "DEMO-VEH-001",
        "status": "idle",
        "capacity_t": 25.0,
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
    # Check for existing vehicles
    existing_vehicles = supabase.table("vehicles").select("unit_id").eq(
        "carrier_id", user_id
    ).execute()
    
    existing_unit_ids = {v["unit_id"] for v in existing_vehicles.data}
    
    for vehicle in vehicles:
        if vehicle["unit_id"] not in existing_unit_ids:
            supabase.table("vehicles").insert(vehicle).execute()
            print(f"✓ Created vehicle: {vehicle['unit_id']} ({vehicle['capacity_t']}T)")
        else:
            print(f"✓ Vehicle already exists: {vehicle['unit_id']}")

except Exception as e:
    print(f"✗ Error creating vehicles: {e}")
    sys.exit(1)

# ============================================
# STEP 4: CREATE DEMO SHIPMENTS
# ============================================

print("\n[STEP 4] Creating Demo Shipments...")

loads = [
    {
        "shipper_id": user_id,
        "shipment_code": "DEMO-MEL-CBD-001",
        "cargo": "Palletized office equipment",
        "origin": "Clayton, Victoria, 3168, Australia",
        "destination": "Melbourne, Victoria, 3000, Australia",
        "route_origin": "Clayton, Victoria, 3168, Australia",
        "route_destination": "Melbourne, Victoria, 3000, Australia",
        "weight_kg": 8000,
        "load_type": "Packaged Consumer Goods",
        "length_cm": 200,
        "width_cm": 120,
        "height_cm": 180,
        "pickup_time": "2026-05-27T08:00:00Z",
        "dropoff_time": "2026-05-27T12:00:00Z",
        "value": 450,
        "status": "open",
        "match_score": 89,
        "empty_miles_saved": 45,
        "ai_reasoning": "Office equipment from Clayton - high pickup certainty"
    },
    {
        "shipper_id": user_id,
        "shipment_code": "DEMO-MEL-GEE-002",
        "cargo": "Electronics and appliances",
        "origin": "Melbourne, Victoria, 3000, Australia",
        "destination": "Geelong, Victoria, 3220, Australia",
        "route_origin": "Melbourne, Victoria, 3000, Australia",
        "route_destination": "Geelong, Victoria, 3220, Australia",
        "weight_kg": 12000,
        "load_type": "Electronics & Appliances",
        "length_cm": 240,
        "width_cm": 140,
        "height_cm": 200,
        "pickup_time": "2026-05-28T10:00:00Z",
        "dropoff_time": "2026-05-28T14:00:00Z",
        "value": 680,
        "status": "open",
        "match_score": 87,
        "empty_miles_saved": 120,
        "ai_reasoning": "Electronics shipment - regional delivery"
    },
    {
        "shipper_id": user_id,
        "shipment_code": "DEMO-MEL-SYD-003",
        "cargo": "Packaged building materials",
        "origin": "Melbourne, Victoria, 3000, Australia",
        "destination": "Sydney, New South Wales, 2000, Australia",
        "route_origin": "Melbourne, Victoria, 3000, Australia",
        "route_destination": "Sydney, New South Wales, 2000, Australia",
        "weight_kg": 15000,
        "load_type": "Packaged Building Materials",
        "length_cm": 280,
        "width_cm": 160,
        "height_cm": 220,
        "pickup_time": "2026-05-29T06:00:00Z",
        "dropoff_time": "2026-05-30T18:00:00Z",
        "value": 1500,
        "status": "open",
        "match_score": 92,
        "empty_miles_saved": 380,
        "ai_reasoning": "Interstate building materials - high margin potential"
    },
    {
        "shipper_id": user_id,
        "shipment_code": "DEMO-MEL-ADE-004",
        "cargo": "Non-perishable groceries",
        "origin": "Melbourne, Victoria, 3000, Australia",
        "destination": "Adelaide, South Australia, 5000, Australia",
        "route_origin": "Melbourne, Victoria, 3000, Australia",
        "route_destination": "Adelaide, South Australia, 5000, Australia",
        "weight_kg": 18000,
        "load_type": "Non-perishable Food & Beverages",
        "length_cm": 300,
        "width_cm": 180,
        "height_cm": 240,
        "pickup_time": "2026-05-30T10:00:00Z",
        "dropoff_time": "2026-05-31T20:00:00Z",
        "value": 950,
        "status": "open",
        "match_score": 85,
        "empty_miles_saved": 320,
        "ai_reasoning": "Food and beverage consolidation shipment"
    }
]

try:
    # Check for existing loads
    existing_loads = supabase.table("loads").select("shipment_code").eq(
        "shipper_id", user_id
    ).execute()
    
    existing_codes = {l["shipment_code"] for l in existing_loads.data}
    
    for load in loads:
        if load["shipment_code"] not in existing_codes:
            supabase.table("loads").insert(load).execute()
            print(f"✓ Created shipment: {load['shipment_code']} ({load['weight_kg']}kg)")
        else:
            print(f"✓ Shipment already exists: {load['shipment_code']}")

except Exception as e:
    print(f"✗ Error creating loads: {e}")
    sys.exit(1)

# ============================================
# STEP 5: VERIFY EVERYTHING
# ============================================

print("\n[STEP 5] Verifying Created Data...")

try:
    # Count roles
    roles = supabase.table("user_roles").select("*").eq(
        "user_id", user_id
    ).execute()
    print(f"✓ User Roles: {len(roles.data)} ({', '.join(r['role'] for r in roles.data)})")
    
    # Count vehicles
    vehicles = supabase.table("vehicles").select("*").eq(
        "carrier_id", user_id
    ).execute()
    print(f"✓ Vehicles: {len(vehicles.data)}")
    for v in vehicles.data:
        print(f"  - {v['unit_id']} ({v['capacity_t']}T capacity)")
    
    # Count loads
    loads_result = supabase.table("loads").select("*").eq(
        "shipper_id", user_id
    ).execute()
    print(f"✓ Shipments: {len(loads_result.data)}")
    for l in loads_result.data:
        print(f"  - {l['shipment_code']}: {l['cargo']} ({l['weight_kg']}kg)")

except Exception as e:
    print(f"✗ Error verifying: {e}")
    sys.exit(1)

# ============================================
# SUCCESS!
# ============================================

print("\n" + "=" * 60)
print("✅ DEMO DATA CREATION COMPLETE!")
print("=" * 60)
print(f"\n📊 Summary:")
print(f"  Account:  {DEMO_EMAIL}")
print(f"  Password: {DEMO_PASSWORD}")
print(f"  User ID:  {user_id}")
print(f"\n🚀 Next Steps:")
print(f"  1. Go to http://localhost:8080")
print(f"  2. Click 'Sign In'")
print(f"  3. Select 'Shipper' or 'Carrier' role")
print(f"  4. Email: {DEMO_EMAIL}")
print(f"  5. Password: {DEMO_PASSWORD}")
print(f"\n✨ You now have:")
print(f"  - 2 demo vehicles (DEMO-VEH-001, DEMO-VEH-002)")
print(f"  - 4 demo shipments (DEMO-MEL-CBD-001, etc.)")
print(f"  - Both Shipper and Carrier roles")
print("\n💡 Tip: Run this script again to verify data was created!")

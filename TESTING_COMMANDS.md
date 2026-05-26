# LoadMind Testing - Commands & Scripts

## 🖥️ QUICK START COMMANDS

### Verify Both Services Running
```powershell
# Terminal 1 - Check Backend
curl http://localhost:8000/docs
# Expected: Swagger documentation page

# Terminal 2 - Check Frontend  
curl http://localhost:8080
# Expected: HTML page with React app

# Terminal 3 - Check if ports in use
netstat -ano | findstr :8000
netstat -ano | findstr :8080
```

---

## 🔌 API TEST COMMANDS

### List All Open Loads
```powershell
curl http://localhost:8000/api/loads/open
```

### List User Loads
```powershell
# Requires authentication token
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN_HERE"
}
curl -Headers $headers http://localhost:8000/api/loads
```

### Get Specific Load
```powershell
curl http://localhost:8000/api/loads/{load_id}
```

### Check Backend Health
```powershell
curl http://localhost:8000/health
# or
curl http://localhost:8000/api/health
```

---

## 🔐 DATABASE QUERIES

### Connect to Supabase (from Dashboard)
```sql
-- Check demo data exists
SELECT * FROM loads WHERE shipment_code LIKE 'DEMO-%';

-- List all users
SELECT id, email FROM auth.users;

-- Check user roles
SELECT user_id, role FROM user_roles;

-- List all vehicles
SELECT unit_id, model, capacity_t, status FROM vehicles;

-- Check load assignments
SELECT id, shipment_code, assigned_carrier_id, assigned_vehicle_id FROM loads;
```

---

## 🧪 BROWSER CONSOLE TESTS

### Test 1: Verify React App Loaded
```javascript
// Paste in DevTools Console
console.log(window.location)
console.log(document.title)
```

### Test 2: Check API Endpoint
```javascript
fetch('http://localhost:8000/api/loads/open')
  .then(r => r.json())
  .then(d => console.log(d))
```

### Test 3: Check Supabase Client
```javascript
// If app has supabase exposed
console.log(window.supabase || 'Supabase not exposed')
```

### Test 4: Monitor Network Activity
```javascript
// Open DevTools → Network tab
// Perform action in app
// Watch for API calls
// Check response status (should be 200)
```

---

## 📊 AUTOMATED TEST SCRIPT

### Power Shell Script: Health Check
```powershell
# Save as: test_health.ps1

Write-Host "=== LoadMind Health Check ===" -ForegroundColor Cyan

# Test Backend
Write-Host "`n1. Backend Status..." -ForegroundColor Yellow
$backend = curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs
if ($backend -eq "200") {
    Write-Host "✓ Backend OK (200)" -ForegroundColor Green
} else {
    Write-Host "✗ Backend FAILED ($backend)" -ForegroundColor Red
}

# Test Frontend
Write-Host "`n2. Frontend Status..." -ForegroundColor Yellow
$frontend = curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
if ($frontend -eq "200") {
    Write-Host "✓ Frontend OK (200)" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend FAILED ($frontend)" -ForegroundColor Red
}

# Test API Endpoint
Write-Host "`n3. API Loads Endpoint..." -ForegroundColor Yellow
try {
    $loads = curl -s http://localhost:8000/api/loads/open | ConvertFrom-Json
    Write-Host "✓ API responding, found $($loads.Count) open loads" -ForegroundColor Green
} catch {
    Write-Host "✗ API FAILED: $_" -ForegroundColor Red
}

Write-Host "`n=== Check Complete ===" -ForegroundColor Cyan
```

### Run Health Check
```powershell
cd c:\Users\smriti\DTE204
.\test_health.ps1
```

---

## 🧬 TEST SCENARIO SCRIPTS

### Script 1: Create and Verify Demo Shipment
```powershell
# Save as: test_shipper_flow.ps1

$apiUrl = "http://localhost:8000"
$shipperId = "YOUR_SHIPPER_ID"
$token = "YOUR_AUTH_TOKEN"

# Create new load
$newLoad = @{
    cargo = "Test Shipment - $(Get-Date -Format 'HHmmss')"
    origin = "Sydney NSW 2000"
    destination = "Melbourne VIC 3000"
    weight_kg = 5000
    load_type = "dry_goods"
    value = 2500
    pickup_time = (Get-Date).AddHours(24).ToUniversalTime().ToString("o")
    dropoff_time = (Get-Date).AddHours(28).ToUniversalTime().ToString("o")
}

$response = curl -X POST "$apiUrl/api/loads" `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d ($newLoad | ConvertTo-Json)

Write-Host "Created Load: $response"
```

### Script 2: Test Load Assignment
```powershell
# Save as: test_carrier_flow.ps1

$apiUrl = "http://localhost:8000"
$loadId = "YOUR_LOAD_ID"
$vehicleId = "YOUR_VEHICLE_ID"
$token = "YOUR_AUTH_TOKEN"

# Assign load to vehicle
$assignment = @{
    vehicle_id = $vehicleId
}

$response = curl -X POST "$apiUrl/api/loads/$loadId/assign" `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d ($assignment | ConvertTo-Json)

Write-Host "Assignment Response: $response"
```

---

## 📋 MANUAL TEST CHECKLIST

### Pre-Test
```
☐ Backend running on :8000
☐ Frontend running on :8080
☐ Supabase credentials configured
☐ Demo data exists in database
☐ Browser DevTools open
☐ Network tab monitored
```

### Login Flow
```
☐ Open http://localhost:8080
☐ Enter test@test.com
☐ Enter password 417230
☐ Click "Sign In"
☐ See role selection screen
☐ No console errors
```

### Shipper Flow
```
☐ Select "Shipper" role
☐ Dashboard loads
☐ Active shipments visible
☐ Open marketplace visible
☐ History page works
☐ Filters work:
  ☐ Search: "Melbourne"
  ☐ Status: "delivered"
  ☐ Date: "last 7 days"
  ☐ Category: "Electronics"
☐ Can view grid and list
```

### Carrier Flow
```
☐ Switch to "Carrier" role
☐ AI Matcher loads
☐ Demo loads visible
☐ Filters work:
  ☐ Search: "Sydney"
  ☐ Category: "Automotive"
  ☐ Weight: "5-15 t"
  ☐ Available truck: checked
☐ Maps render
☐ Can click "Assign Load"
☐ Vehicle dropdown shows options
☐ Can select vehicle
✓ Load disappears from marketplace
```

### Lifecycle Flow
```
☐ Create new shipment (Shipper)
☐ Get price suggestion
☐ Accept price
☐ Submit shipment
✓ Appears in marketplace
☐ Assign to vehicle (Carrier)
✓ Appears in fleet
☐ Confirm pickup (both)
✓ Status updates to "in_transit"
☐ Confirm delivery (both)
✓ Moves to History
✓ Status = "delivered"
```

### Error Handling
```
☐ Invalid time sequence caught
☐ Missing fields validated
☐ Duplicate email rejected
☐ Capacity exceeded rejected
☐ Time conflict rejected
☐ Error messages clear
☐ No console errors
```

---

## 📈 PERFORMANCE TEST

### Load Testing
```powershell
# Using Apache Bench (if installed)
ab -n 100 -c 10 http://localhost:8080/

# or using PowerShell
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
1..10 | ForEach-Object {
    curl -s http://localhost:8080 | Out-Null
}
$stopwatch.Stop()
Write-Host "10 requests in $($stopwatch.ElapsedMilliseconds)ms"
```

---

## 🐛 DEBUGGING COMMANDS

### Backend Debugging
```powershell
# Check backend logs
# Terminal where backend is running should show:
# - Started reloader process
# - Started server process
# - Application startup complete
# - API request logs

# Enable verbose logging
# Set DEBUG=true in .env
# Restart backend
```

### Frontend Debugging
```javascript
// In browser console
// Monitor API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('API Call:', args[0]);
    return originalFetch.apply(this, args)
        .then(r => {
            console.log('Response:', r.status);
            return r;
        });
};

// Check storage
console.log(localStorage)
console.log(sessionStorage)

// Monitor Redux/State (if used)
// Check React DevTools
```

---

## 🔄 RESET/CLEANUP

### Clear Browser Cache
```javascript
// Browser DevTools Console
localStorage.clear()
sessionStorage.clear()
// Then hard refresh: Ctrl+Shift+R
```

### Reset Demo Data (if needed)
```powershell
# Drop and recreate demo user
# In Supabase SQL:
DELETE FROM user_roles WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'test@test.com'
);
DELETE FROM auth.users WHERE email = 'test@test.com';

# Then run setup_demo_data.py again
```

---

## 📊 TEST RESULTS TEMPLATE

Create file: `TEST_RESULTS_2026-05-26.md`

```markdown
# Test Results - 2026-05-26

## Environment
- Browser: Chrome 120
- OS: Windows 11
- Backend: Running
- Frontend: Running
- Time: 10:00 AM

## Tests Run

### Phase 1: Authentication
- [x] Login with test@test.com
- [x] Role selection works
- [x] Can switch roles

Status: ✅ PASS

### Phase 2: Shipper
- [x] Dashboard loads
- [x] Demo data visible
- [x] History filters work
- [x] Can post shipment
- [x] Price suggestion works

Status: ✅ PASS

### Phase 3: Carrier
- [x] AI Matcher loads
- [x] Loads visible
- [x] Can filter
- [x] Can assign
- [x] Fleet view works

Status: ✅ PASS

### Phase 4: Lifecycle
- [x] Create → Post → Assign → Confirm → Deliver
- [x] Status syncs across roles

Status: ✅ PASS

## Issues Found
None

## Overall Status
✅ READY FOR DEMO

## Sign-off
Tester: _____________
Date: _____________
```

---

## 🚀 DEPLOYMENT CHECKLIST

After all tests pass:

```
Pre-Deployment
☐ All tests passing
☐ No console errors
☐ Performance acceptable
☐ Database backed up
☐ Environment variables set
☐ SSL certificates ready

Deployment
☐ Stop current services
☐ Deploy backend
☐ Deploy frontend
☐ Run database migrations
☐ Clear CDN cache

Post-Deployment
☐ Smoke test (manual)
☐ Monitor error logs
☐ Check metrics
☐ Verify email alerts
☐ Announce to users
```

---

## 📞 QUICK REFERENCE

| Need | Command |
|------|---------|
| Health check | `curl http://localhost:8000/docs` |
| API docs | `http://localhost:8000/docs` |
| Frontend | `http://localhost:8080` |
| Database | Supabase dashboard |
| Clear cache | `Ctrl+Shift+R` in browser |
| Backend logs | Terminal window 1 |
| Frontend errors | Browser console |
| Test user | test@test.com / 417230 |

---

**Happy Testing! 🧪✨**


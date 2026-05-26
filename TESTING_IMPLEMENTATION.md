# LoadMind Testing Implementation Guide

## Quick Start - 5 Minute Setup

### Step 1: Verify Both Servers Running ✅
```powershell
# Check Backend (should show "Application startup complete")
# Terminal 1: Backend running on http://localhost:8000

# Check Frontend (should show "VITE ready")
# Terminal 2: Frontend running on http://localhost:8080
```

---

## QUICK TEST (15 minutes)

### 1. Open Application
```
1. Open browser: http://localhost:8080
2. You should see LoadMind login page
```

### 2. Login
```
Email: test@test.com
Password: 417230
Click "Sign In"
```

### 3. Choose Role - START WITH SHIPPER
```
Click "Shipper" option
Wait for dashboard to load
```

### 4. Shipper Dashboard - Verify Demo Data Visible
```
Scroll down and verify you see:
✓ ACTIVE SHIPMENTS section with demo loads
✓ OPEN IN MARKETPLACE section 
✓ Shows: DEMO-MEL-CBD-001, DEMO-SYD-NBR-001, etc.
✓ Each shows: Cargo type, Route, Carrier, Status, Value
```

### 5. View History
```
Click "History" link in sidebar
Filter by:
- Search: "Melbourne" 
- Status: "all"
- Date: "all"
Verify loads appear in list or grid view
```

### 6. Post New Shipment (OPTIONAL - Advanced Test)
```
Click "Post Shipment" link
Fill in form:
  Cargo: "Test Electronics"
  Category: "Electronics & Appliances"
  Weight: 5000 kg
  Pickup: "123 Test St, Sydney NSW 2000"
  Delivery: "456 Test Ave, Melbourne VIC 3000"
  Pickup Time: Tomorrow 10:00 AM
  Dropoff Time: Tomorrow 2:00 PM
Click "Get Price Suggestion"
Accept suggested price
Click "Post Shipment"
✓ Should see toast: "Shipment posted successfully"
✓ Load should appear in "OPEN IN MARKETPLACE"
```

### 7. Switch to Carrier Role
```
Click role selector (usually hamburger menu or profile icon)
Select "Carrier"
Wait for AI Matcher to load
```

### 8. Carrier AI Matcher - Verify Marketplace Loads
```
You should see:
✓ Load cards for DEMO-MEL-CBD-001, etc.
✓ Each card shows:
  - Category badge: "Electronics & Appliances"
  - Weight: "5.0 t"
  - Route: "Clayton, Victoria → Melbourne CBD"
  - Load Value: "$3,500"
  - Specifications: Weight, Length, Width, Height
  - Pickup & Dropoff times
  - Interactive map showing route
  - "Assign Load" button
```

### 9. Test Search & Filters
```
Search:
  - Type "Melbourne" in search box
  - Verify only Melbourne routes show

Category Filter:
  - Click "All dry goods"
  - Select "Electronics & Appliances"
  - Verify filtered results

Weight Filter:
  - Click "All weights"
  - Select "5-15 t"
  - Verify only 5-15 tonne loads show

Available Truck:
  - Check "Available truck" checkbox
  - Verify only compatible vehicles shown

Reset:
  - Click "Reset" button
  - All filters clear, all loads visible
```

### 10. Assign Load to Vehicle
```
On any load card:
1. Click "Assign Load" button
2. Dropdown opens showing eligible vehicles:
   ✓ DEMO-VEH-001 (Volvo FH16) - 25T capacity
   ✓ DEMO-VEH-002 (Scania R440) - 20T capacity
3. Click on a vehicle
4. Should see toast: "Load assigned"
   Message: "Clayton, Victoria → Melbourne CBD dispatched to DEMO-VEH-001..."
5. Load disappears from AI Matcher (now assigned)
```

### 11. View Fleet
```
Click "Fleet" link
Should see:
✓ DEMO-VEH-001 (Volvo FH16) - 25T, idle
✓ DEMO-VEH-002 (Scania R440) - 20T, idle
✓ Assigned loads shown under vehicles
✓ Status: "scheduled"
```

### 12. Switch Back to Shipper
```
Click role selector
Choose "Shipper"
On Dashboard:
✓ Previously assigned load now shows:
  - Carrier name or truck assignment
  - Status: "scheduled"
```

### 13. Complete Lifecycle (ADVANCED)
```
As Shipper:
1. Find a "scheduled" load in ACTIVE SHIPMENTS
2. Click "Confirm Pickup" button
   ✓ Toast: "Pickup confirmation sent"
3. Status updates to "in_transit"

As Carrier:
1. Switch to Carrier role
2. Go to Fleet
3. Find the in-transit load
4. Click "Confirm Delivery" button
   ✓ Toast: "Delivery confirmed"

As Shipper:
1. Switch back to Shipper
2. On Dashboard, find the load
3. Click "Confirm Delivery" button
   ✓ Toast: "Delivery confirmation sent"
4. Load moves to History
5. Status: "delivered"
```

---

## DETAILED TEST PHASES

### Phase 1: Authentication (5 min)
**Goal**: Verify login and role switching works

✓ Login with test@test.com / 417230
✓ Select Shipper role
✓ Select Carrier role
✓ Dashboard loads for each role

**Success**: Both roles accessible, dashboards load

---

### Phase 2: Shipper Exploration (10 min)
**Goal**: Verify shipper can see and interact with shipments

✓ Dashboard shows active shipments
✓ Dashboard shows open marketplace listings
✓ History page loads with shipments
✓ History filters work (search, status, date, category)
✓ Can view grid/list layouts
✓ Pagination works

**Success**: All shipper data visible and filterable

---

### Phase 3: Shipment Lifecycle (15 min)
**Goal**: Test complete workflow from posting to delivery

✓ Post new shipment
✓ Get AI price suggestion
✓ Accept price and submit
✓ Shipment appears in marketplace
✓ Switch to Carrier
✓ Find shipment in AI Matcher
✓ Assign to vehicle
✓ Switch to Shipper
✓ Confirm pickup
✓ Switch to Carrier
✓ Confirm delivery
✓ Switch to Shipper
✓ Shipment moves to History

**Success**: Complete lifecycle functional

---

### Phase 4: Carrier Intelligence (10 min)
**Goal**: Verify AI matching and vehicle eligibility

✓ AI Matcher displays loads
✓ Search functionality works
✓ Category filters work
✓ Weight filters work
✓ Available truck filter works
✓ Only eligible vehicles shown in assignment
✓ Time conflict detection works
✓ Capacity validation works

**Success**: AI matching intelligent and accurate

---

### Phase 5: Maps & Routes (5 min)
**Goal**: Verify map visualization

✓ Load cards show route maps
✓ Maps display pickup/delivery points
✓ Maps show connecting route line
✓ Location labels visible
✓ Location picker interactive

**Success**: Maps rendering correctly

---

### Phase 6: Error Handling (10 min)
**Goal**: Verify app handles errors gracefully

✓ Invalid time sequence caught
✓ Missing required fields validated
✓ Missing price acceptance validated
✓ Capacity violations prevented
✓ Time conflicts prevented
✓ Error messages user-friendly

**Success**: Error handling robust

---

## Testing Checklist

### Must Pass (Critical)
- [ ] Login works
- [ ] Shipper dashboard shows demo data
- [ ] Carrier AI Matcher shows marketplace loads
- [ ] Can assign loads to vehicles
- [ ] Status updates across roles
- [ ] Complete lifecycle works

### Should Pass (High Priority)
- [ ] Filters work correctly
- [ ] Search works
- [ ] Maps display
- [ ] Forms validate
- [ ] Error messages show
- [ ] Fleet management works

### Nice to Have (Nice to Have)
- [ ] Performance is fast
- [ ] UI responsive on mobile
- [ ] Dark mode works
- [ ] Pagination smooth
- [ ] Toast notifications styled

---

## Troubleshooting

### Issue: "Cannot connect to API"
```
✓ Check backend running: http://localhost:8000
✓ Should see "Application startup complete"
✓ In browser console, check CORS errors
```

### Issue: "No demo data showing"
```
✓ Demo data creation script had issues
✓ Manually verify in Supabase:
  - Check "loads" table
  - Check "vehicles" table
  - Check "user_roles" table
```

### Issue: "Cannot assign load - vehicle not showing"
```
✓ Vehicle may have capacity issue
✓ Check time conflict with existing loads
✓ Verify vehicle dimensions match load
✓ Check vehicle status (not maintenance)
```

### Issue: "Maps not displaying"
```
✓ Check Leaflet/OpenStreetMap loaded
✓ Browser console for errors
✓ Check location data in database
```

### Issue: "Prices not calculating"
```
✓ Backend AI model may not be loaded
✓ Check backend logs for XGBoost errors
✓ Verify .env has ORS_API_KEY
✓ Test fallback pricing works
```

---

## API Health Checks

### Backend Health
```powershell
# Check if backend is running
curl http://localhost:8000/docs

# Expected: Swagger API documentation page
```

### Check Available Loads
```powershell
curl http://localhost:8000/api/loads/open

# Expected: JSON array of open loads
```

### Check User Auth
```powershell
# Should return auth token in browser console
# Open DevTools > Network tab
# Login and watch network requests
```

---

## Performance Targets

| Metric | Target | Success |
|--------|--------|---------|
| Page Load | < 3s | ✓ or ✗ |
| API Response | < 1s | ✓ or ✗ |
| Form Submit | < 2s | ✓ or ✗ |
| Filter Apply | < 500ms | ✓ or ✗ |
| Map Render | < 2s | ✓ or ✗ |

---

## Test Results Summary

**Test Date**: ________________
**Tester**: ________________
**Browser**: ________________
**OS**: ________________

### Critical Features
- [ ] Login: PASS / FAIL
- [ ] Shipper Dashboard: PASS / FAIL
- [ ] Carrier AI Matcher: PASS / FAIL
- [ ] Load Assignment: PASS / FAIL
- [ ] Lifecycle: PASS / FAIL

### Overall Status
- [ ] Ready for Demo
- [ ] Needs Fixes
- [ ] Major Issues

### Issues Found
1. ________________
2. ________________
3. ________________

### Notes
________________
________________

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Deploy to staging environment
2. Conduct user acceptance testing
3. Performance optimization
4. Security audit
5. Production deployment

### If Tests Fail ❌
1. Document issues clearly
2. Prioritize by severity
3. Fix in order: Critical → High → Medium
4. Re-test after fixes
5. Repeat until all pass

---

## Quick Reference - Test Accounts

| Email | Password | Roles | Status |
|-------|----------|-------|--------|
| test@test.com | 417230 | Shipper, Carrier | Demo Data Setup |

---

## Getting Help

**Backend Logs**: Check terminal where backend is running
**Frontend Console**: Open DevTools → Console tab
**Database**: Supabase dashboard at https://app.supabase.com
**API Docs**: http://localhost:8000/docs


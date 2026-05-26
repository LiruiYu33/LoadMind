# LoadMind Application Testing Plan

## Overview
This document outlines a comprehensive testing plan for the LoadMind freight matching platform, covering both Shipper and Carrier workflows.

---

## Prerequisites
- ✅ Backend API running on `http://localhost:8000`
- ✅ Frontend running on `http://localhost:8080`
- ✅ Demo user account created: `test@test.com` / `417230`
- ✅ Both Shipper and Carrier roles assigned to test account
- ✅ Demo vehicles and shipments created

---

## Test Execution Steps

### **PHASE 1: Authentication & Account Setup**

#### Test 1.1: Login as Test User
```
Steps:
1. Navigate to http://localhost:8080
2. Click "Sign In"
3. Enter email: test@test.com
4. Enter password: 417230
5. Click "Sign In"

Expected Result:
- ✅ Redirected to role selection screen
- ✅ Option to select "Shipper" or "Carrier" role
```

#### Test 1.2: Switch to Shipper Role
```
Steps:
1. From role selection, click "Shipper"
2. Wait for Shipper Dashboard to load

Expected Result:
- ✅ Redirected to Shipper Dashboard
- ✅ Page title: "Welcome back to LoadMind"
- ✅ Subtitle: "Your freight, optimized through verified Australian carriers."
```

#### Test 1.3: Switch to Carrier Role
```
Steps:
1. Click role switcher (usually in header)
2. Select "Carrier" role
3. Wait for Carrier Dashboard to load

Expected Result:
- ✅ Redirected to Carrier AI Matcher
- ✅ Page title: "AI Load Matcher"
- ✅ Subtitle: "Continuously scoring marketplace loads against your fleet."
```

---

### **PHASE 2: Shipper Workflow Testing**

#### Test 2.1: View Dashboard - Active Shipments
```
Steps:
1. Login as Shipper
2. Scroll to "ACTIVE SHIPMENTS" section
3. Check if demo shipments are visible

Expected Result:
- ✅ Table displays demo shipments (DEMO-MEL-CBD-001, etc.)
- ✅ Columns show: Shipment & Route, Carrier, Status, ETA, Value, Action
- ✅ Demo shipments show status: "scheduled" or "in_transit"
- ✅ Carrier names visible or showing "Carrier pending"
```

#### Test 2.2: View Posted Loads
```
Steps:
1. Stay on Shipper Dashboard
2. Scroll to "OPEN IN MARKETPLACE" section
3. Verify demo loads are posted

Expected Result:
- ✅ Section shows open loads from carrier marketplace
- ✅ Demo loads display: DEMO-MEL-CBD-001, DEMO-SYD-NBR-001, etc.
- ✅ Each load shows cargo, route, ETA, value
- ✅ "Cancel Listing" button visible for each load
```

#### Test 2.3: View Cancelled Loads
```
Steps:
1. Scroll down to "CANCELLED LOADS" section

Expected Result:
- ✅ Section visible (may be empty if no cancellations yet)
- ✅ Option to "Restore Listing" for each cancelled load
```

#### Test 2.4: View Shipment History
```
Steps:
1. Click "History" navigation link
2. Page loads with all past shipments

Expected Result:
- ✅ Default view shows all shipments
- ✅ Table/Grid displays shipment details
- ✅ Shows: Shipment code, cargo, route, weight, carrier, status, dates
```

#### Test 2.5: Test History Filters
```
Steps:
1. From History page, use search bar
   - Search: "Melbourne"
   Expected: Shows loads with Melbourne in route
2. Status Filter dropdown
   - Select: "delivered"
   Expected: Shows only completed deliveries
3. Date Filter dropdown
   - Select: "last 7 days"
   Expected: Shows recent shipments
4. Category Filter dropdown
   - Select: "Electronics & Appliances"
   Expected: Shows only that cargo type
5. Switch View
   - Click "Grid" icon
   Expected: Changes to card-based grid view
```

#### Test 2.6: Post New Shipment
```
Steps:
1. Click "Post Shipment" navigation link
2. Fill form with demo data:
   - Cargo: "Test Electronics"
   - Category: "Electronics & Appliances"
   - Weight: 5000 kg
   - Dimensions: Length 200cm, Width 150cm, Height 100cm
   - Pickup: "123 Test St, Sydney, NSW 2000"
   - Delivery: "456 Test Ave, Melbourne, VIC 3000"
   - Pickup Time: Tomorrow 10:00 AM
   - Dropoff Time: Tomorrow 2:00 PM
   - Notes: "Test shipment - fragile items"

Expected Result:
- ✅ Form validates all required fields
- ✅ Location picker shows map for pickup location
- ✅ Location picker shows map for delivery location
- ✅ Autocomplete suggests addresses
```

#### Test 2.7: AI Price Suggestion
```
Steps:
1. After filling shipment form, click "Get Price Suggestion"
2. Wait for backend to calculate

Expected Result:
- ✅ Suggested price appears (e.g., "AUD 2,500")
- ✅ "AI Reasoning" shows why (e.g., "Electronics shipment...")
- ✅ Shows distance, driving hours, actual duration
- ✅ Can accept or manually adjust price
```

#### Test 2.8: Submit Shipment
```
Steps:
1. Accept the suggested/adjusted price
2. Click "Post Shipment" button
3. Wait for confirmation

Expected Result:
- ✅ Toast notification: "Shipment posted successfully"
- ✅ Redirected back to Dashboard
- ✅ New shipment appears in "OPEN IN MARKETPLACE"
- ✅ Status: "open"
```

#### Test 2.9: Confirm Pickup
```
Steps:
1. From Dashboard, find a "scheduled" load
2. Click "Confirm Pickup" action button
3. Confirm in dialog

Expected Result:
- ✅ Toast: "Pickup confirmation sent"
- ✅ Status might update to "in_transit" (if carrier also confirms)
- ✅ Load remains visible in active shipments
```

#### Test 2.10: Confirm Delivery
```
Steps:
1. From Dashboard, find an "in_transit" load
2. Click "Confirm Delivery" action button
3. Confirm in dialog

Expected Result:
- ✅ Toast: "Delivery confirmation sent"
- ✅ Load moves to History
- ✅ Status becomes "delivered"
```

---

### **PHASE 3: Carrier Workflow Testing**

#### Test 3.1: Switch to Carrier Role
```
Steps:
1. From Shipper Dashboard, click role switcher
2. Select "Carrier"

Expected Result:
- ✅ Redirected to Carrier AI Matcher page
- ✅ Page loads showing available loads
```

#### Test 3.2: View Marketplace Loads
```
Steps:
1. On AI Matcher page, scroll through load cards
2. Verify demo loads are visible

Expected Result:
- ✅ Load cards display:
  - Cargo category badge (e.g., "Electronics & Appliances")
  - Weight (e.g., "5.0 t")
  - Cargo description
  - Route (origin → destination)
  - Load value (e.g., "$3,500")
  - Detailed specs: Weight, Length, Width, Height
  - Pickup & Delivery times
  - Interactive route map
  - "Assign Load" button
```

#### Test 3.3: Test Search Functionality
```
Steps:
1. Click search bar at top
2. Type: "Melbourne"
3. Hit Enter

Expected Result:
- ✅ Loads filtered to show only Melbourne routes
- ✅ Non-matching loads hidden
```

#### Test 3.4: Test Category Filter
```
Steps:
1. Click "All dry goods" dropdown
2. Select: "Electronics & Appliances"

Expected Result:
- ✅ Loads filtered to show only electronics
- ✅ Count indicator shows active filters
```

#### Test 3.5: Test Weight Filter
```
Steps:
1. Click "All weights" dropdown
2. Select: "5-15 t"

Expected Result:
- ✅ Shows only loads between 5-15 tonnes
- ✅ Heavier and lighter loads hidden
```

#### Test 3.6: Test "Available Truck" Filter
```
Steps:
1. Check "Available truck" checkbox
2. Observe loads displayed

Expected Result:
- ✅ Only shows loads your fleet can handle
- ✅ Considers: capacity, time conflicts, dimensions
```

#### Test 3.7: Reset Filters
```
Steps:
1. With filters applied, click "Reset (3)" button

Expected Result:
- ✅ All filters cleared
- ✅ All loads visible again
```

#### Test 3.8: View Vehicle Fleet
```
Steps:
1. Click "Fleet" navigation link

Expected Result:
- ✅ Shows demo vehicles (DEMO-VEH-001, DEMO-VEH-002)
- ✅ Displays:
  - Unit ID & Model
  - Status (idle, in_transit, etc.)
  - Capacity (25T, 20T)
  - Location
  - Trailer specs (length, width, height)
```

#### Test 3.9: Assign Load to Vehicle
```
Steps:
1. Return to AI Matcher
2. On a demo load card, click "Assign Load" button
3. Dropdown opens showing eligible vehicles

Expected Result:
- ✅ Dropdown shows eligible vehicles
- ✅ DEMO-VEH-001 (25T, idle, no conflicts) shows
- ✅ DEMO-VEH-002 (20T, idle, no conflicts) shows
- ✅ Each vehicle shows: Unit ID, Model, Location, Status
```

#### Test 3.10: Select Vehicle for Assignment
```
Steps:
1. From "Assign Load" dropdown, click DEMO-VEH-001

Expected Result:
- ✅ Toast notification: "Load assigned"
- ✅ Message: "Clayton, Victoria → Melbourne CBD dispatched to DEMO-VEH-001 (Volvo FH16)"
- ✅ Load disappears from AI Matcher
- ✅ Load appears in Fleet view as "scheduled" for that vehicle
```

#### Test 3.11: View Assigned Loads by Vehicle
```
Steps:
1. Click "Fleet" navigation link
2. Find DEMO-VEH-001 with assigned load
3. Click on vehicle row or expand section

Expected Result:
- ✅ Shows assigned loads for the vehicle
- ✅ Display includes:
  - Shipment details
  - Pickup & delivery times
  - Status (scheduled)
  - Confirm buttons
```

#### Test 3.12: Confirm Pickup (Carrier Side)
```
Steps:
1. In Fleet view, find assigned "scheduled" load
2. Click "Confirm Pickup" button

Expected Result:
- ✅ Toast: "Pickup confirmed"
- ✅ Status transitions based on shipper confirmation
- ✅ If shipper already confirmed: Status → "in_transit"
```

---

### **PHASE 4: Cross-Platform Integration Testing**

#### Test 4.1: Verify Bidirectional Status Updates
```
Steps:
1. Login as Shipper, find scheduled load
2. In another browser/incognito: Login as Carrier
3. Confirm pickup on Carrier side
4. Refresh Shipper dashboard

Expected Result:
- ✅ Shipper sees carrier confirmation
- ✅ Load status updated
- ✅ Real-time sync working
```

#### Test 4.2: Verify Assignment Visibility
```
Steps:
1. As Carrier: Assign load to vehicle
2. Switch to Shipper dashboard
3. Refresh or navigate away and back

Expected Result:
- ✅ Shipper sees "Carrier assigned" status
- ✅ Shows carrier name (if populated)
- ✅ Shows vehicle ID/type
```

#### Test 4.3: Complete Full Lifecycle
```
Steps:
1. Shipper: Post shipment
2. Carrier: Assign to vehicle
3. Carrier: Confirm pickup
4. Shipper: Confirm pickup
5. Carrier: Confirm delivery
6. Shipper: Confirm delivery

Expected Result:
- ✅ Each step completes successfully
- ✅ Status transitions at each phase
- ✅ Final status: "delivered"
- ✅ Load moves to Shipper History
```

---

### **PHASE 5: Map & Route Testing**

#### Test 5.1: Interactive Route Map on Load Card
```
Steps:
1. In AI Matcher, scroll to any load card
2. Find the "LoadRouteMap" section
3. Observe map display

Expected Result:
- ✅ Interactive map visible with:
  - Pickup location marker
  - Delivery location marker
  - Route line connecting them
  - Location labels below map
```

#### Test 5.2: Location Picker - Shipper
```
Steps:
1. Post Shipment page
2. Click location picker button for pickup
3. Map opens for address selection

Expected Result:
- ✅ Interactive map displays
- ✅ Can click on map to select point
- ✅ Search/autocomplete field available
- ✅ Address suggestions appear
- ✅ Selected address writes back to form
```

#### Test 5.3: Autocomplete Address Suggestions
```
Steps:
1. In location picker, type: "Melbourne"
2. Wait for suggestions

Expected Result:
- ✅ Dropdown shows matching addresses
- ✅ Suggestions include Australian locations
- ✅ Full street addresses populated on selection
```

---

### **PHASE 6: Error Handling & Validation**

#### Test 6.1: Invalid Time Sequence
```
Steps:
1. Post Shipment form
2. Set Pickup Time: 2:00 PM
3. Set Dropoff Time: 1:00 PM (before pickup)
4. Try to submit

Expected Result:
- ✅ Toast error: "Dropoff time must be after pickup time"
- ✅ Form not submitted
```

#### Test 6.2: Missing Required Fields
```
Steps:
1. Post Shipment form
2. Leave Cargo field empty
3. Try to submit

Expected Result:
- ✅ Form validation triggers
- ✅ Error message shows
- ✅ Form not submitted
```

#### Test 6.3: Missing Price Acceptance
```
Steps:
1. Fill post shipment form
2. Get price suggestion
3. Try to submit WITHOUT clicking "Accept Price"

Expected Result:
- ✅ Toast error: "Please accept a suggested or modified price"
- ✅ Form not submitted
```

#### Test 6.4: Vehicle Capacity Violation
```
Steps:
1. In AI Matcher, search for 25-tonne load
2. Try to assign to 5-tonne vehicle

Expected Result:
- ✅ Vehicle not shown in eligible list
- ✅ Dropdown message: "No theoretically available trucks for this load"
```

#### Test 6.5: Time Conflict Detection
```
Steps:
1. Assign Load A to DEMO-VEH-001 (May 27 10:00-14:00)
2. Try to assign Load B (May 27 12:00-16:00) to same vehicle

Expected Result:
- ✅ Vehicle not shown as eligible
- ✅ Validation prevents double-booking
```

---

### **PHASE 7: UI/UX Testing**

#### Test 7.1: Responsive Design
```
Steps:
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)

Expected Result:
- ✅ Layout adapts correctly
- ✅ Navigation works on all sizes
- ✅ Tables/grids responsive
- ✅ No content cut off or overlapping
```

#### Test 7.2: Dark/Light Mode (if applicable)
```
Steps:
1. Toggle theme setting
2. Navigate through app

Expected Result:
- ✅ Colors update across UI
- ✅ Text contrast remains readable
- ✅ Maps and components update
```

#### Test 7.3: Toast Notifications
```
Steps:
1. Perform actions (post, assign, confirm)
2. Observe toast messages

Expected Result:
- ✅ Success toasts appear (green/primary color)
- ✅ Error toasts appear (red/destructive color)
- ✅ Auto-dismiss after 3-5 seconds
- ✅ Multiple toasts stack properly
```

#### Test 7.4: Loading States
```
Steps:
1. Navigate between pages
2. Wait for data loads

Expected Result:
- ✅ Loading indicators show (spinners, skeleton screens)
- ✅ LoadMindLoader component visible during fetch
- ✅ UI doesn't feel frozen
```

---

### **PHASE 8: Performance Testing**

#### Test 8.1: Page Load Time
```
Steps:
1. Open Network tab in DevTools
2. Navigate to Dashboard
3. Note load time

Expected Result:
- ✅ Dashboard loads in < 2 seconds
- ✅ AI Matcher loads in < 3 seconds
- ✅ History loads in < 2 seconds
```

#### Test 8.2: Data Fetch Performance
```
Steps:
1. Check Network tab
2. Monitor API calls

Expected Result:
- ✅ API responses < 1 second
- ✅ No N+1 query problems
- ✅ Efficient data fetching
```

#### Test 8.3: Large Dataset Handling
```
Steps:
1. Manually add 50+ demo loads to database
2. Navigate to AI Matcher

Expected Result:
- ✅ Page still loads in reasonable time
- ✅ No UI lag with pagination/virtualization
- ✅ Filters work smoothly
```

---

### **PHASE 9: API Testing**

#### Test 9.1: List Open Loads
```
Endpoint: GET /api/loads/open
Command: curl http://localhost:8000/api/loads/open

Expected Result:
- ✅ Returns 200 status
- ✅ JSON array of open loads
- ✅ Each load has required fields
```

#### Test 9.2: Create Load
```
Endpoint: POST /api/loads
Command: 
curl -X POST http://localhost:8000/api/loads \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": "Test",
    "origin": "Sydney",
    "destination": "Melbourne",
    "weight_kg": 5000,
    "value": 2500
  }'

Expected Result:
- ✅ Returns 200/201 status
- ✅ Returns created load with ID
```

#### Test 9.3: Assign Load
```
Endpoint: POST /api/loads/{id}/assign
Command:
curl -X POST http://localhost:8000/api/loads/{load_id}/assign \
  -H "Content-Type: application/json" \
  -d '{"vehicle_id": "vehicle_uuid"}'

Expected Result:
- ✅ Returns 200 status
- ✅ Load marked as assigned
```

---

### **PHASE 10: Database Testing**

#### Test 10.1: Verify Demo Data
```
Steps:
1. Connect to Supabase
2. Query "loads" table
3. Verify demo loads exist

Expected Result:
- ✅ DEMO-MEL-CBD-001 exists
- ✅ DEMO-SYD-NBR-001 exists
- ✅ DEMO-BNE-GC-001 exists
- ✅ DEMO-MEL-ADL-001 exists
```

#### Test 10.2: Verify User Roles
```
Steps:
1. Query "user_roles" table
2. Filter by test@test.com user ID

Expected Result:
- ✅ "shipper" role exists
- ✅ "carrier" role exists
- ✅ Both assigned to same user
```

#### Test 10.3: Verify Vehicles
```
Steps:
1. Query "vehicles" table
2. Filter by carrier_id

Expected Result:
- ✅ DEMO-VEH-001 exists (25T)
- ✅ DEMO-VEH-002 exists (20T)
- ✅ Both have trailers with dimensions
```

---

## Test Execution Summary

### Quick Test Checklist
- [ ] Authentication works
- [ ] Shipper Dashboard displays active shipments
- [ ] Shipper can post new shipment
- [ ] AI price suggestion works
- [ ] Carrier AI Matcher shows posted loads
- [ ] Carrier can filter loads
- [ ] Carrier can assign loads to vehicles
- [ ] Status updates bidirectionally
- [ ] Complete lifecycle works (post → assign → confirm → deliver)
- [ ] Maps display correctly
- [ ] Form validation works
- [ ] Error handling shows appropriate messages
- [ ] UI responsive on mobile/tablet
- [ ] Performance acceptable

---

## Bug Reporting Template

When issues are found:

```
Title: [Brief description]
Severity: Critical / High / Medium / Low
Steps to Reproduce:
1. ...
2. ...
3. ...

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Screenshots/Logs:
[Attach if possible]

Environment:
- Browser: Chrome 120 / Firefox 121 / Safari 17
- OS: Windows / Mac / Linux
- Screen size: Desktop / Tablet / Mobile
```

---

## Success Criteria

All tests pass when:
- ✅ No critical bugs found
- ✅ All workflows complete successfully
- ✅ Data persists correctly
- ✅ Performance meets expectations
- ✅ Error handling works appropriately
- ✅ UI responsive and intuitive
- ✅ API calls functional

---

**Test Date**: _______________
**Tester Name**: _______________
**Overall Status**: _______________


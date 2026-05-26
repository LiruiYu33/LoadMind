# LoadMind Testing Quick Reference

## 🚀 START HERE - 5 Step Quick Test

### 1️⃣ VERIFY SERVERS RUNNING
```
Backend: http://localhost:8000 ✅
Frontend: http://localhost:8080 ✅
```

### 2️⃣ LOGIN
```
URL: http://localhost:8080
Email: test@test.com
Password: 417230
```

### 3️⃣ SELECT SHIPPER ROLE
```
✓ See Dashboard with demo shipments
✓ Shows DEMO-MEL-CBD-001, etc.
```

### 4️⃣ SWITCH TO CARRIER ROLE
```
✓ See AI Matcher with marketplace loads
✓ Loads display with details & maps
```

### 5️⃣ ASSIGN LOAD TO TRUCK
```
✓ Click "Assign Load" on any load card
✓ Select DEMO-VEH-001 or DEMO-VEH-002
✓ See toast: "Load assigned"
```

---

## 🧪 COMPREHENSIVE TEST FLOW

```
┌─────────────────────────────────────┐
│ LOGIN (test@test.com / 417230)      │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
   SHIPPER         CARRIER
   
SHIPPER PATH:
├─ Dashboard
│  ├─ ✓ Active Shipments (demo loads)
│  ├─ ✓ Open Marketplace (demo listings)
│  └─ ✓ Confirm Pickup/Delivery
├─ History
│  ├─ ✓ Filter by status
│  ├─ ✓ Filter by date
│  └─ ✓ Filter by category
└─ Post Shipment
   ├─ ✓ Fill form
   ├─ ✓ Get AI price
   └─ ✓ Submit to marketplace

CARRIER PATH:
├─ AI Matcher
│  ├─ ✓ View marketplace loads
│  ├─ ✓ Search loads
│  ├─ ✓ Filter by category/weight
│  ├─ ✓ View route maps
│  └─ ✓ Assign to vehicle
├─ Fleet
│  ├─ ✓ View vehicles (DEMO-VEH-001, etc.)
│  ├─ ✓ See assigned loads
│  └─ ✓ Confirm pickup/delivery
└─ Cross-check
   └─ ✓ Verify shipper sees assignment
```

---

## ⚡ TEST SCENARIOS (Pick One)

### Scenario A: Quick Verification (15 min)
1. Login as Shipper → See dashboard ✓
2. View History → Verify loads ✓
3. Switch to Carrier → See marketplace ✓
4. Assign load → Done ✓

### Scenario B: Full Lifecycle (30 min)
1. Shipper: Post new shipment
2. Get price suggestion
3. Submit to marketplace
4. Carrier: Assign to vehicle
5. Carrier: Confirm pickup
6. Shipper: Confirm pickup
7. Carrier: Confirm delivery
8. Shipper: Confirm delivery
9. Verify in History

### Scenario C: AI Testing (20 min)
1. Carrier: Test all filters
2. Search marketplace
3. Check vehicle eligibility
4. Try capacity violation (should fail)
5. Try time conflict (should fail)
6. Successful assignment

### Scenario D: Error Handling (15 min)
1. Shipper: Try invalid time sequence
2. Leave required fields empty
3. Don't accept price
4. Carrier: Try incompatible vehicle
5. Verify error messages

---

## 📊 DASHBOARD SECTIONS

### SHIPPER DASHBOARD
```
┌─ ACTIVE SHIPMENTS ────────────────┐
│ Status: Scheduled / In Transit     │
│ Shows: Route, Carrier, ETA, Value  │
│ Actions: Confirm Pickup/Delivery   │
└────────────────────────────────────┘

┌─ OPEN IN MARKETPLACE ─────────────┐
│ Status: Open (not assigned)        │
│ Shows: Route, Weight, Value        │
│ Actions: Cancel Listing            │
└────────────────────────────────────┘

┌─ CANCELLED LOADS ─────────────────┐
│ Status: Cancelled (archived)       │
│ Actions: Restore Listing           │
└────────────────────────────────────┘
```

### CARRIER AI MATCHER
```
┌─ LOAD CARD ──────────────────────┐
│ Category Badge: "Electronics"     │
│ Weight: "5.0 t"                   │
│ Cargo: "Electronics & Appliances" │
│ Route: "Clayton → Melbourne CBD"  │
│ Value: "$3,500"                   │
│ Map: Visual route                 │
│ Button: "Assign Load"             │
└──────────────────────────────────┘
```

---

## ✅ SUCCESS INDICATORS

| Feature | How to Verify | Status |
|---------|---------------|--------|
| Login | Can access dashboard | ☐ |
| Demo Data | See DEMO-* loads | ☐ |
| Dashboard | All sections load | ☐ |
| AI Matcher | Loads visible with details | ☐ |
| Filters | Search/category/weight work | ☐ |
| Assignment | Can assign load to vehicle | ☐ |
| Maps | Routes display visually | ☐ |
| Status Sync | Updates across roles | ☐ |
| History | Loads appear after completion | ☐ |
| Forms | Validation catches errors | ☐ |

---

## 🔍 WHAT TO LOOK FOR

### ✓ Green Flags (Good)
- Fast page loads (< 3 seconds)
- Data appears immediately
- Filters respond instantly
- Toasts show clear messages
- Maps render with locations
- No console errors
- Smooth role switching
- Status updates real-time

### ✗ Red Flags (Issues)
- Blank screens or loading spinners
- Missing demo data
- Filters don't work
- No error messages
- Maps fail to load
- Console full of errors
- Role switching fails
- Stale data not updating

---

## 🛠️ QUICK FIXES

| Issue | Solution |
|-------|----------|
| No demo data | Run setup_demo_data.py script |
| API errors | Check backend running on :8000 |
| Map issues | Clear browser cache |
| Login fails | Verify Supabase credentials |
| Filters broken | Hard refresh (Ctrl+Shift+R) |
| Slow performance | Check network tab for delays |

---

## 📱 RESPONSIVE TESTING

Test at these breakpoints:
```
Desktop: 1920x1080 ✓
Tablet:  768x1024  ✓
Mobile:  375x667   ✓
```

All layouts should:
- Fit screen without horizontal scroll
- Text readable
- Buttons clickable
- Tables/cards responsive

---

## 🎯 PASS/FAIL CRITERIA

### PASS ✅
- All 5 quick steps complete successfully
- No critical errors shown
- Data displays correctly
- Assignment workflow functions
- Status updates work

### FAIL ❌
- Cannot login
- Demo data not visible
- Cannot assign loads
- Errors not handled gracefully
- Status doesn't sync

---

## 📝 TEST LOG TEMPLATE

```
Date: __________
Tester: __________
Time Spent: __________

Tests Run:
☐ Login
☐ Dashboard
☐ History
☐ Post Shipment
☐ AI Matcher
☐ Assignment
☐ Lifecycle

Issues Found:
1. ________________
2. ________________

Overall: PASS / FAIL

Next: ________________
```

---

## 🔗 USEFUL LINKS

- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Supabase: https://app.supabase.com
- Database: Check "loads", "vehicles", "user_roles" tables

---

## 💡 PRO TIPS

1. **Use Browser DevTools**
   - Network tab: See API calls
   - Console: Check for errors
   - Storage: View local data

2. **Two Browser Windows**
   - Window 1: Shipper (incognito)
   - Window 2: Carrier (incognito)
   - Test bidirectional updates

3. **Test All Filters**
   - Don't skip filter combinations
   - Edge cases: empty results, huge datasets

4. **Check Console**
   - Open DevTools → Console
   - No errors should appear
   - Warnings OK, errors bad

5. **Clear Cache**
   - If things look broken
   - Ctrl+Shift+Delete (DevTools)
   - Or Ctrl+Shift+R (hard refresh)

---

## 📞 SUPPORT

**Backend logs**: Terminal where backend runs
**Frontend logs**: Browser DevTools Console
**Database**: Supabase dashboard
**API test**: http://localhost:8000/docs

---

**Ready to test? Start with the 5 Step Quick Test above! 🚀**


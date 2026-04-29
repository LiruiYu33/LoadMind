
# LoadMind — Australian Freight Platform

A modern two-portal logistics platform with auth, role selection, real interactive dark maps, and a Lovable Cloud backend. Built strictly to the 7 mockups and the "Kinetic Architect" design system.

## Design system foundations
- **Colors (HSL tokens in `index.css`):** Industrial Deep palette — `surface` #f9f9fc, `surface_container_low`, `surface_container_lowest` (#fff), `primary_container` #001b3d, `inverse_surface` #2f3133, `tertiary_fixed` #69ff87 (Action Green, used sparingly), `error` #ba1a1a, `outline_variant` (used at 15% only).
- **Tonal layering, no 1px borders.** Sections separated by background shifts. "Ghost shadow" (`0 12px 32px rgba(26,28,30,0.04)`) for floating elements. Primary buttons use a navy→steel gradient.
- **Typography:** Manrope (display/headlines, KPIs) + Inter (body/tables/labels). All-caps `label-md` with 0.05rem tracking for section headers.
- **Map overlays:** Glassmorphism — `surface_container_lowest` @ 80% opacity, 20px backdrop blur, `xl` rounded corners.
- **Tables:** Alternating row tones, no dividers, right-aligned numerical data in `title-md`.

## Auth & roles (Lovable Cloud)
- Email/password auth via Lovable Cloud.
- **Login screen with role selection** — pick Carrier or Shipper before entering. Signup creates the account + assigns the chosen role.
- `user_roles` table (separate from auth, with `app_role` enum = `carrier | shipper` and a `has_role` security-definer function) — RLS-safe.
- After login, user is routed to the matching portal. Top-bar still shows email (no profile metadata stored).

## Carrier portal (Loadmind — "Melbourne Hub")
Sidebar: Dashboard · AI Load Matcher · Fleet Management. Footer CTA "Optimize Route" + Support/Logs.

1. **Dashboard** (mockup 1) — Full-bleed dark interactive Leaflet map (CartoDB Dark Matter tiles) with truck markers (`UNIT_BAL_12`, `UNIT_GEE_04`, `UNIT_MEL_01`, `UNIT_ALB_22`) across Victoria. Glass overlay KPI cards: Active Operations (32, +4.2%), Regional Efficiency (94%). Map legend (High Margin / Standard Transit). Below: **Fleet Live Manifest** table with Unit ID, Operator (avatar), Destination, Payload Status pills (On Time / Delayed), Est. Margin, Action.
2. **AI Recommended Next Load** (mockup 2) — Triggered from an idle truck marker. Glass side-panel: prime mover ID, route (Geelong → Mildura), Potential Margin, Load Type, AI Logic Engine reasoning, "Accept & Assign Load" green CTA, "View Alternative Routes". Below: **Fleet Overview** table (active/idle counts, search, filter) with Status, Current Location, Assignment, Fuel bar, ETA.
3. **AI Load Matcher** (mockup 4) — Header KPIs (Available Capacity, Optimized Margin). Tabs: All Loads / AI Matched. Stack of match cards (route, predicted profit, empty miles saved with score badge, load weight, AI reasoning, Assign/View Details). Right rail: **Network Pulse** dark card (fleet utilization, avg match score) + **Fleet Assignment Logs** activity feed.
4. **Fleet Management** (mockup 3) — "Fleet Command" header + Register New Vehicle CTA. **Active Assets** table (vehicle img, ID, model/year, driver with status pill, last journey, Edit). Right side detail panel: **Asset Specifications** (max capacity, fuel efficiency, preferred routes chips, Save / Decommission, AI Matching Active note). Below left: dark **Historical Patterns** card (deadhead hotspot, return cluster) + Live Spatial Analysis map thumbnail.

## Shipper portal (Loadmind — "Shipper Portal")
Sidebar: Dashboard · Post Shipment · Shipment History. Footer: Help Center / Sign Out.

5. **Dashboard** (mockup 5) — KPI row: Total Savings via Marketplace ($42,890.12, +12.4%), Monthly Shipment Volume (1,204, 98.2% on-time), Live Tracking card (12 vessels active, mini map). **Active Shipments** table (Shipment & Route, Carrier, Status pill, ETA, Value) with an Optimization Opportunity row + green "Accept Optimization" CTA. **Volume Trends** bar chart (Recharts) + **Average Transit Time** card.
6. **Post Shipment** (mockup 7) — Three numbered sections: Cargo Details (item, category, weight, L×W×H), Route Information (pickup/delivery), Cargo Documentation (image upload tiles). Right rail: **Price Insights** card (suggested marketplace price, base/surcharge/premium breakdown, optimization tip, route map preview, verified-carriers badge). Bottom CTA "Post Listing to Marketplace".
7. **Shipment History** (mockup 6) — KPIs (Total Shipments, **Avg. Margin per Load** highlighted dark card, On-Time Delivery Rate). Filter row (Route, Status, Date range, grid/list toggle). Stack of completed shipment rows with cargo icon, ID/date pill, origin → destination, carrier & weight, Net Margin badge. Pagination.

## Database (Lovable Cloud)
- `app_role` enum (`carrier`, `shipper`)
- `user_roles` (id, user_id → auth.users, role, unique(user_id, role)) + RLS + `has_role()` security-definer function
- `vehicles` (id, owner_id, unit_id, model, year, capacity_t, fuel_efficiency, status, location, preferred_routes[])
- `drivers` (id, owner_id, name, status, avatar_seed)
- `loads` (id, owner_id/shipper_id, origin, destination, weight, load_type, pickup_time, status, value, predicted_margin)
- `assignments` (id, load_id, vehicle_id, driver_id, status, eta)
- `shipments` (id, shipper_id, route_origin, route_destination, carrier, status, eta, value, net_margin, completed_at)
- All tables RLS-restricted to owner via `has_role(auth.uid(), 'carrier'|'shipper')` and ownership checks.
- Seed data on first carrier/shipper login so dashboards match the mockups out of the box.

## Tech & responsiveness
- Leaflet + react-leaflet with CartoDB Dark Matter tiles, custom truck div-icons, glass popup overlays.
- Recharts for the Volume Trends bar chart.
- Mobile: sidebar collapses to bottom nav / drawer; map cards stack; tables become condensed cards.
- All interactive (hover/click/tab) — no broken buttons.

## Build order
1. Cloud setup: enum, `user_roles`, `has_role`, RLS scaffolding, auth pages with role selector.
2. Design tokens in `index.css` + Tailwind extensions (Manrope/Inter, surface scale, gradient utility, glass utility).
3. Shared shell: sidebar, topbar (System Online pill, search, bell/settings/avatar), route guards by role.
4. Carrier: Dashboard → AI Load Matcher → Fleet Management → AI Recommended overlay.
5. Shipper: Dashboard → Post Shipment → Shipment History.
6. Seed data + responsive polish + end-to-end click-through.

# Product Roadmap

This roadmap summarises the current MVP scope, the core and optional features implemented so far, and the planned refinements after the FIT5239 Assessment 3 demonstration.

## Product Vision

LoadMind is a dry-goods freight matching platform for shippers and carriers. The product helps shippers post shipment requirements and helps carriers review, price, map, and assign suitable loads to their fleet.

The MVP focuses on a practical end-to-end workflow:

1. A shipper creates a dry-goods shipment.
2. The platform records pickup, delivery, cargo, schedule, dimensions, and value.
3. The backend provides AI-assisted price insight.
4. A carrier reviews open loads in AI Load Matcher.
5. The carrier checks route maps and load details.
6. The carrier assigns a load to a vehicle.
7. Both sides can follow the shipment status through pickup and delivery confirmation.

## Target Users

| User | Main Need | MVP Support |
| --- | --- | --- |
| Shipper | Post freight requirements quickly and clearly. | Shipment form, address autocomplete, map pin selection, dry-goods categories, price suggestion. |
| Carrier | Find suitable loads and assign them to vehicles. | AI Load Matcher, route maps, vehicle assignment, fleet view. |
| Operations user | Understand shipment status and reduce coordination ambiguity. | Dashboard, history, status fields, pickup/delivery confirmation. |

## Current MVP Scope

The MVP is limited to dry-goods freight. This keeps the product scope clear and avoids the extra compliance, equipment, temperature-control, and dangerous-goods requirements associated with refrigerated, hazardous, oversized, or specialised freight.

Dry-goods categories currently include:

- General Dry Freight
- Palletized Goods
- Packaged Consumer Goods
- Retail Merchandise
- Electronics & Appliances
- Furniture & Homewares
- Textiles & Apparel
- Paper & Printing Products
- Packaged Building Materials
- Machinery Parts
- Non-perishable Food & Beverages

## Implemented Core Features

| Feature | Status | Notes |
| --- | --- | --- |
| Role-based login | Implemented | Users choose Carrier or Shipper at sign-in. The same email can support both roles. |
| Shipper shipment posting | Implemented | Shippers can enter route, cargo, weight, dimensions, value, pickup time, and dropoff time. |
| Dry-goods category restriction | Implemented | Category options are restricted to dry-goods subcategories. |
| Manual address entry | Implemented | Address fields can be typed manually. |
| Address autocomplete | Implemented | Address candidates help users choose more complete street addresses. |
| Map pin address selection | Implemented | Users can select an address through a small OpenStreetMap-based map dialog. |
| AI price suggestion | Implemented | Backend uses route, weight, duration, exchange rate, and XGBoost pricing model output. |
| Carrier AI Load Matcher | Implemented | Carriers can review open marketplace loads and route information. |
| Load route maps | Implemented | Pickup and delivery locations are shown on OpenStreetMap cards. |
| Load assignment | Implemented | Carriers can assign an open load to a fleet vehicle. |
| Shipment status tracking | Implemented | Load status and confirmation fields support the workflow from posting to delivery. |
| Fleet management view | Implemented | Carriers can review vehicles and assigned loads. |
| Restart re-authentication | Implemented | Frontend/backend restart detection signs users out locally to reduce stale-session risk. |

## Implemented Optional Features

| Feature | Status | Strategic Value |
| --- | --- | --- |
| Remember password option | Implemented | Improves demonstration usability for repeated test logins. |
| Privacy Policy dialog | Implemented | Gives users a simple explanation of how operational data is handled. |
| Risk and security documentation | Implemented | Supports assessment Q&A on privacy, security, AI risk, and third-party dependencies. |
| Dry-goods migration | Implemented | Normalises older sample data to align with the dry-goods product scope. |
| Fixed sidebar sign-out placement | Implemented | Keeps sign-out accessible regardless of page length. |
| Expandable load details | Implemented | Long pickup, delivery, and time values can be expanded instead of being hidden. |
| Known-address geocoding fixes | Implemented | Reduces ambiguity for demonstration addresses such as Clayton and Melbourne CBD. |

## Roadmap Before Demo

Target date: 26 May 2026.

- Keep the MVP stable and avoid large refactors.
- Confirm frontend and backend can start from a clean local environment.
- Confirm Supabase migrations and demo data are ready.
- Prepare a stable Shipper demo account and Carrier demo account.
- Rehearse the end-to-end workflow at least twice.
- Prepare answers for AI/ML model choice, validation, privacy, risk, and roadmap questions.

## Roadmap Before Final Submission

Target deadline: 29 May 2026, 11:55 PM.

- Merge the stable MVP branch into the final submission branch.
- Complete GitLab repository cleanup: code, data, migrations, instructions, and no real secrets.
- Complete Moodle roadmap submission.
- Complete Feedback Fruit submission.
- Run and record local checks:
  - `npm run lint`
  - `npm run build`
  - `npm run test`
  - backend compile check
- Add or improve model validation evidence if time allows.
- Avoid high-risk feature changes after the live demo unless they fix a critical issue.

## Future Product Refinements

### 1 Month

- Add stronger backend role checks for every role-sensitive endpoint.
- Add database-level constraints for allowed dry-goods categories.
- Add a formal demo seed script for repeatable demonstration data.
- Add tests for dry-goods category normalisation, address aliases, and load lifecycle actions.
- Improve AI Load Matcher explanation with clearer "why this load" reasons.

### 3 Months

- Add model validation scripts and a committed validation dataset.
- Add confidence ranges for price suggestions.
- Store verified coordinates alongside full street addresses.
- Add audit logs for shipment creation, assignment, pickup confirmation, and delivery confirmation.
- Add production-ready error handling for third-party map, routing, and exchange-rate outages.

### 6 Months

- Integrate real carrier capacity, driver availability, and operational constraints.
- Support richer pricing inputs, such as fuel surcharge, lane demand, service level, and vehicle utilisation.
- Add customer-facing shipment notifications.
- Add enterprise reporting for operational performance, cost savings, and on-time delivery.
- Prepare legal review for production privacy policy and terms of use.

## Scope Not Included in the MVP

The MVP does not currently include:

- Payment, invoicing, or billing.
- Insurance verification.
- Driver identity verification.
- Hazardous goods compliance.
- Refrigerated freight temperature monitoring.
- Oversized or heavy-haul freight planning.
- Production-grade audit reporting.
- A fully validated commercial pricing model.

These exclusions are intentional so the MVP can focus on a clear and demonstrable dry-goods freight workflow.

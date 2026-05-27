# Risk and Security Assessment

This document records the main privacy, security, AI, and operational risks for the LoadMind MVP. It is intended as an internal assessment and demonstration support document, not as a user-facing privacy policy or legal compliance certification.

## Product Scope

LoadMind is an MVP for dry-goods freight matching. It supports two user roles:

- Shippers post dry-goods shipments with pickup and delivery details.
- Carriers review open loads, inspect route information, and assign loads to vehicles.
- Carrier assignment candidates are filtered by theoretical capability: vehicle status, schedule conflict, remaining capacity, and trailer dimensions.
- The backend provides authenticated APIs for load creation, load assignment, confirmation events, and AI-assisted price suggestions.
- Supabase provides authentication and database services.
- OpenStreetMap and route/geocoding services support address lookup and route visualisation.

## Data Handled

The MVP handles the following data categories:

- Account data: email address, authentication identity, selected role.
- Role data: carrier or shipper access records.
- Shipment data: cargo description, dry-goods category, weight, dimensions, value, pickup and delivery addresses, pickup and dropoff times.
- Operational data: vehicle unit, vehicle status, assignment status, pickup confirmation, delivery confirmation.
- Location data: addresses selected manually or through the map pin workflow.
- AI inputs and outputs: route, weight, duration, category, suggested price, and explanatory reasoning.

The MVP does not intentionally collect payment card data, health data, government identifiers, or driver licence information.

## Current Safeguards

- Authentication is handled through Supabase Auth rather than a custom password system.
- The same email can use both Carrier and Shipper roles, but the active portal is selected at login and stored separately.
- Backend API routes require a Supabase access token before load operations are performed.
- Service role credentials are intended to be used only by the backend and should not be exposed to the frontend.
- The frontend detects backend or frontend service restarts and signs the user out locally to reduce stale shared-session risk during demonstrations.
- Address selection writes readable street addresses back into forms instead of exposing raw coordinates as the main user-facing value.
- Dry-goods category options are constrained in the frontend, and a Supabase migration normalises older sample data.
- Shipment posting and vehicle registration include frontend validation for positive numeric values and valid pickup/dropoff time order.
- Backend schemas reject invalid load weights, dimensions, values, and invalid pickup/dropoff ordering before creating or pricing a load.
- Git ignore rules exclude local caches, virtual environments, generated Python cache files, and other local build artifacts.
- CI currently performs backend compile checks on the available GitLab shell runner.

## Privacy Principles

LoadMind is designed to follow these privacy principles:

- Transparency: users are told what operational data is used for account access, shipment posting, load matching, routing, and price suggestions.
- Purpose limitation: shipment and location data is used for freight matching and operational workflow, not unrelated profiling.
- Data minimisation: the MVP collects the information needed to create, match, assign, and track dry-goods shipments.
- Access control: users should only act within their selected role and authenticated session.
- Data quality: address autocomplete and map pin selection help reduce ambiguous or incomplete location data.
- Security: sensitive backend credentials remain server-side, and application security work is guided by OWASP-style secure web application practices.

These principles are aligned with guidance from the Australian Privacy Principles, GDPR-style processing principles, and OWASP web/data security guidance:

- OAIC Australian Privacy Principles: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines
- EDPB GDPR processing principles: https://www.edpb.europa.eu/gdpr-articles/article-5-principles-relating-processing-personal-data_en
- OWASP Top 10: https://owasp.org/Top10/
- OWASP Data Security Top 10: https://owasp.org/www-project-data-security-top-10/

## Risk Register

| Risk | Impact | Current Mitigation | Future Improvement |
| --- | --- | --- | --- |
| Wrong role access | A user may see or update workflow data outside the intended role. | RoleGuard protects frontend routes; backend routes require authenticated users. | Add stricter row-level security policies and backend role checks for every role-sensitive operation. |
| Exposed service role key | Full database access could be compromised. | Service role key is configured for backend use only and documented as a secret. | Enforce GitLab masked variables and rotate keys after demos or accidental exposure. |
| Ambiguous address geocoding | A load map may show the wrong pickup or delivery point. | Address autocomplete, map pin selection, and known address aliases improve accuracy. | Store verified coordinates alongside full street addresses and show a confirmation preview before submission. |
| Third-party map or routing outage | Address selection, route maps, or price suggestions may fail. | Manual address entry remains available. | Add cached geocoding results and graceful fallback messages. |
| AI price suggestion over-trust | Users may treat model output as a guaranteed market price. | Price reasoning is shown as an explanation, not a binding quote. | Add explicit confidence bands, historical comparison data, and human review labels. |
| Incorrect vehicle assignment | A carrier may assign a load to a truck that cannot physically or operationally take it. | UI candidate filtering and backend assignment validation check status, time conflict, capacity, and trailer dimensions. | Add database-side constraints, stronger dispatch rules, and automated tests for edge cases. |
| Incomplete dry-goods enforcement in old data | Old sample categories may conflict with product positioning. | Frontend category options are restricted; migration normalises existing records. | Add database constraints or lookup tables for allowed dry-goods categories. |
| Session reuse on shared device | Another person may access a previously logged-in session after service restart. | Service restart detection forces local sign-out. | Add configurable inactivity timeout and optional MFA through Supabase. |
| Limited automated testing | Regressions may be missed before demo. | CI runs backend compile checks; frontend lint/build/test can be run locally. | Add meaningful frontend unit tests, backend route tests, and CI frontend checks when a Node/Docker runner is available. |

## AI and Model Risks

The pricing feature uses a model-assisted suggestion workflow. The main risks are:

- Training data may not fully represent Australian dry-goods freight conditions.
- Model predictions may be sensitive to route distance, duration, and weight assumptions.
- Exchange rates, fuel prices, demand, and carrier availability may change after the prediction.
- Geocoding errors can affect route distance and therefore suggested price.

Mitigations:

- Show price reasoning so users can review the key inputs.
- Keep the output as a suggestion rather than an automatic contract price.
- Continue collecting validation data and compare suggested prices against accepted or completed loads.
- Document the model choice, features, limitations, and validation metrics separately in an AI model document.

## Demonstration Limitations

This MVP is suitable for demonstrating product feasibility and the core workflow, but it is not yet production-ready. The following limitations should be disclosed during assessment Q&A if asked:

- It uses a small MVP dataset and demonstration accounts.
- It does not yet implement full enterprise audit logging.
- It relies on third-party services for authentication, storage, map tiles, geocoding, routing, and exchange rate data.
- It does not currently include payment, invoicing, driver identity checks, insurance verification, or production-grade compliance reporting.

## Recommended Next Steps

- Add a formal database-level dry-goods category constraint.
- Add role-specific backend authorization checks and Supabase RLS review evidence.
- Add meaningful automated tests for authentication flow, role selection, address normalisation, dry-goods categories, and load lifecycle status changes.
- Add an AI model documentation file with model choice, training data, validation metrics, and alternatives considered.
- Add audit logs for important state transitions: load created, assigned, pickup confirmed, delivered, and sign-out.
- Add a production privacy policy and terms of use reviewed by a legal/privacy specialist before real deployment.

# LoadMind

LoadMind is a web platform for freight load matching and shipment management. It supports two user roles:

- **Shippers** can post shipments, enter pickup and delivery addresses, request price suggestions, track shipment status, and review shipment history.
- **Carriers** can browse AI-ranked loads, review pickup and delivery routes on a map, assign loads to fleet vehicles, and manage fleet information.

The product is designed around the common logistics workflow where a shipper creates a load, a carrier accepts and assigns it, and both sides confirm pickup and delivery.

## Main Features

- Role-based authentication for **Carrier** and **Shipper** users.
- The same email account can be used for both roles. The active portal depends on the role selected during login.
- Carrier **AI Load Matcher** page with load cards, matching scores, route information, sorting/filter controls, and assignment actions.
- Carrier assignment only shows vehicles that are theoretically capable of taking the load, based on vehicle status, schedule conflict, capacity, and trailer dimensions.
- Carrier **Route Optimizer** page for selecting a truck, adding marketplace/custom stops, and calculating an optimized stop order.
- Carrier **Fleet Management** page for registering vehicles and trailers, including required-field markers and numeric validation for fuel consumption and trailer capacity/dimensions.
- Shipper shipment posting flow with route, cargo, schedule, AI price suggestion, editable accepted price, and optional load notes.
- Shipper dashboard support for posted loads, cancelled load restore, active shipments, and confirmation actions.
- Shipper history page showing fulfilled shipments with route, category, date filters, list/grid view, and summary statistics.
- OpenStreetMap-based address selection:
  - map pin selector for address fields,
  - manual address entry with autocomplete candidates,
  - full street addresses are written back into form fields instead of raw coordinates.
- Small route maps on load cards showing pickup and delivery points.
- Backend API for load creation, load cancellation/restoration, load assignment, pickup confirmation, delivery confirmation, and price insight suggestions.

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/Radix UI components
- React Query
- Supabase Auth
- Leaflet and OpenStreetMap

### Backend

- Python 3.11+
- FastAPI
- Pydantic Settings
- Supabase integration
- Celery and Redis scaffold
- XGBoost, pandas, and NumPy for pricing/matching support

## Repository Structure

```text
LoadMind/
├── Backend/          # FastAPI backend service
├── Frontend/         # React/Vite frontend application
├── .gitlab-ci.yml    # Current GitLab CI configuration
├── .gitignore
└── README.md
```

## Prerequisites

Install these tools before running the project locally:

- Python 3.11 or newer
- Node.js and npm. Node 20 LTS is recommended for consistent frontend dependency installs.
- Git
- Docker Desktop, optional but recommended if you want to run Redis with Docker Compose
- A Supabase project with the required database tables and authentication enabled

## Environment Variables

Create local `.env` files for the frontend and backend. Do not commit real secrets to Git.

### Frontend

Create `Frontend/.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_BACKEND_URL=http://localhost:8000
```

### Backend

Create `Backend/.env`:

```bash
APP_NAME=LoadMind API
ENV=development
DEBUG=true
FRONTEND_URL=http://localhost:8080

HOST=0.0.0.0
PORT=8000

REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

ORS_API_KEY=your-openrouteservice-key
```

`SUPABASE_SERVICE_ROLE_KEY` should only be used by trusted backend code. In GitLab, store it in **Settings > CI/CD > Variables** as a masked/protected variable if it is needed by a pipeline.

## Install and Run Locally

Run the backend and frontend in separate terminal windows.

### 1. Start the Backend

```bash
cd Backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Check the backend:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok","env":"development"}
```

### 2. Start Redis, Optional

Redis is only required for Celery/background-worker flows. The core local UI can be inspected without starting the worker.

```bash
cd Backend
docker compose up -d redis
```

### 3. Start the Frontend

```bash
cd Frontend
npm install --legacy-peer-deps
npm run dev -- --host 0.0.0.0 --port 8080
```

Open the application in the browser:

```text
http://localhost:8080
```

If port `8080` is already in use, start Vite on another port:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

## How to Use the Product

### Sign in

1. Open `http://localhost:8080/auth`.
2. Choose either **Carrier** or **Shipper**.
3. Sign in or create an account with Supabase Auth.
4. The selected role controls which portal opens after login.

The same email can be used as both a carrier and a shipper. Choose the role you want to use when logging in.

### Carrier Workflow

1. Go to `/carrier`.
2. Review recommended loads in **AI Load Matcher**.
3. Use the current location address field manually or select a location with the map pin button.
4. Review the small route map on each load card. Pickup and delivery points are shown on OpenStreetMap.
5. Click **Assign Load** and choose a fleet vehicle.
6. Use the pickup and delivery confirmation actions when the shipment progresses.

### Shipper Workflow

1. Go to `/shipper`.
2. Open `/shipper/post`.
3. Enter route information, cargo details, pickup/dropoff times, optional load notes, and cargo dimensions if known.
4. Pickup and delivery addresses can be typed manually with autocomplete or selected using the map pin button.
5. Request an AI price suggestion, adjust the suggested price if needed, and accept the price.
6. Submit the shipment so carriers can see it in the load marketplace.
7. Track active, posted, cancelled, and fulfilled shipments from the dashboard and history pages.

## Backend API Overview

The frontend calls the backend using `VITE_BACKEND_URL`, defaulting to `http://localhost:8000`.

Useful routes include:

- `GET /health`
- `GET /api/v1/loads/open`
- `POST /api/v1/loads`
- `POST /api/v1/loads/{load_id}/assign`
- `POST /api/v1/loads/{load_id}/cancel`
- `POST /api/v1/loads/{load_id}/restore`
- `POST /api/v1/loads/{load_id}/confirm-pickup`
- `POST /api/v1/loads/{load_id}/confirm-delivery`
- `POST /api/v1/price-insights/suggest`

Most API routes require a Supabase access token from the logged-in user.

## Assessment Documentation

Assessment support documents are stored in:

- `docs/ROADMAP.md` - product roadmap for Moodle submission preparation.
- `docs/AI_MODEL.md` - AI/ML model choice, integration, alternatives, and limitations.
- `docs/DEMO_SCRIPT.md` - live demonstration walkthrough and Q&A preparation.
- `docs/DEMO_DATA.md` - repeatable Supabase demo seed data instructions.
- `docs/VALIDATION.md` - validation plan, technical checks, and model validation approach.
- `docs/RISK_SECURITY.md` - privacy, security, AI/model risk, third-party service risk, and MVP limitations.

The login page also includes a short user-facing **Privacy Policy** dialog. That dialog is a simplified user explanation, while the files in `docs/` provide fuller internal assessment support for the MVP.

## Testing and Build Commands

Frontend:

```bash
cd Frontend
npm run test
npm run lint
npm run build
```

Backend:

```bash
cd Backend
python3.11 -m pip install -e .
python3.11 -m py_compile app/main.py app/api/schemas/loads.py app/api/schemas/price_insights.py scripts/validate_pricing_model.py
python3.11 scripts/validate_pricing_model.py
```

The pricing validation script shows per-scenario rows by default. Use `--hide-rows` only when you want a shorter metrics-only output.

## GitLab CI/CD

The current `.gitlab-ci.yml` intentionally runs a backend-only check.

Reason:

- The available GitLab runner is currently a **shell executor**.
- The shell runner has Python 3.12 available, so it can install and compile the backend.
- The same runner does not have `npm` installed, so frontend jobs fail with `npm: command not found`.
- GitLab `image: node:...` only works with Docker/Kubernetes-style executors. It does not install Node.js on a shell runner.
- The old Docker runner is not currently available, so the frontend CI job is disabled for now.

Current backend pipeline behavior:

- uses the `fit2107` runner tag,
- installs the backend package with `python3.12 -m pip install -e .`,
- compiles the backend entrypoint and load schema with `python3.12 -m py_compile`,
- caches pip downloads under `Backend/.cache/pip/`.

When a Docker runner or a shell runner with Node/npm is available, frontend CI can be added back with jobs such as:

```yaml
frontend_check:
  stage: test
  image: node:22
  script:
    - cd Frontend
    - npm ci --legacy-peer-deps
    - npm run build
```

Do not add both `fit2099` and `fit2107` tags to one job unless the runner has both tags. In GitLab CI, job tags are matched with **AND** logic, not **OR** logic.

## Troubleshooting

### `npm install` fails with peer dependency errors

Use:

```bash
npm install --legacy-peer-deps
```

### Frontend cannot reach the backend

Check that:

- the backend is running on `http://localhost:8000`,
- `Frontend/.env` contains `VITE_BACKEND_URL=http://localhost:8000`,
- the backend `FRONTEND_URL` matches the Vite dev server URL.

### GitLab job is stuck

Check:

- project runners or instance runners are enabled for the project,
- the job tag matches an online runner,
- the runner is allowed to run untagged jobs if the job has no tag.

### GitLab frontend job says `npm: command not found`

That means the job is running on a shell runner without Node/npm. Use a Docker runner with a Node image, or ask the runner administrator to install Node.js on the shell runner.

## Notes for Contributors

- Do not commit `.env`, cache folders, build outputs, or dependency folders.
- Keep generated files such as `node_modules/`, `dist/`, `.cache/`, `.vite/`, and Python `__pycache__/` out of Git.
- Keep address fields user-readable. Store or display full street addresses where the UI asks for an address, not raw latitude/longitude values.
- Keep `Frontend/package-lock.json` tracked, but only commit it when frontend dependencies actually change. Different npm versions can rewrite it mechanically even when `package.json` is unchanged.

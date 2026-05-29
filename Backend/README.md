# Backend

Minimal Python backend scaffold for API, worker, and integrations.

## Quick start

1. Create and activate a virtual environment.
2. Install dependencies:
   - `pip install -e .`
3. Copy environment file:
   - `cp .env.example .env`
4. Run API (placeholder app):
   - `uvicorn app.main:app --reload`
5. Run Celery worker (after Redis is up):
   - `celery -A app.workers.celery_app worker --loglevel=info`

## Docker

Start Redis:

- `docker compose up -d redis`

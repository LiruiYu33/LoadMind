from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.loads import router as loads_router
from app.api.routes.price_insights import router as price_insights_router
from app.core.config import settings

SERVICE_INSTANCE_ID = str(uuid4())
SERVICE_STARTED_AT = datetime.now(timezone.utc).isoformat()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(loads_router)
app.include_router(price_insights_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "env": settings.env,
        "instance_id": SERVICE_INSTANCE_ID,
        "started_at": SERVICE_STARTED_AT,
    }


@app.get("/")
def root():
    return {"status": "ok"}

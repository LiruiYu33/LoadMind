from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "backend_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)


@celery_app.task
def ping() -> str:
    return "pong"

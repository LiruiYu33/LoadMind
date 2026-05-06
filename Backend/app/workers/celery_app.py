import asyncio
import logging

from celery import Celery

from app.ai.pricing import calculate_price
from app.core.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "backend_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)


@celery_app.task
def ping() -> str:
    return "pong"


@celery_app.task
def calculate_freight_price(
    weight_kg: float,
    origin_coords: list[float],
    destination_coords: list[float],
) -> dict:
    """
    Celery task to calculate freight price asynchronously.

    Args:
        weight_kg: Weight in kilograms
        origin_coords: [longitude, latitude]
        destination_coords: [longitude, latitude]

    Returns:
        dict with pricing details
    """
    try:
        result = asyncio.run(
            calculate_price(weight_kg, origin_coords, destination_coords)
        )
        return result
    except Exception as e:
        logger.error(f"Error calculating freight price: {e}")
        raise

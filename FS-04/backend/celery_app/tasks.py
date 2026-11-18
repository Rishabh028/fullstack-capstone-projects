import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def health_check_task():
    """Periodic or ad-hoc task to verify worker health."""
    logger.info("Celery health check task executed successfully.")
    return {"status": "ok"}

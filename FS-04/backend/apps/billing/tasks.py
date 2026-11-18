import logging
from celery import shared_task
from django.utils import timezone
from .models import Subscription

logger = logging.getLogger(__name__)


@shared_task
def sync_expired_subscriptions():
    """
    Periodic task to check and downgrade subscriptions that have reached end of canceled period.
    """
    now = timezone.now()
    expired = Subscription.objects.filter(
        cancel_at_period_end=True,
        current_period_end__lte=now
    ).exclude(plan='free')

    count = 0
    for sub in expired:
        sub.plan = 'free'
        sub.status = 'canceled'
        sub.save()
        workspace = sub.workspace
        workspace.plan = 'free'
        workspace.save(update_fields=['plan'])
        count += 1

    logger.info("Synchronized %d expired subscriptions to free plan.", count)
    return {"downgraded_count": count}

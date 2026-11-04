import json
import time
import hmac
import hashlib
import urllib.request
import urllib.error
import logging
from celery import shared_task
from .models import WebhookEndpoint, WebhookDelivery

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5)
def deliver_webhook(self, webhook_delivery_id):
    """
    Task to deliver webhook payload to endpoint target URL with HMAC-SHA256 signature.
    Retries with exponential backoff on failure.
    """
    try:
        delivery = WebhookDelivery.objects.select_related('endpoint').get(id=webhook_delivery_id)
    except WebhookDelivery.DoesNotExist:
        logger.warning("WebhookDelivery %s not found.", webhook_delivery_id)
        return

    endpoint = delivery.endpoint
    payload_bytes = json.dumps(delivery.payload, sort_keys=True).encode('utf-8')
    signature = hmac.new(endpoint.secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()  # noqa: S324

    req = urllib.request.Request(
        url=endpoint.target_url,
        data=payload_bytes,
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'SaaS-PM-Webhook/1.0',
            'X-Signature': signature,
            'X-Event': delivery.event,
        },
        method='POST'
    )

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.getcode()
            response_body = response.read()[:2000].decode('utf-8', errors='replace')
            elapsed_ms = int((time.time() - start_time) * 1000)

            delivery.status_code = status_code
            delivery.response_body = response_body
            delivery.execution_time_ms = elapsed_ms
            delivery.success = (200 <= status_code < 300)
            delivery.save()

            if not delivery.success:
                raise Exception(f"Webhook response status: {status_code}")

    except Exception as exc:
        elapsed_ms = int((time.time() - start_time) * 1000)
        status_code = getattr(exc, 'code', None)
        response_body = str(exc)[:2000]

        delivery.status_code = status_code
        delivery.response_body = response_body
        delivery.execution_time_ms = elapsed_ms
        delivery.success = False
        delivery.save()

        logger.warning(
            "Webhook delivery %s failed (attempt %s/%s): %s",
            webhook_delivery_id,
            self.request.retries + 1,
            self.max_retries,
            exc
        )
        try:
            countdown = (2 ** self.request.retries) * 5
            raise self.retry(exc=exc, countdown=countdown)
        except Exception:
            pass


@shared_task
def deliver_webhooks_for_event(workspace_id, event, payload):
    """
    Broadcast event to all matching active webhook endpoints for a workspace.
    """
    endpoints = WebhookEndpoint.objects.filter(workspace_id=workspace_id, is_active=True)

    for endpoint in endpoints:
        # Check event match: '*' matches all events, or exact match
        if '*' in endpoint.events or event in endpoint.events:
            delivery = WebhookDelivery.objects.create(
                endpoint=endpoint,
                event=event,
                payload=payload
            )
            deliver_webhook.delay(delivery.id)

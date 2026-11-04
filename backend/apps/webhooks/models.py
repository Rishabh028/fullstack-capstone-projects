import secrets
from django.db import models
from apps.workspaces.models import Workspace


class WebhookEndpoint(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='webhook_endpoints'
    )
    target_url = models.URLField(max_length=500)
    secret = models.CharField(max_length=64, blank=True)
    events = models.JSONField(default=list, help_text='List of subscribed events, e.g. ["issue.created", "issue.updated"]')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Webhook Endpoint'
        verbose_name_plural = 'Webhook Endpoints'

    def __str__(self):
        return f"{self.target_url} ({self.workspace.name})"

    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_hex(32)
        if not self.events:
            self.events = ['*']
        super().save(*args, **kwargs)


class WebhookDelivery(models.Model):
    endpoint = models.ForeignKey(
        WebhookEndpoint,
        on_delete=models.CASCADE,
        related_name='deliveries'
    )
    event = models.CharField(max_length=50)
    payload = models.JSONField()
    status_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(null=True, blank=True)
    success = models.BooleanField(default=False)
    attempted_at = models.DateTimeField(auto_now_add=True)
    execution_time_ms = models.IntegerField(default=0)

    class Meta:
        ordering = ['-attempted_at']
        verbose_name = 'Webhook Delivery'
        verbose_name_plural = 'Webhook Deliveries'

    def __str__(self):
        return f"{self.event} -> {self.endpoint.target_url} [Success: {self.success}]"

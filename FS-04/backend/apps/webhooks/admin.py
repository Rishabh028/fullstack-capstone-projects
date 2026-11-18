from django.contrib import admin
from .models import WebhookEndpoint, WebhookDelivery


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
    list_display = ('target_url', 'workspace', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'workspace')
    search_fields = ('target_url', 'workspace__name')
    raw_id_fields = ('workspace',)


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ('event', 'endpoint', 'status_code', 'success', 'attempted_at', 'execution_time_ms')
    list_filter = ('success', 'event', 'attempted_at')
    search_fields = ('endpoint__target_url', 'event', 'response_body')
    raw_id_fields = ('endpoint',)

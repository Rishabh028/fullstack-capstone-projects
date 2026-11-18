from rest_framework import serializers
from .models import WebhookEndpoint, WebhookDelivery


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = (
            'id',
            'workspace',
            'target_url',
            'secret',
            'events',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'workspace', 'secret', 'created_at', 'updated_at')


class WebhookDeliverySerializer(serializers.ModelSerializer):
    endpoint_url = serializers.CharField(source='endpoint.target_url', read_only=True)

    class Meta:
        model = WebhookDelivery
        fields = (
            'id',
            'endpoint',
            'endpoint_url',
            'event',
            'payload',
            'status_code',
            'response_body',
            'success',
            'attempted_at',
            'execution_time_ms',
        )
        read_only_fields = fields

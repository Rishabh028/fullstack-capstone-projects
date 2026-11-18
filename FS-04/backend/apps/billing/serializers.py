from rest_framework import serializers
from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    workspace_slug = serializers.CharField(source='workspace.slug', read_only=True)

    class Meta:
        model = Subscription
        fields = (
            'id',
            'workspace',
            'workspace_name',
            'workspace_slug',
            'plan',
            'status',
            'current_period_start',
            'current_period_end',
            'cancel_at_period_end',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class CreateCheckoutSessionSerializer(serializers.Serializer):
    workspace_slug = serializers.CharField(required=True)
    plan = serializers.ChoiceField(choices=['starter', 'pro', 'enterprise'], required=True)
    success_url = serializers.CharField(required=False)
    cancel_url = serializers.CharField(required=False)


class CreatePortalSessionSerializer(serializers.Serializer):
    workspace_slug = serializers.CharField(required=True)
    return_url = serializers.CharField(required=False)

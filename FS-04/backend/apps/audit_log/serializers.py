from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    issue_key = serializers.CharField(source='issue.key', read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'workspace',
            'issue',
            'issue_key',
            'user',
            'action',
            'field_name',
            'old_value',
            'new_value',
            'created_at',
        )
        read_only_fields = fields

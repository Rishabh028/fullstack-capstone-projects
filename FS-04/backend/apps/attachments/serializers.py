from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    uploader = UserSerializer(read_only=True)
    issue_key = serializers.CharField(source='issue.key', read_only=True)

    class Meta:
        model = Attachment
        fields = (
            'id',
            'issue',
            'issue_key',
            'uploader',
            'file',
            'file_name',
            'file_size',
            'content_type',
            'created_at',
        )
        read_only_fields = ('id', 'uploader', 'issue_key', 'file_name', 'file_size', 'created_at')

    def create(self, validated_data):
        file_obj = validated_data.get('file')
        if file_obj:
            if not validated_data.get('file_name'):
                validated_data['file_name'] = file_obj.name
            if not validated_data.get('file_size'):
                validated_data['file_size'] = file_obj.size
            if not validated_data.get('content_type') and hasattr(file_obj, 'content_type'):
                validated_data['content_type'] = file_obj.content_type
        return super().create(validated_data)

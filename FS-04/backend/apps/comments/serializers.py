from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    issue_key = serializers.CharField(source='issue.key', read_only=True)

    class Meta:
        model = Comment
        fields = (
            'id',
            'issue',
            'issue_key',
            'author',
            'content',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'author', 'issue_key', 'created_at', 'updated_at')

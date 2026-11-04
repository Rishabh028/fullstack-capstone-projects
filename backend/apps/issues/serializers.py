from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from apps.projects.models import Project
from apps.sprints.models import Sprint
from apps.boards.models import Board
from .models import Issue, Label


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ('id', 'workspace', 'name', 'color')
        read_only_fields = ('id', 'workspace')


class IssueListSerializer(serializers.ModelSerializer):
    key = serializers.ReadOnlyField()
    assignee = UserSerializer(read_only=True)
    reporter = UserSerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)

    class Meta:
        model = Issue
        fields = (
            'id',
            'key',
            'sequence_number',
            'title',
            'issue_type',
            'priority',
            'status',
            'order',
            'story_points',
            'due_date',
            'project',
            'project_key',
            'assignee',
            'reporter',
            'sprint',
            'labels',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'key', 'sequence_number', 'project_key', 'created_at', 'updated_at')


class IssueDetailSerializer(serializers.ModelSerializer):
    key = serializers.ReadOnlyField()
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assignee',
        write_only=True,
        required=False,
        allow_null=True
    )
    reporter = UserSerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        queryset=Label.objects.all(),
        source='labels',
        many=True,
        write_only=True,
        required=False
    )
    project_key = serializers.CharField(source='project.key', read_only=True)
    workspace_slug = serializers.CharField(source='workspace.slug', read_only=True)
    comments_count = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = (
            'id',
            'key',
            'sequence_number',
            'project',
            'project_key',
            'workspace',
            'workspace_slug',
            'board',
            'sprint',
            'title',
            'description',
            'issue_type',
            'priority',
            'status',
            'order',
            'story_points',
            'due_date',
            'assignee',
            'assignee_id',
            'reporter',
            'parent',
            'labels',
            'label_ids',
            'comments_count',
            'attachments_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'key',
            'sequence_number',
            'workspace',
            'workspace_slug',
            'project_key',
            'reporter',
            'comments_count',
            'attachments_count',
            'created_at',
            'updated_at',
        )

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_attachments_count(self, obj):
        return obj.attachments.count()


class IssueMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Issue.STATUSES, required=False)
    order = serializers.FloatField(required=True)
    board_column_id = serializers.IntegerField(required=False, allow_null=True)


class IssueBulkUpdateSerializer(serializers.Serializer):
    issue_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    status = serializers.ChoiceField(choices=Issue.STATUSES, required=False)
    priority = serializers.ChoiceField(choices=Issue.PRIORITIES, required=False)
    assignee_id = serializers.IntegerField(required=False, allow_null=True)
    sprint_id = serializers.IntegerField(required=False, allow_null=True)

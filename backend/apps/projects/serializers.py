import re
from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    lead = UserSerializer(read_only=True)
    lead_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='lead',
        write_only=True,
        required=False,
        allow_null=True
    )
    workspace_slug = serializers.CharField(source='workspace.slug', read_only=True)
    issue_count = serializers.ReadOnlyField()

    class Meta:
        model = Project
        fields = (
            'id',
            'workspace',
            'workspace_slug',
            'name',
            'key',
            'description',
            'lead',
            'lead_id',
            'status',
            'icon',
            'color',
            'issue_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'workspace', 'workspace_slug', 'issue_count', 'created_at', 'updated_at')

    def validate_key(self, value):
        val = value.strip().upper()
        if not re.match(r'^[A-Z][A-Z0-9]{1,9}$', val):
            raise serializers.ValidationError('Key must be 2-10 uppercase alphanumeric characters starting with a letter.')
        return val

    def create(self, validated_data):
        project = super().create(validated_data)

        # Automatically create default Kanban board with standard columns
        from apps.boards.models import Board, BoardColumn

        board = Board.objects.create(
            project=project,
            name=f"{project.name} Board",
            board_type='kanban',
            is_default=True
        )

        default_columns = [
            {'name': 'Backlog', 'maps_to_status': 'backlog', 'position': 0, 'color': '#64748b'},
            {'name': 'To Do', 'maps_to_status': 'todo', 'position': 1, 'color': '#3b82f6'},
            {'name': 'In Progress', 'maps_to_status': 'in_progress', 'position': 2, 'color': '#eab308'},
            {'name': 'In Review', 'maps_to_status': 'in_review', 'position': 3, 'color': '#8b5cf6'},
            {'name': 'Done', 'maps_to_status': 'done', 'position': 4, 'color': '#10b981'},
        ]

        for col in default_columns:
            BoardColumn.objects.create(board=board, **col)

        return project

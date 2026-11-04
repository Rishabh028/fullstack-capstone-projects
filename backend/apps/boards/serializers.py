from rest_framework import serializers
from .models import Board, BoardColumn


class BoardColumnSerializer(serializers.ModelSerializer):
    issue_count = serializers.SerializerMethodField()

    class Meta:
        model = BoardColumn
        fields = (
            'id',
            'board',
            'name',
            'color',
            'position',
            'issue_limit',
            'maps_to_status',
            'issue_count',
        )
        read_only_fields = ('id', 'issue_count')

    def get_issue_count(self, obj):
        from apps.issues.models import Issue
        return Issue.objects.filter(project=obj.board.project, status=obj.maps_to_status).count()


class BoardSerializer(serializers.ModelSerializer):
    columns = BoardColumnSerializer(many=True, read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)

    class Meta:
        model = Board
        fields = (
            'id',
            'project',
            'project_key',
            'name',
            'board_type',
            'is_default',
            'columns',
            'created_at',
        )
        read_only_fields = ('id', 'project_key', 'created_at')

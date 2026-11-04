from rest_framework import serializers
from .models import Sprint


class SprintSerializer(serializers.ModelSerializer):
    project_key = serializers.CharField(source='project.key', read_only=True)
    total_issues = serializers.ReadOnlyField()
    completed_issues = serializers.ReadOnlyField()

    class Meta:
        model = Sprint
        fields = (
            'id',
            'project',
            'project_key',
            'name',
            'goal',
            'status',
            'start_date',
            'end_date',
            'total_issues',
            'completed_issues',
            'created_at',
            'completed_at',
        )
        read_only_fields = ('id', 'project_key', 'total_issues', 'completed_issues', 'created_at', 'completed_at')


class SprintStartSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)


class SprintCompleteSerializer(serializers.Serializer):
    move_to_sprint_id = serializers.IntegerField(required=False, allow_null=True)

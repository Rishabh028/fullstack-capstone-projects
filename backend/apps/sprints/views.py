from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import IsWorkspaceMember
from apps.issues.models import Issue
from .models import Sprint
from .serializers import SprintSerializer, SprintStartSerializer, SprintCompleteSerializer


class SprintViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for managing Sprints in Scrum projects.
    Includes lifecycle actions: start_sprint and complete_sprint.
    """
    serializer_class = SprintSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'project']

    def get_queryset(self):
        user = self.request.user
        queryset = Sprint.objects.filter(
            project__workspace__members__user=user
        ).select_related('project')

        workspace_slug = self.request.query_params.get('workspace_slug')
        if workspace_slug:
            queryset = queryset.filter(project__workspace__slug=workspace_slug)

        return queryset.distinct()

    @action(detail=True, methods=['post'], url_path='start_sprint')
    def start_sprint(self, request, pk=None):
        """
        Start planning sprint -> active.
        """
        sprint = self.get_object()
        if sprint.status == 'active':
            raise ValidationError({'detail': 'This sprint is already active.'})
        if sprint.status == 'completed':
            raise ValidationError({'detail': 'Cannot start an already completed sprint.'})

        serializer = SprintStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data.get('start_date') or timezone.now().date()
        end_date = serializer.validated_data.get('end_date') or sprint.end_date

        sprint.status = 'active'
        sprint.start_date = start_date
        if end_date:
            sprint.end_date = end_date
        sprint.save()

        return Response(SprintSerializer(sprint).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='complete_sprint')
    def complete_sprint(self, request, pk=None):
        """
        Complete active sprint. Unfinished issues are moved to backlog or target sprint.
        """
        sprint = self.get_object()
        if sprint.status != 'active':
            raise ValidationError({'detail': 'Only active sprints can be completed.'})

        serializer = SprintCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_sprint_id = serializer.validated_data.get('move_to_sprint_id')
        target_sprint = None
        if target_sprint_id:
            target_sprint = Sprint.objects.filter(
                id=target_sprint_id,
                project=sprint.project
            ).exclude(status='completed').first()

        # Find unfinished issues
        unfinished_issues = Issue.objects.filter(sprint=sprint).exclude(status__in=['done', 'cancelled'])

        for issue in unfinished_issues:
            issue._current_user = request.user
            issue.sprint = target_sprint
            issue.save()

        sprint.status = 'completed'
        sprint.completed_at = timezone.now()
        sprint.save()

        return Response(
            {
                'detail': f'Sprint {sprint.name} marked as completed.',
                'sprint': SprintSerializer(sprint).data,
                'moved_issues_count': unfinished_issues.count(),
            },
            status=status.HTTP_200_OK
        )

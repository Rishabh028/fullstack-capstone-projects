from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.common.permissions import IsWorkspaceMember
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing audit logs across workspaces or specific issues.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['issue', 'action', 'user', 'field_name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = AuditLog.objects.filter(
            workspace__members__user=user
        ).select_related('user', 'issue', 'workspace')

        workspace_slug = self.request.query_params.get('workspace_slug')
        if workspace_slug:
            queryset = queryset.filter(workspace__slug=workspace_slug)

        issue_id = self.request.query_params.get('issue')
        if issue_id:
            queryset = queryset.filter(issue_id=issue_id)

        return queryset.distinct()

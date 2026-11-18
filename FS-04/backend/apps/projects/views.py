from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.common.mixins import WorkspaceScopedMixin
from apps.common.permissions import IsWorkspaceMember, IsWorkspaceOwnerOrAdmin
from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for Projects scoped to the active Workspace.
    """
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'key', 'description']
    ordering_fields = ['name', 'created_at', 'key']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [permissions.IsAuthenticated(), IsWorkspaceOwnerOrAdmin()]
        return [permissions.IsAuthenticated(), IsWorkspaceMember()]

    def get_queryset(self):
        workspace = self.get_workspace()
        return Project.objects.filter(workspace=workspace).select_related('lead', 'workspace')

from rest_framework.generics import get_object_or_404
from apps.workspaces.models import Workspace


class WorkspaceScopedMixin:
    """
    Mixin for ViewSets to filter querysets by workspace from URL kwargs or query parameters,
    and enforce multi-tenant isolation.
    """
    workspace_url_kwarg = 'workspace_slug'

    def get_workspace(self):
        slug = self.kwargs.get(self.workspace_url_kwarg)
        if not slug:
            slug = self.kwargs.get('slug')
        if not slug:
            slug = self.request.query_params.get('workspace_slug')
        if not slug:
            slug = self.request.query_params.get('workspace')

        if not slug:
            # Fall back to user's first accessible workspace or 404
            workspace = Workspace.objects.filter(members__user=self.request.user).first()
            if workspace:
                return workspace
            raise get_object_or_404(Workspace, slug='__non_existent__')

        return get_object_or_404(
            Workspace.objects.select_related('owner'),
            slug=slug,
            members__user=self.request.user
        )

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace = self.get_workspace()
        if hasattr(queryset.model, 'workspace'):
            return queryset.filter(workspace=workspace)
        return queryset

    def perform_create(self, serializer):
        workspace = self.get_workspace()
        if hasattr(serializer.Meta.model, 'workspace'):
            serializer.save(workspace=workspace)
        else:
            serializer.save()

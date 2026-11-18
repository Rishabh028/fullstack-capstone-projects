from rest_framework.permissions import BasePermission, SAFE_METHODS


def get_workspace_slug_from_context(request, view, obj=None):
    """Helper to extract workspace slug from kwargs, query params, or model object."""
    if obj is not None:
        if hasattr(obj, 'workspace'):
            return getattr(obj.workspace, 'slug', None)
        if hasattr(obj, 'slug') and obj.__class__.__name__ == 'Workspace':
            return obj.slug

    slug = view.kwargs.get('workspace_slug') or view.kwargs.get('slug')
    if not slug and request:
        slug = request.query_params.get('workspace_slug')
    return slug


class IsWorkspaceMember(BasePermission):
    """
    Allows access only to authenticated users who are active members
    of the workspace specified in the URL or object.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        slug = get_workspace_slug_from_context(request, view)
        if not slug:
            # If no workspace in URL, defer to has_object_permission or allow (e.g. workspace list)
            return True

        from apps.workspaces.models import WorkspaceMember
        return WorkspaceMember.objects.filter(
            workspace__slug=slug,
            user=request.user
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        from apps.workspaces.models import Workspace, WorkspaceMember
        if isinstance(obj, Workspace):
            workspace = obj
        elif hasattr(obj, 'workspace'):
            workspace = obj.workspace
        else:
            return True

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user
        ).exists()


class IsWorkspaceOwnerOrAdmin(BasePermission):
    """
    Allows access to workspace owners and admins.
    Viewers and regular members are restricted.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        slug = get_workspace_slug_from_context(request, view)
        if not slug:
            return True

        from apps.workspaces.models import WorkspaceMember
        return WorkspaceMember.objects.filter(
            workspace__slug=slug,
            user=request.user,
            role__in=['owner', 'admin']
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        from apps.workspaces.models import Workspace, WorkspaceMember
        if isinstance(obj, Workspace):
            workspace = obj
        elif hasattr(obj, 'workspace'):
            workspace = obj.workspace
        else:
            return True

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role__in=['owner', 'admin']
        ).exists()


class IsWorkspaceOwner(BasePermission):
    """
    Allows access only to the workspace owner.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        slug = get_workspace_slug_from_context(request, view)
        if not slug:
            return True

        from apps.workspaces.models import WorkspaceMember
        return WorkspaceMember.objects.filter(
            workspace__slug=slug,
            user=request.user,
            role='owner'
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        from apps.workspaces.models import Workspace, WorkspaceMember
        if isinstance(obj, Workspace):
            workspace = obj
        elif hasattr(obj, 'workspace'):
            workspace = obj.workspace
        else:
            return True

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role='owner'
        ).exists()


class IsWorkspaceMemberOrReadOnly(BasePermission):
    """
    Read-only for all members, modification restricted to owners/admins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        slug = get_workspace_slug_from_context(request, view)
        if not slug:
            return True

        from apps.workspaces.models import WorkspaceMember
        if request.method in SAFE_METHODS:
            return WorkspaceMember.objects.filter(
                workspace__slug=slug,
                user=request.user
            ).exists()
        return WorkspaceMember.objects.filter(
            workspace__slug=slug,
            user=request.user,
            role__in=['owner', 'admin']
        ).exists()

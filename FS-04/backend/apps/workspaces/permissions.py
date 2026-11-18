from rest_framework.permissions import BasePermission
from .models import Workspace, WorkspaceMember


class IsWorkspaceMember(BasePermission):
    """
    Checks if the user is a registered member of the workspace.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        slug = view.kwargs.get('slug') or view.kwargs.get('workspace_slug')
        if not slug:
            return True

        return WorkspaceMember.objects.filter(
            workspace__slug=slug,
            user=request.user
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        workspace = obj if isinstance(obj, Workspace) else getattr(obj, 'workspace', None)
        if not workspace:
            return True

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user
        ).exists()


class IsWorkspaceOwnerOrAdmin(BasePermission):
    """
    Checks if the user is an owner or admin of the workspace.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        slug = view.kwargs.get('slug') or view.kwargs.get('workspace_slug')
        if not slug:
            return True

        return WorkspaceMember.objects.filter(
            workspace__slug=slug,
            user=request.user,
            role__in=['owner', 'admin']
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        workspace = obj if isinstance(obj, Workspace) else getattr(obj, 'workspace', None)
        if not workspace:
            return True

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role__in=['owner', 'admin']
        ).exists()


class IsWorkspaceOwner(BasePermission):
    """
    Checks if the user is the primary owner of the workspace.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        slug = view.kwargs.get('slug') or view.kwargs.get('workspace_slug')
        if not slug:
            return True

        return WorkspaceMember.objects.filter(
            workspace__slug=slug,
            user=request.user,
            role='owner'
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        workspace = obj if isinstance(obj, Workspace) else getattr(obj, 'workspace', None)
        if not workspace:
            return True

        return workspace.owner == request.user or WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role='owner'
        ).exists()

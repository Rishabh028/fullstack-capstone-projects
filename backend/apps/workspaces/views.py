from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404

from .models import Workspace, WorkspaceMember, WorkspaceInvitation
from .serializers import (
    WorkspaceSerializer,
    WorkspaceMemberSerializer,
    WorkspaceInvitationSerializer,
    InviteMemberRequestSerializer,
    AcceptInvitationSerializer,
)
from .permissions import IsWorkspaceMember, IsWorkspaceOwnerOrAdmin, IsWorkspaceOwner


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Workspaces.
    - list: only workspaces user belongs to
    - retrieve/update: checks membership and admin privileges
    - destroy: owner only
    """
    serializer_class = WorkspaceSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['list', 'create']:
            return [permissions.IsAuthenticated()]
        if self.action in ['retrieve']:
            return [permissions.IsAuthenticated(), IsWorkspaceMember()]
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsWorkspaceOwnerOrAdmin()]
        if self.action in ['destroy']:
            return [permissions.IsAuthenticated(), IsWorkspaceOwner()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Workspace.objects.none()
        return Workspace.objects.filter(members__user=user).select_related('owner').distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class WorkspaceMemberViewSet(viewsets.ModelViewSet):
    """
    Manage members within a workspace:
    GET /api/workspaces/{slug}/members/
    PATCH /api/workspaces/{slug}/members/{pk}/
    DELETE /api/workspaces/{slug}/members/{pk}/
    """
    serializer_class = WorkspaceMemberSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsWorkspaceMember()]
        return [permissions.IsAuthenticated(), IsWorkspaceOwnerOrAdmin()]

    def get_workspace(self):
        slug = self.kwargs.get('workspace_slug') or self.kwargs.get('slug')
        return get_object_or_404(Workspace, slug=slug, members__user=self.request.user)

    def get_queryset(self):
        workspace = self.get_workspace()
        return WorkspaceMember.objects.filter(workspace=workspace).select_related('user', 'workspace')

    def perform_update(self, serializer):
        instance = self.get_object()
        new_role = serializer.validated_data.get('role', instance.role)
        workspace = instance.workspace

        # Protect against removing the only owner
        if instance.role == 'owner' and new_role != 'owner':
            other_owners = WorkspaceMember.objects.filter(
                workspace=workspace,
                role='owner'
            ).exclude(id=instance.id).exists()
            if not other_owners:
                raise ValidationError({'detail': 'Workspace must have at least one owner.'})

        serializer.save()

    def perform_destroy(self, instance):
        workspace = instance.workspace
        if instance.role == 'owner':
            other_owners = WorkspaceMember.objects.filter(
                workspace=workspace,
                role='owner'
            ).exclude(id=instance.id).exists()
            if not other_owners:
                raise ValidationError({'detail': 'Cannot remove the primary workspace owner.'})

        instance.delete()


class InviteMemberView(APIView):
    """
    Send an invitation to join the workspace.
    POST /api/workspaces/{slug}/invite/
    """
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceOwnerOrAdmin]

    def post(self, request, slug):
        workspace = get_object_or_404(Workspace, slug=slug, members__user=request.user)
        serializer = InviteMemberRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        role = serializer.validated_data['role']

        # Check if already a member
        if WorkspaceMember.objects.filter(workspace=workspace, user__email__iexact=email).exists():
            return Response(
                {'detail': 'A user with this email is already a member of this workspace.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check existing pending invitation
        invitation, created = WorkspaceInvitation.objects.get_or_create(
            workspace=workspace,
            email=email,
            defaults={
                'role': role,
                'invited_by': request.user,
                'expires_at': timezone.now() + timedelta(days=7),
            }
        )

        if not created:
            # Refresh expiration and role
            invitation.role = role
            invitation.expires_at = timezone.now() + timedelta(days=7)
            invitation.accepted_at = None
            invitation.save()

        # Send invitation email
        invite_link = f"{settings.FRONTEND_URL}/invite/{invitation.token}"
        try:
            send_mail(
                subject=f"You're invited to join {workspace.name} on SaaS PM",
                message=f"Hi,\n\n{request.user.full_name} has invited you to collaborate on {workspace.name} as a {role}.\n\nClick the link below to accept:\n{invite_link}\n\nThis invite expires in 7 days.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response(
            {
                'detail': 'Invitation created and sent.',
                'invitation': WorkspaceInvitationSerializer(invitation).data,
                'invite_link': invite_link
            },
            status=status.HTTP_201_CREATED
        )


class AcceptInvitationView(APIView):
    """
    Accept an invitation using its UUID token.
    POST /api/workspaces/invitations/{token}/accept/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(WorkspaceInvitation, token=token)

        if invitation.accepted_at is not None:
            return Response({'detail': 'This invitation has already been accepted.'}, status=status.HTTP_400_BAD_REQUEST)

        if invitation.expires_at < timezone.now():
            return Response({'detail': 'This invitation has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        workspace = invitation.workspace
        member, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=request.user,
            defaults={'role': invitation.role, 'invited_by': invitation.invited_by}
        )

        invitation.accepted_at = timezone.now()
        invitation.save()

        return Response(
            {
                'detail': f'Successfully joined workspace {workspace.name}.',
                'workspace': WorkspaceSerializer(workspace).data,
                'membership': WorkspaceMemberSerializer(member).data,
            },
            status=status.HTTP_200_OK
        )

import pytest
from django.urls import reverse
from rest_framework import status
from apps.workspaces.models import Workspace, WorkspaceMember, WorkspaceInvitation


@pytest.mark.django_db
class TestWorkspaces:
    def test_list_and_create_workspace(self, auth_client, test_user):
        url = reverse('workspaces:workspace-list')

        # Create workspace
        create_res = auth_client.post(url, {'name': 'Acme Engineering', 'description': 'Main workspace'})
        assert create_res.status_code == status.HTTP_201_CREATED
        slug = create_res.data['slug']
        assert slug == 'acme-engineering'

        # Check membership created
        workspace = Workspace.objects.get(slug=slug)
        assert workspace.owner == test_user
        assert WorkspaceMember.objects.filter(workspace=workspace, user=test_user, role='owner').exists()

        # List workspaces
        list_res = auth_client.get(url)
        assert list_res.status_code == status.HTTP_200_OK
        assert any(item['slug'] == slug for item in list_res.data.get('results', list_res.data))

    def test_retrieve_and_update_workspace(self, auth_client, test_user, test_workspace):
        url = reverse('workspaces:workspace-detail', kwargs={'slug': test_workspace.slug})
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['name'] == test_workspace.name

        # Update description
        patch_res = auth_client.patch(url, {'description': 'Updated description'})
        assert patch_res.status_code == status.HTTP_200_OK
        test_workspace.refresh_from_db()
        assert test_workspace.description == 'Updated description'

    def test_invite_and_accept_invitation(self, auth_client, test_user, test_workspace, create_user, api_client):
        invite_url = reverse('workspaces:invite_member', kwargs={'slug': test_workspace.slug})
        invite_res = auth_client.post(invite_url, {'email': 'colleague@example.com', 'role': 'member'})
        assert invite_res.status_code == status.HTTP_201_CREATED

        invitation = WorkspaceInvitation.objects.get(email='colleague@example.com', workspace=test_workspace)
        assert invitation.token is not None

        # Accept invitation with another user
        colleague = create_user(email='colleague@example.com', password='Password123!')
        api_client.force_authenticate(user=colleague)

        accept_url = reverse('workspaces:accept_invitation', kwargs={'token': invitation.token})
        accept_res = api_client.post(accept_url)
        assert accept_res.status_code == status.HTTP_200_OK

        invitation.refresh_from_db()
        assert invitation.accepted_at is not None
        assert WorkspaceMember.objects.filter(workspace=test_workspace, user=colleague, role='member').exists()

    def test_member_role_update_and_removal(self, auth_client, test_user, test_workspace, create_user):
        member_user = create_user(email='member@example.com')
        member = WorkspaceMember.objects.create(workspace=test_workspace, user=member_user, role='member')

        detail_url = reverse(
            'workspaces:workspace_member_detail',
            kwargs={'workspace_slug': test_workspace.slug, 'pk': member.pk}
        )

        # Update role to admin
        patch_res = auth_client.patch(detail_url, {'role': 'admin'})
        assert patch_res.status_code == status.HTTP_200_OK
        member.refresh_from_db()
        assert member.role == 'admin'

        # Remove member
        del_res = auth_client.delete(detail_url)
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not WorkspaceMember.objects.filter(pk=member.pk).exists()

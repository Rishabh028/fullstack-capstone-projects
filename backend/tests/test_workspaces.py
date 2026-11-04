import pytest
from django.urls import reverse
from rest_framework import status
from apps.workspaces.models import Workspace, WorkspaceMember, WorkspaceInvitation


@pytest.mark.django_db
class TestWorkspacesAPI:
    def test_workspace_isolation_and_crud(self, auth_client, test_user, test_workspace, create_user):
        other_user = create_user(email='stranger@saas.com')
        other_workspace = Workspace.objects.create(name='Stranger Org', slug='stranger-org', owner=other_user)
        WorkspaceMember.objects.create(workspace=other_workspace, user=other_user, role='owner')

        list_url = reverse('workspaces:workspace-list')
        res = auth_client.get(list_url)
        assert res.status_code == status.HTTP_200_OK
        slugs = [w['slug'] for w in res.data.get('results', res.data)]
        assert test_workspace.slug in slugs
        assert other_workspace.slug not in slugs

    def test_invitation_lifecycle(self, auth_client, test_workspace, create_user, api_client):
        invite_url = reverse('workspaces:invite_member', kwargs={'slug': test_workspace.slug})
        invite_res = auth_client.post(invite_url, {'email': 'joiner@example.com', 'role': 'member'})
        assert invite_res.status_code == status.HTTP_201_CREATED

        invitation = WorkspaceInvitation.objects.get(email='joiner@example.com', workspace=test_workspace)
        joiner = create_user(email='joiner@example.com')
        api_client.force_authenticate(user=joiner)

        accept_url = reverse('workspaces:accept_invitation', kwargs={'token': invitation.token})
        accept_res = api_client.post(accept_url)
        assert accept_res.status_code == status.HTTP_200_OK

        assert WorkspaceMember.objects.filter(workspace=test_workspace, user=joiner).exists()

import pytest
from django.urls import reverse
from rest_framework import status
from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember


@pytest.mark.django_db
class TestAccountsAPI:
    def test_registration_creates_workspace(self, api_client):
        url = reverse('accounts:register')
        payload = {
            'email': 'developer@startup.io',
            'first_name': 'Alex',
            'last_name': 'Smith',
            'password': 'SuperSecurePassword123!',
            'password_confirm': 'SuperSecurePassword123!',
        }
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert 'tokens' in response.data
        assert response.data['user']['email'] == 'developer@startup.io'

        user = User.objects.get(email='developer@startup.io')
        workspace = Workspace.objects.filter(owner=user).first()
        assert workspace is not None
        assert "Alex's Workspace" in workspace.name

        membership = WorkspaceMember.objects.filter(workspace=workspace, user=user).first()
        assert membership is not None
        assert membership.role == 'owner'

    def test_login_and_me_flow(self, api_client, create_user):
        user = create_user(email='founder@saas.com', password='Password123!')
        login_url = reverse('accounts:login')
        login_res = api_client.post(login_url, {'email': user.email, 'password': 'Password123!'})
        assert login_res.status_code == status.HTTP_200_OK

        access_token = login_res.data['tokens']['access']
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        me_url = reverse('accounts:me')
        me_res = api_client.get(me_url)
        assert me_res.status_code == status.HTTP_200_OK
        assert me_res.data['email'] == user.email

    def test_change_password(self, api_client, create_user):
        user = create_user(email='passchange@saas.com', password='OldPassword123!')
        api_client.force_authenticate(user=user)

        url = reverse('accounts:change_password')
        payload = {
            'old_password': 'OldPassword123!',
            'new_password': 'BrandNewPassword123!',
            'new_password_confirm': 'BrandNewPassword123!',
        }
        res = api_client.post(url, payload)
        assert res.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.check_password('BrandNewPassword123!')

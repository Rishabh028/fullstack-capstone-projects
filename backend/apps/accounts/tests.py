import pytest
from django.urls import reverse
from rest_framework import status
from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember


@pytest.mark.django_db
class TestAccounts:
    def test_register_creates_user_and_workspace(self, api_client):
        url = reverse('accounts:register')
        payload = {
            'email': 'newuser@example.com',
            'first_name': 'Jane',
            'last_name': 'Doe',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
        }
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert response.data['user']['email'] == 'newuser@example.com'

        user = User.objects.get(email='newuser@example.com')
        assert user.first_name == 'Jane'

        # Check default workspace
        workspace = Workspace.objects.filter(owner=user).first()
        assert workspace is not None
        assert "Jane's Workspace" in workspace.name
        membership = WorkspaceMember.objects.filter(workspace=workspace, user=user).first()
        assert membership is not None
        assert membership.role == 'owner'

    def test_register_password_mismatch(self, api_client):
        url = reverse('accounts:register')
        payload = {
            'email': 'mismatch@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'Password123!',
            'password_confirm': 'Different123!',
        }
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_successful(self, api_client, create_user):
        user = create_user(email='login@example.com', password='Password123!')
        url = reverse('accounts:login')
        response = api_client.post(url, {'email': 'login@example.com', 'password': 'Password123!'})
        assert response.status_code == status.HTTP_200_OK
        assert 'tokens' in response.data
        assert response.data['user']['email'] == user.email

    def test_login_invalid_credentials(self, api_client, create_user):
        create_user(email='valid@example.com', password='Password123!')
        url = reverse('accounts:login')
        response = api_client.post(url, {'email': 'valid@example.com', 'password': 'WrongPassword!'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_me_endpoint(self, auth_client, test_user):
        url = reverse('accounts:me')
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == test_user.email

        # Update bio
        patch_response = auth_client.patch(url, {'bio': 'Updated software engineer bio'})
        assert patch_response.status_code == status.HTTP_200_OK
        test_user.refresh_from_db()
        assert test_user.bio == 'Updated software engineer bio'

    def test_change_password(self, auth_client, test_user):
        url = reverse('accounts:change_password')
        payload = {
            'old_password': 'testpassword123',
            'new_password': 'BrandNewPassword123!',
            'new_password_confirm': 'BrandNewPassword123!',
        }
        response = auth_client.post(url, payload)
        assert response.status_code == status.HTTP_200_OK

        test_user.refresh_from_db()
        assert test_user.check_password('BrandNewPassword123!')

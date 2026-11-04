import pytest
from django.urls import reverse
from rest_framework import status
from apps.comments.models import Comment


@pytest.mark.django_db
class TestComments:
    def test_create_and_list_comments(self, auth_client, test_user, test_workspace, test_project, create_issue):
        issue = create_issue(project=test_project, title='Task with Comments')

        # Create comment via issue action
        comments_url = reverse('issues:issue-comments', kwargs={'pk': issue.id})
        res = auth_client.post(comments_url, {'content': 'Initial design looks promising!'})
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['content'] == 'Initial design looks promising!'

        # List comments
        list_res = auth_client.get(comments_url)
        assert list_res.status_code == status.HTTP_200_OK
        assert len(list_res.data) == 1
        assert list_res.data[0]['author']['email'] == test_user.email

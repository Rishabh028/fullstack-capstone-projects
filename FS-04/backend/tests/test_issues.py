import pytest
from django.urls import reverse
from rest_framework import status
from apps.issues.models import Issue


@pytest.mark.django_db
class TestIssuesAPI:
    def test_create_and_filter_issues(self, auth_client, test_workspace, test_project, create_issue):
        i1 = create_issue(project=test_project, title='Task High', priority='high', status='todo')
        i2 = create_issue(project=test_project, title='Bug Low', priority='low', status='done', issue_type='bug')

        list_url = reverse('issues:issue-list') + f"?workspace_slug={test_workspace.slug}&priority=high"
        res = auth_client.get(list_url)
        assert res.status_code == status.HTTP_200_OK
        results = res.data.get('results', res.data)
        assert len(results) == 1
        assert results[0]['id'] == i1.id

    def test_move_kanban_card(self, auth_client, test_workspace, test_project, create_issue):
        issue = create_issue(project=test_project, title='Card in Todo', status='todo', order=10.0)
        move_url = reverse('issues:issue-move', kwargs={'pk': issue.id})

        res = auth_client.post(move_url, {'status': 'in_progress', 'order': 15.0})
        assert res.status_code == status.HTTP_200_OK
        assert res.data['status'] == 'in_progress'
        assert res.data['order'] == 15.0

        issue.refresh_from_db()
        assert issue.status == 'in_progress'
        assert issue.order == 15.0

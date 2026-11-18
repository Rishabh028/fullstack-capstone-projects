import pytest
from django.urls import reverse
from rest_framework import status
from apps.issues.models import Issue
from apps.audit_log.models import AuditLog


@pytest.mark.django_db
class TestIssues:
    def test_create_issue_increments_sequence(self, auth_client, test_user, test_workspace, test_project):
        url = reverse('issues:issue-list')
        payload1 = {
            'project': test_project.id,
            'title': 'First feature task',
            'issue_type': 'task',
            'priority': 'high',
            'status': 'todo',
        }
        res1 = auth_client.post(url, payload1)
        assert res1.status_code == status.HTTP_201_CREATED
        assert res1.data['key'] == f"{test_project.key}-1"
        assert res1.data['sequence_number'] == 1

        payload2 = {
            'project': test_project.id,
            'title': 'Second bug task',
            'issue_type': 'bug',
            'priority': 'critical' if 'critical' in dict(Issue.PRIORITIES) else 'highest',
            'status': 'todo',
        }
        res2 = auth_client.post(url, payload2)
        assert res2.status_code == status.HTTP_201_CREATED
        assert res2.data['key'] == f"{test_project.key}-2"
        assert res2.data['sequence_number'] == 2

    def test_move_issue(self, auth_client, test_workspace, test_project, create_issue):
        issue = create_issue(project=test_project, title='Moveable Task', status='todo', order=1.0)
        url = reverse('issues:issue-move', kwargs={'pk': issue.id})

        res = auth_client.post(url, {'status': 'in_progress', 'order': 2.5})
        assert res.status_code == status.HTTP_200_OK
        assert res.data['status'] == 'in_progress'
        assert res.data['order'] == 2.5

        issue.refresh_from_db()
        assert issue.status == 'in_progress'
        assert issue.order == 2.5

    def test_bulk_update_issues(self, auth_client, test_workspace, test_project, create_issue):
        i1 = create_issue(project=test_project, title='Task 1', status='todo')
        i2 = create_issue(project=test_project, title='Task 2', status='todo')

        url = reverse('issues:issue-bulk-update')
        res = auth_client.post(url, {
            'issue_ids': [i1.id, i2.id],
            'status': 'done',
            'priority': 'low'
        })
        assert res.status_code == status.HTTP_200_OK
        assert res.data['updated'] == 2

        i1.refresh_from_db()
        i2.refresh_from_db()
        assert i1.status == 'done'
        assert i2.status == 'done'
        assert i1.priority == 'low'
        assert i2.priority == 'low'

    def test_audit_log_created_on_issue_update(self, auth_client, test_workspace, test_project, create_issue):
        issue = create_issue(project=test_project, title='Original Title', priority='medium')

        detail_url = reverse('issues:issue-detail', kwargs={'pk': issue.id})
        res = auth_client.patch(detail_url, {'title': 'Updated Title', 'priority': 'highest'})
        assert res.status_code == status.HTTP_200_OK

        logs = AuditLog.objects.filter(issue=issue, action='update')
        changed_fields = [log.field_name for log in logs]
        assert 'title' in changed_fields
        assert 'priority' in changed_fields

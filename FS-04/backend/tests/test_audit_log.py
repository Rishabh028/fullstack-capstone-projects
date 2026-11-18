import pytest
from django.urls import reverse
from rest_framework import status
from apps.audit_log.models import AuditLog


@pytest.mark.django_db
class TestAuditLogAPI:
    def test_audit_logs_recorded_on_issue_changes(self, auth_client, test_workspace, test_project, create_issue):
        # Create issue
        issue = create_issue(project=test_project, title='Initial Task Title', priority='medium')

        # Update priority and title
        detail_url = reverse('issues:issue-detail', kwargs={'pk': issue.id})
        res = auth_client.patch(detail_url, {'priority': 'high', 'title': 'Modified Task Title'})
        assert res.status_code == status.HTTP_200_OK

        # Query audit log API
        logs_url = reverse('audit_log:audit-log-list') + f"?workspace_slug={test_workspace.slug}&issue={issue.id}"
        log_res = auth_client.get(logs_url)
        assert log_res.status_code == status.HTTP_200_OK

        results = log_res.data.get('results', log_res.data)
        assert len(results) >= 2
        field_names = [item['field_name'] for item in results]
        assert 'priority' in field_names or 'title' in field_names

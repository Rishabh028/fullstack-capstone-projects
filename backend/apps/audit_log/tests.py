import pytest
from django.urls import reverse
from rest_framework import status
from apps.audit_log.models import AuditLog


@pytest.mark.django_db
class TestAuditLog:
    def test_audit_log_created_and_queryable(self, auth_client, test_workspace, test_project, test_user, create_issue):
        issue = create_issue(project=test_project, title='Original Title')

        # Update title
        detail_url = reverse('issues:issue-detail', kwargs={'pk': issue.id})
        auth_client.patch(detail_url, {'title': 'Changed Title'})

        # Query audit log endpoint
        log_url = reverse('audit_log:audit-log-list') + f"?workspace_slug={test_workspace.slug}&issue={issue.id}"
        res = auth_client.get(log_url)
        assert res.status_code == status.HTTP_200_OK

        results = res.data.get('results', res.data)
        assert len(results) >= 1
        assert any(item['field_name'] == 'title' for item in results)

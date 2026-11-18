import pytest
from django.urls import reverse
from rest_framework import status
from apps.sprints.models import Sprint


@pytest.mark.django_db
class TestSprintsAPI:
    def test_sprint_lifecycle(self, auth_client, test_workspace, test_project, create_issue):
        # 1. Create sprint
        sprint1 = Sprint.objects.create(project=test_project, name='Sprint Alpha', status='planning')
        sprint2 = Sprint.objects.create(project=test_project, name='Sprint Beta', status='planning')

        # 2. Start sprint
        start_url = reverse('sprints:sprint-start-sprint', kwargs={'pk': sprint1.id})
        start_res = auth_client.post(start_url)
        assert start_res.status_code == status.HTTP_200_OK
        sprint1.refresh_from_db()
        assert sprint1.status == 'active'

        # 3. Add issues
        issue_done = create_issue(project=test_project, sprint=sprint1, status='done')
        issue_wip = create_issue(project=test_project, sprint=sprint1, status='in_progress')

        # 4. Complete sprint and roll unfinished to Sprint Beta
        complete_url = reverse('sprints:sprint-complete-sprint', kwargs={'pk': sprint1.id})
        comp_res = auth_client.post(complete_url, {'move_to_sprint_id': sprint2.id})
        assert comp_res.status_code == status.HTTP_200_OK

        sprint1.refresh_from_db()
        assert sprint1.status == 'completed'

        issue_done.refresh_from_db()
        assert issue_done.sprint == sprint1

        issue_wip.refresh_from_db()
        assert issue_wip.sprint == sprint2

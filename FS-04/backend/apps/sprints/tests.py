import pytest
from django.urls import reverse
from rest_framework import status
from apps.sprints.models import Sprint


@pytest.mark.django_db
class TestSprints:
    def test_start_sprint(self, auth_client, test_workspace, test_project):
        sprint = Sprint.objects.create(project=test_project, name='Sprint 1', status='planning')
        url = reverse('sprints:sprint-start-sprint', kwargs={'pk': sprint.id})

        res = auth_client.post(url, {})
        assert res.status_code == status.HTTP_200_OK
        sprint.refresh_from_db()
        assert sprint.status == 'active'
        assert sprint.start_date is not None

    def test_complete_sprint_moves_unfinished_issues(self, auth_client, test_workspace, test_project, create_issue):
        sprint1 = Sprint.objects.create(project=test_project, name='Sprint 1', status='active')
        sprint2 = Sprint.objects.create(project=test_project, name='Sprint 2', status='planning')

        i_done = create_issue(project=test_project, sprint=sprint1, status='done')
        i_unfinished = create_issue(project=test_project, sprint=sprint1, status='in_progress')

        url = reverse('sprints:sprint-complete-sprint', kwargs={'pk': sprint1.id})
        res = auth_client.post(url, {'move_to_sprint_id': sprint2.id})
        assert res.status_code == status.HTTP_200_OK

        sprint1.refresh_from_db()
        assert sprint1.status == 'completed'
        assert sprint1.completed_at is not None

        i_done.refresh_from_db()
        assert i_done.sprint == sprint1  # stays in original sprint

        i_unfinished.refresh_from_db()
        assert i_unfinished.sprint == sprint2  # moved to next sprint

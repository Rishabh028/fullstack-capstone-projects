import pytest
from django.urls import reverse
from rest_framework import status
from apps.projects.models import Project
from apps.boards.models import Board, BoardColumn


@pytest.mark.django_db
class TestProjects:
    def test_create_project_and_default_board(self, auth_client, test_user, test_workspace):
        url = reverse('projects:project-list') + f"?workspace_slug={test_workspace.slug}"
        payload = {
            'name': 'Customer Portal',
            'key': 'CP',
            'description': 'Frontend portal for SaaS customers',
        }
        res = auth_client.post(url, payload)
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['key'] == 'CP'

        project = Project.objects.get(id=res.data['id'])
        assert project.workspace == test_workspace

        # Default board & 5 columns must be created
        board = Board.objects.filter(project=project, is_default=True).first()
        assert board is not None
        assert board.board_type == 'kanban'
        assert BoardColumn.objects.filter(board=board).count() == 5

    def test_list_projects_scoped_to_workspace(self, auth_client, test_workspace, create_project):
        p1 = create_project(workspace=test_workspace, name='Alpha', key='ALP')
        p2 = create_project(workspace=test_workspace, name='Beta', key='BET')

        url = reverse('projects:project-list') + f"?workspace_slug={test_workspace.slug}"
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        results = res.data.get('results', res.data)
        assert len(results) >= 2
        keys = [item['key'] for item in results]
        assert 'ALP' in keys
        assert 'BET' in keys

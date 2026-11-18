import pytest
from django.urls import reverse
from rest_framework import status
from apps.boards.models import Board, BoardColumn


@pytest.mark.django_db
class TestBoards:
    def test_list_project_boards(self, auth_client, test_workspace, test_project):
        url = reverse('boards:board-list') + f"?workspace_slug={test_workspace.slug}&project={test_project.id}"
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        results = res.data.get('results', res.data)
        assert len(results) >= 1
        assert results[0]['project'] == test_project.id

    def test_reorder_columns(self, auth_client, test_workspace, test_project):
        board = Board.objects.filter(project=test_project).first()
        cols = list(board.columns.all()[:2])
        col1, col2 = cols[0], cols[1]

        reorder_url = reverse('boards:board-column-reorder')
        payload = {
            'columns': [
                {'id': col1.id, 'position': 5},
                {'id': col2.id, 'position': 0},
            ]
        }
        res = auth_client.post(reorder_url, payload)
        assert res.status_code == status.HTTP_200_OK

        col1.refresh_from_db()
        col2.refresh_from_db()
        assert col1.position == 5
        assert col2.position == 0

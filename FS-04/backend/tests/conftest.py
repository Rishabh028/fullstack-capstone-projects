import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project
from apps.boards.models import Board, BoardColumn
from apps.issues.models import Issue


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_user():
    def _create_user(email='testuser@example.com', password='testpassword123', **kwargs):
        kwargs.setdefault('first_name', 'Test')
        kwargs.setdefault('last_name', 'User')
        return User.objects.create_user(email=email, password=password, **kwargs)
    return _create_user


@pytest.fixture
def test_user(create_user):
    return create_user(email='owner@example.com')


@pytest.fixture
def auth_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def test_workspace(test_user):
    workspace = Workspace.objects.create(
        name='Main Test Workspace',
        slug='main-test-workspace',
        owner=test_user,
        plan='free'
    )
    WorkspaceMember.objects.create(
        workspace=workspace,
        user=test_user,
        role='owner'
    )
    return workspace


@pytest.fixture
def create_project():
    def _create_project(workspace, name='Alpha Project', key='ALP', lead=None, **kwargs):
        project = Project.objects.create(
            workspace=workspace,
            name=name,
            key=key,
            lead=lead or workspace.owner,
            **kwargs
        )
        board = Board.objects.create(
            project=project,
            name=f"{project.name} Board",
            board_type='kanban',
            is_default=True
        )
        columns = [
            {'name': 'Backlog', 'maps_to_status': 'backlog', 'position': 0},
            {'name': 'To Do', 'maps_to_status': 'todo', 'position': 1},
            {'name': 'In Progress', 'maps_to_status': 'in_progress', 'position': 2},
            {'name': 'In Review', 'maps_to_status': 'in_review', 'position': 3},
            {'name': 'Done', 'maps_to_status': 'done', 'position': 4},
        ]
        for col in columns:
            BoardColumn.objects.create(board=board, **col)
        return project
    return _create_project


@pytest.fixture
def test_project(test_workspace, create_project):
    return create_project(workspace=test_workspace, name='Primary Project', key='PRIM')


@pytest.fixture
def create_issue():
    def _create_issue(project, title='Sample Issue', reporter=None, **kwargs):
        workspace = project.workspace
        rep = reporter or workspace.owner
        return Issue.objects.create(
            workspace=workspace,
            project=project,
            title=title,
            reporter=rep,
            **kwargs
        )
    return _create_issue

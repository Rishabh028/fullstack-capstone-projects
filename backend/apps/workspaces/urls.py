from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkspaceViewSet,
    WorkspaceMemberViewSet,
    InviteMemberView,
    AcceptInvitationView,
)

app_name = 'workspaces'

router = DefaultRouter()
router.register(r'', WorkspaceViewSet, basename='workspace')

urlpatterns = [
    path('invitations/<uuid:token>/accept/', AcceptInvitationView.as_view(), name='accept_invitation'),
    path('<slug:workspace_slug>/members/', WorkspaceMemberViewSet.as_view({'get': 'list'}), name='workspace_member_list'),
    path(
        '<slug:workspace_slug>/members/<int:pk>/',
        WorkspaceMemberViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'}),
        name='workspace_member_detail'
    ),
    path('<slug:slug>/invite/', InviteMemberView.as_view(), name='invite_member'),
    path('', include(router.urls)),
]

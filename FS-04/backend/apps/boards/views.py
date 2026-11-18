from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsWorkspaceMember, IsWorkspaceOwnerOrAdmin
from .models import Board, BoardColumn
from .serializers import BoardSerializer, BoardColumnSerializer


class BoardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Boards within a project/workspace.
    """
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        user = self.request.user
        queryset = Board.objects.filter(project__workspace__members__user=user).prefetch_related('columns').select_related('project')

        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        workspace_slug = self.request.query_params.get('workspace_slug')
        if workspace_slug:
            queryset = queryset.filter(project__workspace__slug=workspace_slug)

        return queryset.distinct()


class BoardColumnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing columns in a Board.
    """
    serializer_class = BoardColumnSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        user = self.request.user
        queryset = BoardColumn.objects.filter(
            board__project__workspace__members__user=user
        ).select_related('board', 'board__project')

        board_id = self.request.query_params.get('board')
        if board_id:
            queryset = queryset.filter(board_id=board_id)

        return queryset

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        Reorder columns: accepts a list of {id, position}
        """
        order_data = request.data.get('columns', [])
        for item in order_data:
            col_id = item.get('id')
            pos = item.get('position')
            if col_id is not None and pos is not None:
                BoardColumn.objects.filter(
                    id=col_id,
                    board__project__workspace__members__user=request.user
                ).update(position=pos)
        return Response({'status': 'reordered'}, status=status.HTTP_200_OK)

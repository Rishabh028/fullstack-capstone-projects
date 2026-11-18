from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from apps.common.permissions import IsWorkspaceMember
from .models import Comment
from .serializers import CommentSerializer


class CommentViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for issue comments.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        user = self.request.user
        queryset = Comment.objects.filter(
            issue__workspace__members__user=user
        ).select_related('author', 'issue', 'issue__project')

        issue_id = self.request.query_params.get('issue')
        if issue_id:
            queryset = queryset.filter(issue_id=issue_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('Only the author can edit this comment.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('Only the author can delete this comment.')
        instance.delete()

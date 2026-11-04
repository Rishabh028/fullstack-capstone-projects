from rest_framework import viewsets, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied
from apps.common.permissions import IsWorkspaceMember
from .models import Attachment
from .serializers import AttachmentSerializer


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling file attachments on issues.
    """
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        queryset = Attachment.objects.filter(
            issue__workspace__members__user=user
        ).select_related('uploader', 'issue')

        issue_id = self.request.query_params.get('issue')
        if issue_id:
            queryset = queryset.filter(issue_id=issue_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(uploader=self.request.user)

    def perform_destroy(self, instance):
        if instance.uploader != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('Only the uploader can delete this attachment.')
        instance.delete()

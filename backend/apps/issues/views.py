from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import IsWorkspaceMember
from .models import Issue, Label
from .serializers import (
    IssueListSerializer,
    IssueDetailSerializer,
    IssueMoveSerializer,
    IssueBulkUpdateSerializer,
    LabelSerializer,
)


class LabelViewSet(viewsets.ModelViewSet):
    """
    CRUD for Labels scoped to the user's workspace.
    """
    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        user = self.request.user
        queryset = Label.objects.filter(workspace__members__user=user)
        workspace_slug = self.request.query_params.get('workspace_slug')
        if workspace_slug:
            queryset = queryset.filter(workspace__slug=workspace_slug)
        return queryset.distinct()

    def perform_create(self, serializer):
        from apps.workspaces.models import Workspace
        workspace_slug = self.request.query_params.get('workspace_slug') or self.request.data.get('workspace_slug')
        if workspace_slug:
            workspace = Workspace.objects.get(slug=workspace_slug, members__user=self.request.user)
        else:
            workspace = Workspace.objects.filter(members__user=self.request.user).first()
        serializer.save(workspace=workspace)


class IssueViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Issues with filtering, drag-and-drop move, and bulk operations.
    """
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'issue_type', 'assignee', 'sprint', 'project']
    search_fields = ['title', 'description', 'sequence_number']
    ordering_fields = ['order', 'created_at', 'priority', 'sequence_number']
    ordering = ['order', '-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return IssueListSerializer
        if self.action == 'move':
            return IssueMoveSerializer
        if self.action == 'bulk_update':
            return IssueBulkUpdateSerializer
        return IssueDetailSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Issue.objects.filter(
            workspace__members__user=user
        ).select_related(
            'project', 'workspace', 'assignee', 'reporter', 'sprint', 'board'
        ).prefetch_related('labels').distinct()

        workspace_slug = self.request.query_params.get('workspace_slug')
        if workspace_slug:
            queryset = queryset.filter(workspace__slug=workspace_slug)

        project_key = self.request.query_params.get('project_key')
        if project_key:
            queryset = queryset.filter(project__key=project_key.upper())

        label_name = self.request.query_params.get('label')
        if label_name:
            queryset = queryset.filter(labels__name=label_name)

        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        instance = serializer.save(
            reporter=self.request.user,
            workspace=project.workspace
        )
        instance._current_user = self.request.user

    def perform_update(self, serializer):
        instance = serializer.save()
        instance._current_user = self.request.user

    @action(detail=True, methods=['patch', 'post'], url_path='move')
    def move(self, request, pk=None):
        """
        Move issue to a new status / order position (e.g. Kanban column change).
        """
        issue = self.get_object()
        serializer = IssueMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        new_order = serializer.validated_data['order']

        issue._current_user = request.user
        if new_status:
            issue.status = new_status
        issue.order = new_order
        issue.save()

        return Response(IssueDetailSerializer(issue).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk_update')
    def bulk_update(self, request):
        """
        Bulk update multiple issues simultaneously.
        """
        serializer = IssueBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        issue_ids = serializer.validated_data['issue_ids']
        issues = Issue.objects.filter(id__in=issue_ids, workspace__members__user=request.user)

        update_fields = {}
        if 'status' in serializer.validated_data:
            update_fields['status'] = serializer.validated_data['status']
        if 'priority' in serializer.validated_data:
            update_fields['priority'] = serializer.validated_data['priority']
        if 'assignee_id' in serializer.validated_data:
            update_fields['assignee_id'] = serializer.validated_data['assignee_id']
        if 'sprint_id' in serializer.validated_data:
            update_fields['sprint_id'] = serializer.validated_data['sprint_id']

        updated_count = 0
        for issue in issues:
            issue._current_user = request.user
            for k, v in update_fields.items():
                setattr(issue, k, v)
            issue.save()
            updated_count += 1

        return Response({'updated': updated_count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        """
        Get audit history of changes for this issue.
        """
        issue = self.get_object()
        from apps.audit_log.models import AuditLog
        from apps.audit_log.serializers import AuditLogSerializer

        logs = AuditLog.objects.filter(issue=issue).order_by('-created_at')
        return Response(AuditLogSerializer(logs, many=True).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        """
        List or create comments on this issue.
        """
        issue = self.get_object()
        from apps.comments.models import Comment
        from apps.comments.serializers import CommentSerializer

        if request.method == 'GET':
            comments = Comment.objects.filter(issue=issue).select_related('author')
            return Response(CommentSerializer(comments, many=True).data)

        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(issue=issue, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='attachments', parser_classes=[MultiPartParser, FormParser, JSONParser])
    def attachments(self, request, pk=None):
        """
        List or upload attachments on this issue.
        """
        issue = self.get_object()
        from apps.attachments.models import Attachment
        from apps.attachments.serializers import AttachmentSerializer

        if request.method == 'GET':
            attachments = Attachment.objects.filter(issue=issue).select_related('uploader')
            return Response(AttachmentSerializer(attachments, many=True).data)

        serializer = AttachmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(issue=issue, uploader=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

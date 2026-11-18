from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsWorkspaceOwnerOrAdmin, IsWorkspaceMember
from apps.common.mixins import WorkspaceScopedMixin
from .models import WebhookEndpoint, WebhookDelivery
from .serializers import WebhookEndpointSerializer, WebhookDeliverySerializer
from .tasks import deliver_webhook


class WebhookEndpointViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """
    CRUD ViewSet for managing workspace Webhook Endpoints.
    """
    serializer_class = WebhookEndpointSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceOwnerOrAdmin]

    def get_queryset(self):
        workspace = self.get_workspace()
        return WebhookEndpoint.objects.filter(workspace=workspace)


class WebhookDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet to view delivery logs and retry failed deliveries.
    """
    serializer_class = WebhookDeliverySerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = WebhookDelivery.objects.filter(
            endpoint__workspace__members__user=user
        ).select_related('endpoint')

        endpoint_id = self.request.query_params.get('endpoint')
        if endpoint_id:
            queryset = queryset.filter(endpoint_id=endpoint_id)

        return queryset

    @action(detail=True, methods=['post'], url_path='retry')
    def retry(self, request, pk=None):
        delivery = self.get_object()
        deliver_webhook.delay(delivery.id)
        return Response({'status': 'retry scheduled'}, status=status.HTTP_200_OK)

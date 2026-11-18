from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebhookEndpointViewSet, WebhookDeliveryViewSet

app_name = 'webhooks'

router = DefaultRouter()
router.register(r'deliveries', WebhookDeliveryViewSet, basename='webhook-delivery')
router.register(r'', WebhookEndpointViewSet, basename='webhook-endpoint')

urlpatterns = [
    path('', include(router.urls)),
]

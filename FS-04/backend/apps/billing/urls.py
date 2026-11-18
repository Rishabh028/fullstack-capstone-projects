from django.urls import path
from .views import (
    SubscriptionDetailView,
    CreateCheckoutSessionView,
    CreatePortalSessionView,
    StripeWebhookView,
)

app_name = 'billing'

urlpatterns = [
    path('', SubscriptionDetailView.as_view(), name='subscription_detail'),
    path('checkout/', CreateCheckoutSessionView.as_view(), name='checkout'),
    path('portal/', CreatePortalSessionView.as_view(), name='portal'),
    path('webhook/', StripeWebhookView.as_view(), name='webhook'),
]

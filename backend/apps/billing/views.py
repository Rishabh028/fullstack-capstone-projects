import stripe
import logging
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404

from apps.workspaces.models import Workspace
from apps.common.permissions import IsWorkspaceOwnerOrAdmin
from .models import Subscription
from .serializers import (
    SubscriptionSerializer,
    CreateCheckoutSessionSerializer,
    CreatePortalSessionSerializer,
)

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_PRICE_MAP = {
    'starter': settings.STRIPE_STARTER_PRICE_ID,
    'pro': settings.STRIPE_PRO_PRICE_ID,
    'enterprise': settings.STRIPE_ENTERPRISE_PRICE_ID,
}


def timestamp_to_datetime(ts):
    if not ts:
        return None
    return timezone.make_aware(datetime.fromtimestamp(ts))


class SubscriptionDetailView(APIView):
    """
    GET /api/billing/
    Retrieve current subscription for the workspace.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        workspace_slug = request.query_params.get('workspace_slug')
        if workspace_slug:
            workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        else:
            workspace = Workspace.objects.filter(members__user=request.user).first()
            if not workspace:
                return Response({'detail': 'No workspace found.'}, status=status.HTTP_404_NOT_FOUND)

        sub, _ = Subscription.objects.get_or_create(
            workspace=workspace,
            defaults={'plan': workspace.plan, 'status': 'active'}
        )
        return Response(SubscriptionSerializer(sub).data, status=status.HTTP_200_OK)


class CreateCheckoutSessionView(APIView):
    """
    POST /api/billing/checkout/
    Create a Stripe Checkout Session for subscription upgrade.
    """
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceOwnerOrAdmin]

    def post(self, request):
        serializer = CreateCheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspace_slug = serializer.validated_data['workspace_slug']
        plan = serializer.validated_data['plan']
        success_url = serializer.validated_data.get('success_url') or f"{settings.FRONTEND_URL}/billing?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = serializer.validated_data.get('cancel_url') or f"{settings.FRONTEND_URL}/billing?canceled=true"

        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        price_id = PLAN_PRICE_MAP.get(plan)

        if not price_id:
            return Response({'detail': f'Price for plan {plan} is not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        sub, _ = Subscription.objects.get_or_create(workspace=workspace)

        customer_id = sub.stripe_customer_id
        if not customer_id:
            try:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=workspace.name,
                    metadata={'workspace_id': str(workspace.id), 'workspace_slug': workspace.slug}
                )
                customer_id = customer.id
                sub.stripe_customer_id = customer_id
                sub.save(update_fields=['stripe_customer_id'])
            except Exception as exc:
                logger.error("Error creating stripe customer: %s", exc)
                return Response({'detail': 'Stripe customer creation failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{'price': price_id, 'quantity': 1}],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={'workspace_id': str(workspace.id), 'plan': plan}
            )
            return Response({'checkout_url': session.url, 'session_id': session.id}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error("Error creating stripe checkout session: %s", exc)
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class CreatePortalSessionView(APIView):
    """
    POST /api/billing/portal/
    Create Stripe Customer Billing Portal session.
    """
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceOwnerOrAdmin]

    def post(self, request):
        serializer = CreatePortalSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspace_slug = serializer.validated_data['workspace_slug']
        return_url = serializer.validated_data.get('return_url') or f"{settings.FRONTEND_URL}/billing"

        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        sub = getattr(workspace, 'subscription', None)

        if not sub or not sub.stripe_customer_id:
            return Response({'detail': 'No active billing profile for this workspace.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            portal_session = stripe.billing_portal.Session.create(
                customer=sub.stripe_customer_id,
                return_url=return_url
            )
            return Response({'portal_url': portal_session.url}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error("Error creating billing portal session: %s", exc)
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    POST /api/billing/webhook/
    Process inbound Stripe webhooks to keep subscriptions synchronized.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

        if not sig_header and not settings.DEBUG:
            return Response({'detail': 'Missing Stripe signature header.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response({'detail': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            if not settings.DEBUG:
                return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
            # In testing/debug, parse raw payload
            import json
            event = json.loads(payload.decode('utf-8'))

        event_type = event['type']
        data_object = event['data']['object']

        logger.info("Processing Stripe webhook: %s", event_type)

        if event_type == 'checkout.session.completed':
            self._handle_checkout_completed(data_object)
        elif event_type in ['customer.subscription.updated', 'customer.subscription.created']:
            self._handle_subscription_updated(data_object)
        elif event_type == 'customer.subscription.deleted':
            self._handle_subscription_deleted(data_object)
        elif event_type == 'invoice.payment_succeeded':
            self._handle_invoice_payment_succeeded(data_object)

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    def _handle_checkout_completed(self, session):
        metadata = session.get('metadata', {})
        workspace_id = metadata.get('workspace_id')
        plan = metadata.get('plan')
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')

        if workspace_id:
            try:
                workspace = Workspace.objects.get(id=workspace_id)
                if plan:
                    workspace.plan = plan
                    workspace.save(update_fields=['plan'])

                sub, _ = Subscription.objects.get_or_create(workspace=workspace)
                sub.stripe_customer_id = customer_id or sub.stripe_customer_id
                sub.stripe_subscription_id = subscription_id or sub.stripe_subscription_id
                sub.plan = plan or sub.plan
                sub.status = 'active'
                sub.save()
            except Workspace.DoesNotExist:
                logger.error("Workspace %s not found for checkout completed.", workspace_id)

    def _handle_subscription_updated(self, stripe_sub):
        customer_id = stripe_sub.get('customer')
        sub = Subscription.objects.filter(stripe_customer_id=customer_id).first()
        if not sub:
            return

        sub.stripe_subscription_id = stripe_sub.get('id', '')
        sub.status = stripe_sub.get('status', 'active')
        sub.cancel_at_period_end = stripe_sub.get('cancel_at_period_end', False)
        sub.current_period_start = timestamp_to_datetime(stripe_sub.get('current_period_start'))
        sub.current_period_end = timestamp_to_datetime(stripe_sub.get('current_period_end'))
        sub.save()

    def _handle_subscription_deleted(self, stripe_sub):
        customer_id = stripe_sub.get('customer')
        sub = Subscription.objects.filter(stripe_customer_id=customer_id).first()
        if not sub:
            return

        sub.status = 'canceled'
        sub.plan = 'free'
        sub.save()

        workspace = sub.workspace
        workspace.plan = 'free'
        workspace.save(update_fields=['plan'])

    def _handle_invoice_payment_succeeded(self, invoice):
        customer_id = invoice.get('customer')
        sub = Subscription.objects.filter(stripe_customer_id=customer_id).first()
        if sub:
            sub.status = 'active'
            sub.save(update_fields=['status'])

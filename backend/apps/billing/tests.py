import json
import pytest
from django.urls import reverse
from rest_framework import status
from apps.billing.models import Subscription


@pytest.mark.django_db
class TestBilling:
    def test_get_subscription(self, auth_client, test_workspace):
        url = reverse('billing:subscription_detail') + f"?workspace_slug={test_workspace.slug}"
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['plan'] == test_workspace.plan
        assert res.data['workspace_slug'] == test_workspace.slug

    def test_webhook_checkout_completed(self, api_client, test_workspace):
        url = reverse('billing:webhook')
        event_payload = {
            'id': 'evt_test_checkout',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'customer': 'cus_test_12345',
                    'subscription': 'sub_test_67890',
                    'metadata': {
                        'workspace_id': str(test_workspace.id),
                        'plan': 'pro'
                    }
                }
            }
        }

        res = api_client.post(
            url,
            data=json.dumps(event_payload),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        assert res.status_code == status.HTTP_200_OK

        test_workspace.refresh_from_db()
        assert test_workspace.plan == 'pro'

        sub = Subscription.objects.get(workspace=test_workspace)
        assert sub.plan == 'pro'
        assert sub.stripe_customer_id == 'cus_test_12345'
        assert sub.stripe_subscription_id == 'sub_test_67890'
        assert sub.status == 'active'

    def test_webhook_subscription_deleted(self, api_client, test_workspace):
        test_workspace.plan = 'pro'
        test_workspace.save()

        sub = Subscription.objects.create(
            workspace=test_workspace,
            stripe_customer_id='cus_cancel_123',
            plan='pro',
            status='active'
        )

        url = reverse('billing:webhook')
        event_payload = {
            'id': 'evt_test_delete',
            'type': 'customer.subscription.deleted',
            'data': {
                'object': {
                    'customer': 'cus_cancel_123',
                }
            }
        }

        res = api_client.post(
            url,
            data=json.dumps(event_payload),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        assert res.status_code == status.HTTP_200_OK

        test_workspace.refresh_from_db()
        assert test_workspace.plan == 'free'

        sub.refresh_from_db()
        assert sub.plan == 'free'
        assert sub.status == 'canceled'

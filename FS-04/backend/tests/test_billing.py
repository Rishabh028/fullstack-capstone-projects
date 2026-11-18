import json
import pytest
from django.urls import reverse
from rest_framework import status
from apps.billing.models import Subscription


@pytest.mark.django_db
class TestBillingAPI:
    def test_subscription_retrieval(self, auth_client, test_workspace):
        url = reverse('billing:subscription_detail') + f"?workspace_slug={test_workspace.slug}"
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['plan'] == 'free'
        assert res.data['status'] == 'active'

    def test_webhook_lifecycle(self, api_client, test_workspace):
        url = reverse('billing:webhook')
        webhook_data = {
            'id': 'evt_mock_001',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'customer': 'cus_mock_999',
                    'subscription': 'sub_mock_888',
                    'metadata': {
                        'workspace_id': str(test_workspace.id),
                        'plan': 'enterprise'
                    }
                }
            }
        }

        res = api_client.post(
            url,
            data=json.dumps(webhook_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='mock_sig'
        )
        assert res.status_code == status.HTTP_200_OK

        test_workspace.refresh_from_db()
        assert test_workspace.plan == 'enterprise'

        sub = Subscription.objects.get(workspace=test_workspace)
        assert sub.plan == 'enterprise'
        assert sub.stripe_customer_id == 'cus_mock_999'

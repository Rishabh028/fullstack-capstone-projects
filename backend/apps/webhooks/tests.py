import pytest
from django.urls import reverse
from rest_framework import status
from apps.webhooks.models import WebhookEndpoint, WebhookDelivery


@pytest.mark.django_db
class TestWebhooks:
    def test_create_endpoint_and_list_deliveries(self, auth_client, test_workspace):
        url = reverse('webhooks:webhook-endpoint-list') + f"?workspace_slug={test_workspace.slug}"
        payload = {
            'target_url': 'https://example.com/webhook-receiver',
            'events': ['issue.created', 'issue.updated'],
            'is_active': True,
        }
        res = auth_client.post(url, payload)
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['target_url'] == 'https://example.com/webhook-receiver'
        assert res.data['secret'] != ''

        endpoint = WebhookEndpoint.objects.get(id=res.data['id'])
        delivery = WebhookDelivery.objects.create(
            endpoint=endpoint,
            event='issue.created',
            payload={'title': 'Webhook task'},
            status_code=200,
            success=True
        )

        delivery_url = reverse('webhooks:webhook-delivery-list') + f"?endpoint={endpoint.id}"
        del_res = auth_client.get(delivery_url)
        assert del_res.status_code == status.HTTP_200_OK
        results = del_res.data.get('results', del_res.data)
        assert len(results) == 1
        assert results[0]['success'] is True

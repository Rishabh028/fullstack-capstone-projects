import pytest
from django.urls import reverse
from rest_framework import status
from apps.notifications.models import Notification


@pytest.mark.django_db
class TestNotifications:
    def test_notification_flow(self, auth_client, test_user):
        # Create unread notification
        notification = Notification.objects.create(
            recipient=test_user,
            verb='assigned you to issue',
            message='You have been assigned to PROJ-1',
            is_read=False
        )

        unread_url = reverse('notifications:notification-unread-count')
        res = auth_client.get(unread_url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['unread_count'] == 1

        # Mark read
        mark_url = reverse('notifications:notification-mark-read', kwargs={'pk': notification.id})
        mark_res = auth_client.post(mark_url)
        assert mark_res.status_code == status.HTTP_200_OK

        notification.refresh_from_db()
        assert notification.is_read is True

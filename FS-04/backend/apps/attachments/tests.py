import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from apps.attachments.models import Attachment


@pytest.mark.django_db
class TestAttachments:
    def test_upload_and_list_attachment(self, auth_client, test_workspace, test_project, create_issue):
        issue = create_issue(project=test_project, title='Task with Attachments')

        upload_url = reverse('issues:issue-attachments', kwargs={'pk': issue.id})
        dummy_file = SimpleUploadedFile("architecture_diagram.png", b"file_binary_content", content_type="image/png")

        res = auth_client.post(upload_url, {'file': dummy_file}, format='multipart')
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['file_name'] == 'architecture_diagram.png'

        list_res = auth_client.get(upload_url)
        assert list_res.status_code == status.HTTP_200_OK
        assert len(list_res.data) == 1

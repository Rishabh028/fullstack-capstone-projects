from django.contrib import admin
from .models import Attachment


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'issue', 'uploader', 'file_size', 'created_at')
    search_fields = ('file_name', 'uploader__email', 'issue__key')
    list_filter = ('created_at', 'content_type')
    raw_id_fields = ('issue', 'uploader')

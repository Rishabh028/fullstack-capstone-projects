from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('issue', 'action', 'field_name', 'user', 'created_at')
    list_filter = ('action', 'created_at', 'workspace')
    search_fields = ('field_name', 'old_value', 'new_value', 'user__email', 'issue__title')
    raw_id_fields = ('workspace', 'issue', 'user')
    readonly_fields = ('workspace', 'issue', 'user', 'action', 'field_name', 'old_value', 'new_value', 'created_at')

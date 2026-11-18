from django.contrib import admin
from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'workspace', 'lead', 'status', 'created_at')
    list_filter = ('status', 'workspace', 'created_at')
    search_fields = ('name', 'key', 'workspace__name', 'lead__email')
    raw_id_fields = ('workspace', 'lead')

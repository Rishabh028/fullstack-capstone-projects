from django.contrib import admin
from .models import Sprint


@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'status', 'start_date', 'end_date', 'completed_at')
    list_filter = ('status', 'project__workspace', 'project')
    search_fields = ('name', 'goal', 'project__name', 'project__key')
    raw_id_fields = ('project',)

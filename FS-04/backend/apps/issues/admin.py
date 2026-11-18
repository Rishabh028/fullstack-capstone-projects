from django.contrib import admin
from .models import Issue, Label


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'workspace')
    search_fields = ('name', 'workspace__name')
    list_filter = ('workspace',)


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ('key', 'title', 'issue_type', 'priority', 'status', 'project', 'assignee', 'created_at')
    list_filter = ('issue_type', 'priority', 'status', 'project__workspace', 'project')
    search_fields = ('title', 'description', 'sequence_number', 'project__key')
    raw_id_fields = ('workspace', 'project', 'board', 'sprint', 'assignee', 'reporter', 'parent')
    filter_horizontal = ('labels',)

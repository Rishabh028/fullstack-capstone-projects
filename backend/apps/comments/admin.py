from django.contrib import admin
from .models import Comment


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('issue', 'author', 'created_at', 'updated_at')
    search_fields = ('content', 'author__email', 'issue__title')
    list_filter = ('created_at', 'issue__project')
    raw_id_fields = ('issue', 'author')

from django.contrib import admin
from .models import Board, BoardColumn


class BoardColumnInline(admin.TabularInline):
    model = BoardColumn
    extra = 1
    ordering = ('position',)


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'board_type', 'is_default', 'created_at')
    list_filter = ('board_type', 'is_default')
    search_fields = ('name', 'project__name', 'project__key')
    raw_id_fields = ('project',)
    inlines = [BoardColumnInline]


@admin.register(BoardColumn)
class BoardColumnAdmin(admin.ModelAdmin):
    list_display = ('name', 'board', 'maps_to_status', 'position', 'issue_limit')
    list_filter = ('maps_to_status', 'board')
    search_fields = ('name', 'board__name')
    raw_id_fields = ('board',)

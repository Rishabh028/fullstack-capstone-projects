from django.contrib import admin
from .models import Workspace, WorkspaceMember, WorkspaceInvitation


class WorkspaceMemberInline(admin.TabularInline):
    model = WorkspaceMember
    extra = 1
    raw_id_fields = ('user', 'invited_by')


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'owner', 'plan', 'created_at')
    search_fields = ('name', 'slug', 'owner__email')
    list_filter = ('plan', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [WorkspaceMemberInline]


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ('workspace', 'user', 'role', 'joined_at')
    list_filter = ('role', 'joined_at')
    search_fields = ('workspace__name', 'user__email')
    raw_id_fields = ('workspace', 'user', 'invited_by')


@admin.register(WorkspaceInvitation)
class WorkspaceInvitationAdmin(admin.ModelAdmin):
    list_display = ('workspace', 'email', 'role', 'invited_by', 'expires_at', 'accepted_at', 'created_at')
    list_filter = ('role', 'created_at', 'expires_at')
    search_fields = ('email', 'workspace__name', 'invited_by__email')
    raw_id_fields = ('workspace', 'invited_by')

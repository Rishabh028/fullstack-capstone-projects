import uuid
from django.utils.text import slugify
from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import Workspace, WorkspaceMember, WorkspaceInvitation


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    member_count = serializers.ReadOnlyField()
    project_count = serializers.ReadOnlyField()

    class Meta:
        model = Workspace
        fields = (
            'id',
            'name',
            'slug',
            'description',
            'logo',
            'owner',
            'plan',
            'member_count',
            'project_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'owner', 'plan', 'created_at', 'updated_at', 'member_count', 'project_count')

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request else validated_data.get('owner')

        name = validated_data.get('name')
        slug = validated_data.get('slug')
        if not slug:
            base_slug = slugify(name)
            slug = base_slug or 'workspace'
            if Workspace.objects.filter(slug=slug).exists():
                slug = f"{slug}-{uuid.uuid4().hex[:6]}"
            validated_data['slug'] = slug

        validated_data['owner'] = user
        workspace = super().create(validated_data)

        # Create workspace membership for the owner
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role='owner'
        )

        return workspace


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = WorkspaceMember
        fields = (
            'id',
            'workspace',
            'user',
            'user_id',
            'role',
            'joined_at',
            'invited_by',
        )
        read_only_fields = ('id', 'workspace', 'user', 'joined_at', 'invited_by')

    def validate_role(self, value):
        if value not in dict(WorkspaceMember.ROLE_CHOICES):
            raise serializers.ValidationError(f"Invalid role '{value}'.")
        return value


class WorkspaceInvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSerializer(read_only=True)
    workspace_name = serializers.ReadOnlyField(source='workspace.name')

    class Meta:
        model = WorkspaceInvitation
        fields = (
            'id',
            'workspace',
            'workspace_name',
            'email',
            'role',
            'token',
            'invited_by',
            'expires_at',
            'accepted_at',
            'created_at',
        )
        read_only_fields = ('id', 'workspace', 'token', 'invited_by', 'expires_at', 'accepted_at', 'created_at')


class InviteMemberRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=WorkspaceMember.ROLE_CHOICES, default='member')


class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.UUIDField()

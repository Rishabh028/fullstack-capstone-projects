from rest_framework import status, permissions
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView, GenericAPIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
)


class RegisterView(CreateAPIView):
    """
    Register a new user account, generate JWT tokens, and create a default workspace.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data

        from apps.workspaces.serializers import WorkspaceSerializer
        workspace_data = None
        if hasattr(user, '_default_workspace') and user._default_workspace:
            workspace_data = WorkspaceSerializer(user._default_workspace).data

        return Response(
            {
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': user_data,
                'workspace': workspace_data,
            },
            status=status.HTTP_201_CREATED
        )


class LoginView(GenericAPIView):
    """
    Authenticate user with email and password, returning tokens and profile.
    """
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user_data = UserSerializer(data['user']).data

        return Response(
            {
                'tokens': {
                    'access': data['access'],
                    'refresh': data['refresh'],
                },
                'user': user_data,
            },
            status=status.HTTP_200_OK
        )


class RefreshView(TokenRefreshView):
    """
    Refresh expired access token using valid refresh token.
    """
    permission_classes = [permissions.AllowAny]


class MeView(RetrieveUpdateAPIView):
    """
    Retrieve or update the currently authenticated user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(GenericAPIView):
    """
    Change the authenticated user's password.
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)

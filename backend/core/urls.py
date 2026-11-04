from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # API Documentation (OpenAPI 3 / Swagger / Redoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Core SaaS & Domain Modules
    path('api/auth/', include('apps.accounts.urls', namespace='accounts')),
    path('api/workspaces/', include('apps.workspaces.urls', namespace='workspaces')),
    path('api/projects/', include('apps.projects.urls', namespace='projects')),
    path('api/boards/', include('apps.boards.urls', namespace='boards')),
    path('api/issues/', include('apps.issues.urls', namespace='issues')),
    path('api/sprints/', include('apps.sprints.urls', namespace='sprints')),
    path('api/comments/', include('apps.comments.urls', namespace='comments')),
    path('api/attachments/', include('apps.attachments.urls', namespace='attachments')),
    path('api/audit-log/', include('apps.audit_log.urls', namespace='audit_log')),
    path('api/notifications/', include('apps.notifications.urls', namespace='notifications')),
    path('api/webhooks/', include('apps.webhooks.urls', namespace='webhooks')),
    path('api/billing/', include('apps.billing.urls', namespace='billing')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

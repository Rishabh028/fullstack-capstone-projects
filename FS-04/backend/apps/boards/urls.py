from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardViewSet, BoardColumnViewSet

app_name = 'boards'

router = DefaultRouter()
router.register(r'columns', BoardColumnViewSet, basename='board-column')
router.register(r'', BoardViewSet, basename='board')

urlpatterns = [
    path('', include(router.urls)),
]

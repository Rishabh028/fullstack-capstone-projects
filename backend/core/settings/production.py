from .base import *  # noqa: F401, F403
from decouple import config, Csv

DEBUG = False

ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', cast=Csv())

# Security Headers & Cookies
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Static files with Whitenoise
if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:  # noqa: F405
    try:
        sec_index = MIDDLEWARE.index('django.middleware.security.SecurityMiddleware')  # noqa: F405
        MIDDLEWARE.insert(sec_index + 1, 'whitenoise.middleware.WhiteNoiseMiddleware')  # noqa: F405
    except ValueError:
        MIDDLEWARE.insert(0, 'whitenoise.middleware.WhiteNoiseMiddleware')  # noqa: F405

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

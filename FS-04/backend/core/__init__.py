try:
    from celery_app.celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    pass

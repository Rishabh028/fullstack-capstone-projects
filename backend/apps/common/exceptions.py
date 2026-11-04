import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that standardizes error responses:
    {
        "success": false,
        "error": {
            "type": "ValidationError" | "PermissionDenied" | etc.,
            "message": "Human readable summary",
            "details": {...} or [...]
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        view = context.get('view')
        view_name = view.__class__.__name__ if view else 'UnknownView'
        error_type = exc.__class__.__name__

        # Extract message summary
        message = 'An error occurred while processing your request.'
        if isinstance(response.data, dict) and 'detail' in response.data:
            message = str(response.data['detail'])
            details = response.data
        elif isinstance(response.data, (dict, list)):
            message = 'Invalid input data.'
            details = response.data
        else:
            details = str(response.data)

        custom_data = {
            'success': False,
            'error': {
                'type': error_type,
                'message': message,
                'details': details,
            }
        }
        response.data = custom_data
        logger.warning(
            "Handled API exception in %s: %s (status %s)",
            view_name,
            exc,
            response.status_code
        )
    else:
        logger.exception("Unhandled server exception in API: %s", exc)

    return response

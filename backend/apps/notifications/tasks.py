import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from apps.accounts.models import User
from apps.issues.models import Issue
from .models import Notification

logger = logging.getLogger(__name__)


@shared_task
def send_issue_notification(issue_id, actor_id=None, event_type='issue.updated', changes=None):
    """
    Celery task to generate notifications for issue events.
    """
    try:
        issue = Issue.objects.select_related('project', 'workspace', 'assignee', 'reporter').get(id=issue_id)
    except Issue.DoesNotExist:
        logger.warning("Issue %s not found for notification task.", issue_id)
        return

    actor = None
    if actor_id:
        actor = User.objects.filter(id=actor_id).first()

    actor_name = actor.full_name if actor else 'System'

    # Gather recipients: assignee and reporter, excluding the actor
    recipients = set()
    if issue.assignee:
        recipients.add(issue.assignee)
    if issue.reporter:
        recipients.add(issue.reporter)

    if actor in recipients:
        recipients.remove(actor)

    if not recipients:
        return

    if event_type == 'issue.created':
        verb = 'created issue'
        message = f"{actor_name} created issue [{issue.key}] {issue.title}"
    else:
        changed_keys = ", ".join(changes.keys()) if changes else 'details'
        verb = f"updated {changed_keys} on"
        message = f"{actor_name} updated {changed_keys} on [{issue.key}] {issue.title}"

    for recipient in recipients:
        Notification.objects.create(
            recipient=recipient,
            actor=actor,
            verb=verb,
            target_type='issue',
            target_id=issue.id,
            message=message
        )

        # Send email if configured
        try:
            send_mail(
                subject=f"[{issue.key}] {verb}",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
        except Exception as exc:
            logger.debug("Failed sending notification email: %s", exc)

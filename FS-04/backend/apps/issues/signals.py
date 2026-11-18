import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Issue

logger = logging.getLogger(__name__)

TRACKED_FIELDS = [
    'title',
    'description',
    'status',
    'priority',
    'issue_type',
    'assignee_id',
    'sprint_id',
    'story_points',
    'due_date',
]


@receiver(pre_save, sender=Issue)
def issue_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_instance = Issue.objects.filter(pk=instance.pk).first()
        except Exception:
            instance._old_instance = None
    else:
        instance._old_instance = None


@receiver(post_save, sender=Issue)
def issue_post_save(sender, instance, created, **kwargs):
    from apps.audit_log.models import AuditLog

    # Determine actor if stored on instance (e.g. set by view)
    actor = getattr(instance, '_current_user', None) or instance.reporter

    changes = {}

    if created:
        AuditLog.objects.create(
            workspace=instance.workspace,
            issue=instance,
            user=actor,
            action='create',
            field_name='all',
            old_value=None,
            new_value=instance.title
        )
        event_type = 'issue.created'
    else:
        old_inst = getattr(instance, '_old_instance', None)
        if old_inst:
            for field in TRACKED_FIELDS:
                old_val = getattr(old_inst, field)
                new_val = getattr(instance, field)
                if old_val != new_val:
                    changes[field] = {'old': str(old_val), 'new': str(new_val)}
                    AuditLog.objects.create(
                        workspace=instance.workspace,
                        issue=instance,
                        user=actor,
                        action='update',
                        field_name=field,
                        old_value=str(old_val) if old_val is not None else '',
                        new_value=str(new_val) if new_val is not None else ''
                    )
        event_type = 'issue.updated'

    # Trigger Celery background notifications
    try:
        from apps.notifications.tasks import send_issue_notification
        send_issue_notification.delay(
            issue_id=instance.id,
            actor_id=actor.id if actor else None,
            event_type=event_type,
            changes=changes
        )
    except Exception as exc:
        logger.debug("Could not schedule send_issue_notification task: %s", exc)

    # Trigger Celery background webhooks
    try:
        from apps.webhooks.tasks import deliver_webhooks_for_event
        payload = {
            'event': event_type,
            'issue_id': instance.id,
            'issue_key': instance.key,
            'title': instance.title,
            'status': instance.status,
            'priority': instance.priority,
            'assignee': instance.assignee.email if instance.assignee else None,
            'changes': changes,
        }
        deliver_webhooks_for_event.delay(
            workspace_id=instance.workspace_id,
            event=event_type,
            payload=payload
        )
    except Exception as exc:
        logger.debug("Could not schedule deliver_webhooks_for_event task: %s", exc)

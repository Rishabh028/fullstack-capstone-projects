from django.db import models
from django.db.models import Max
from django.conf import settings
from apps.workspaces.models import Workspace
from apps.projects.models import Project


class Label(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='labels'
    )
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#6366f1')

    class Meta:
        unique_together = [('workspace', 'name')]
        ordering = ['name']
        verbose_name = 'Label'
        verbose_name_plural = 'Labels'

    def __str__(self):
        return f"{self.name} ({self.workspace.name})"


class Issue(models.Model):
    ISSUE_TYPES = [
        ('task', 'Task'),
        ('bug', 'Bug'),
        ('story', 'Story'),
        ('epic', 'Epic'),
    ]

    PRIORITIES = [
        ('highest', 'Highest'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
        ('lowest', 'Lowest'),
    ]

    STATUSES = [
        ('backlog', 'Backlog'),
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('in_review', 'In Review'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled'),
    ]

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    board = models.ForeignKey(
        'boards.Board',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='issues'
    )
    sprint = models.ForeignKey(
        'sprints.Sprint',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='issues'
    )

    sequence_number = models.IntegerField(db_index=True)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    issue_type = models.CharField(max_length=20, choices=ISSUE_TYPES, default='task')
    priority = models.CharField(max_length=20, choices=PRIORITIES, default='medium')
    status = models.CharField(max_length=20, choices=STATUSES, default='backlog')

    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_issues'
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reported_issues'
    )
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='subtasks'
    )

    order = models.FloatField(default=0.0)
    story_points = models.IntegerField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    labels = models.ManyToManyField(Label, blank=True, related_name='issues')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('project', 'sequence_number')]
        ordering = ['order', '-created_at']
        verbose_name = 'Issue'
        verbose_name_plural = 'Issues'

    def __str__(self):
        return f"{self.key}: {self.title}"

    @property
    def key(self):
        return f"{self.project.key}-{self.sequence_number}"

    def save(self, *args, **kwargs):
        if self.project_id and not self.workspace_id:
            self.workspace = self.project.workspace

        if not self.sequence_number:
            max_seq = Issue.objects.filter(project_id=self.project_id).aggregate(Max('sequence_number'))['sequence_number__max'] or 0
            self.sequence_number = max_seq + 1

        if not self.board_id and self.project_id:
            default_board = self.project.boards.filter(is_default=True).first()
            if default_board:
                self.board = default_board

        super().save(*args, **kwargs)

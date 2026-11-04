from django.db import models
from django.conf import settings
from apps.workspaces.models import Workspace


class Project(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=10, db_index=True)
    description = models.TextField(blank=True)
    lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_projects'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    icon = models.CharField(max_length=10, blank=True)
    color = models.CharField(max_length=7, default='#6366f1')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('workspace', 'key')]
        ordering = ['-created_at']
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'

    def __str__(self):
        return f"[{self.key}] {self.name}"

    def save(self, *args, **kwargs):
        if self.key:
            self.key = self.key.upper().strip()
        super().save(*args, **kwargs)

    @property
    def issue_count(self):
        return self.issues.count()

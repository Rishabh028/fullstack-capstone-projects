from django.db import models
from apps.projects.models import Project

STATUS_MAPPING = [
    ('backlog', 'Backlog'),
    ('todo', 'To Do'),
    ('in_progress', 'In Progress'),
    ('in_review', 'In Review'),
    ('done', 'Done'),
    ('cancelled', 'Cancelled'),
]


class Board(models.Model):
    BOARD_TYPES = [
        ('kanban', 'Kanban'),
        ('scrum', 'Scrum'),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='boards'
    )
    name = models.CharField(max_length=100)
    board_type = models.CharField(max_length=20, choices=BOARD_TYPES, default='kanban')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', 'name']
        verbose_name = 'Board'
        verbose_name_plural = 'Boards'

    def __str__(self):
        return f"{self.project.key} - {self.name}"

    @property
    def workspace(self):
        return self.project.workspace


class BoardColumn(models.Model):
    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name='columns'
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#6366f1')
    position = models.IntegerField(default=0)
    issue_limit = models.IntegerField(null=True, blank=True)
    maps_to_status = models.CharField(max_length=20, choices=STATUS_MAPPING)

    class Meta:
        ordering = ['position']
        verbose_name = 'Board Column'
        verbose_name_plural = 'Board Columns'

    def __str__(self):
        return f"{self.board.name} -> {self.name} ({self.maps_to_status})"

    @property
    def workspace(self):
        return self.board.project.workspace

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from django.db import transaction
from faker import Faker

from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project
from apps.boards.models import Board, BoardColumn
from apps.sprints.models import Sprint
from apps.issues.models import Issue, Label
from apps.comments.models import Comment
from apps.billing.models import Subscription


class Command(BaseCommand):
    help = 'Seeds database with realistic multi-tenant Jira-like test data (idempotent).'

    def handle(self, *args, **options):
        fake = Faker()
        Faker.seed(42)
        random.seed(42)

        self.stdout.write(self.style.WARNING("Starting database seeding..."))

        SEED_WORKSPACE_NAMES = [
            "Acme Innovations",
            "Globex Technologies",
            "Initech Software",
        ]

        with transaction.atomic():
            # Clear existing seed workspaces and users for idempotency
            existing_workspaces = Workspace.objects.filter(name__in=SEED_WORKSPACE_NAMES)
            if existing_workspaces.exists():
                self.stdout.write(self.style.WARNING(f"Cleaning {existing_workspaces.count()} existing seed workspaces..."))
                existing_workspaces.delete()

            # Clean seed users
            User.objects.filter(email__endswith='@seed.saaspm.local').delete()

            # Predefined issue titles by category
            SAMPLE_ISSUES = [
                ("Design system components library", "story", "high"),
                ("Fix JWT token expiration on mobile client", "bug", "highest"),
                ("Set up multi-region Redis cluster for caching", "task", "medium"),
                ("Implement OAuth2 social login (Google, GitHub)", "story", "high"),
                ("Optimize database indexes on workspace queries", "task", "medium"),
                ("Add drag-and-drop reordering for Kanban columns", "story", "medium"),
                ("Fix memory leak in background Celery worker", "bug", "highest"),
                ("Implement Stripe webhook signature verification", "task", "high"),
                ("Add team activity audit log viewer", "story", "low"),
                ("Build custom reporting and burndown charts", "epic", "high"),
                ("Fix race condition on issue sequence numbers", "bug", "highest"),
                ("Create Swagger UI and Redoc interactive docs", "task", "low"),
                ("Add file attachment upload to S3/local storage", "story", "medium"),
                ("Implement invitation expiration email reminders", "task", "low"),
                ("Update frontend to React 18 and Tailwind v3", "task", "medium"),
                ("Fix dark mode contrast issues in board cards", "bug", "lowest"),
                ("Configure automated GitHub Actions CI/CD pipeline", "task", "high"),
                ("Implement real-time notification websockets", "story", "high"),
                ("Security audit and penetration testing fixes", "epic", "highest"),
                ("Write unit and integration test suite with pytest", "task", "high"),
            ]

            DEFAULT_COLUMNS = [
                {'name': 'Backlog', 'maps_to_status': 'backlog', 'position': 0, 'color': '#64748b'},
                {'name': 'To Do', 'maps_to_status': 'todo', 'position': 1, 'color': '#3b82f6'},
                {'name': 'In Progress', 'maps_to_status': 'in_progress', 'position': 2, 'color': '#eab308'},
                {'name': 'In Review', 'maps_to_status': 'in_review', 'position': 3, 'color': '#8b5cf6'},
                {'name': 'Done', 'maps_to_status': 'done', 'position': 4, 'color': '#10b981'},
            ]

            LABEL_CONFIGS = [
                ('Frontend', '#3b82f6'),
                ('Backend', '#10b981'),
                ('DevOps', '#f59e0b'),
                ('Security', '#ef4444'),
                ('UI/UX', '#8b5cf6'),
                ('Bugfix', '#ec4899'),
            ]

            PROJECT_TEMPLATES = [
                ("Core SaaS Platform", "CSP", "Main platform backend API and web frontend", "💻", "#6366f1"),
                ("Mobile Application", "MOB", "React Native cross-platform iOS and Android apps", "📱", "#06b6d4"),
                ("Infrastructure & Cloud", "INF", "Terraform, Kubernetes, and AWS infrastructure", "☁️", "#10b981"),
            ]

            now = timezone.now()

            for ws_idx, ws_name in enumerate(SEED_WORKSPACE_NAMES):
                self.stdout.write(f"\nCreating Workspace: {ws_name}")

                # 1. Create 10 users for this workspace
                users = []
                for u_idx in range(10):
                    first_name = fake.first_name()
                    last_name = fake.last_name()
                    email = f"user_{ws_idx + 1}_{u_idx + 1}@seed.saaspm.local"
                    user, _ = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'first_name': first_name,
                            'last_name': last_name,
                            'bio': fake.sentence(nb_words=8),
                        }
                    )
                    user.set_password('Password123!')
                    user.save()
                    users.append(user)

                owner = users[0]

                # 2. Create Workspace
                slug = slugify(ws_name)
                workspace = Workspace.objects.create(
                    name=ws_name,
                    slug=slug,
                    owner=owner,
                    plan=random.choice(['starter', 'pro', 'enterprise']),
                    description=fake.catch_phrase()
                )

                # Create subscription
                Subscription.objects.create(
                    workspace=workspace,
                    plan=workspace.plan,
                    status='active',
                    stripe_customer_id=f"cus_seed_{workspace.id}",
                    stripe_subscription_id=f"sub_seed_{workspace.id}",
                    current_period_start=now - timedelta(days=15),
                    current_period_end=now + timedelta(days=15),
                )

                # 3. Create memberships
                WorkspaceMember.objects.create(workspace=workspace, user=owner, role='owner')
                for u_idx, u in enumerate(users[1:], start=1):
                    role = 'admin' if u_idx == 1 else ('member' if u_idx < 8 else 'viewer')
                    WorkspaceMember.objects.create(
                        workspace=workspace,
                        user=u,
                        role=role,
                        invited_by=owner
                    )

                # 4. Create Workspace Labels
                created_labels = []
                for lbl_name, lbl_color in LABEL_CONFIGS:
                    lbl = Label.objects.create(workspace=workspace, name=lbl_name, color=lbl_color)
                    created_labels.append(lbl)

                # 5. Create 3 Projects per workspace
                for p_name, p_key, p_desc, p_icon, p_color in PROJECT_TEMPLATES:
                    unique_key = f"{p_key}{ws_idx + 1}"
                    project = Project.objects.create(
                        workspace=workspace,
                        name=f"{ws_name} {p_name}",
                        key=unique_key,
                        description=p_desc,
                        lead=users[1],
                        status='active',
                        icon=p_icon,
                        color=p_color
                    )

                    # Create Board & 5 columns
                    board = Board.objects.create(
                        project=project,
                        name=f"{project.name} Board",
                        board_type='kanban',
                        is_default=True
                    )
                    for col in DEFAULT_COLUMNS:
                        BoardColumn.objects.create(board=board, **col)

                    # Create 2 Sprints per project
                    sprint_active = Sprint.objects.create(
                        project=project,
                        name=f"{project.key} Sprint 1",
                        goal=f"Release MVP features for {project.name}",
                        status='active',
                        start_date=(now - timedelta(days=7)).date(),
                        end_date=(now + timedelta(days=7)).date()
                    )

                    sprint_planning = Sprint.objects.create(
                        project=project,
                        name=f"{project.key} Sprint 2",
                        goal=f"Performance hardening and integrations",
                        status='planning',
                        start_date=(now + timedelta(days=8)).date(),
                        end_date=(now + timedelta(days=22)).date()
                    )

                    # 6. Create 20 Issues per project
                    statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done']
                    for seq, (title, itype, ipriority) in enumerate(SAMPLE_ISSUES, start=1):
                        status_val = statuses[(seq - 1) % len(statuses)]
                        assignee_val = random.choice(users) if status_val != 'backlog' else None
                        reporter_val = random.choice(users[:3])
                        sprint_val = sprint_active if status_val in ['in_progress', 'in_review', 'done'] else (
                            sprint_planning if status_val == 'todo' else None
                        )

                        issue = Issue.objects.create(
                            workspace=workspace,
                            project=project,
                            board=board,
                            sprint=sprint_val,
                            sequence_number=seq,
                            title=title,
                            description=f"{title}.\n\n### Implementation Notes\n{fake.paragraph(nb_sentences=3)}",
                            issue_type=itype,
                            priority=ipriority,
                            status=status_val,
                            assignee=assignee_val,
                            reporter=reporter_val,
                            order=float(seq * 10),
                            story_points=random.choice([1, 2, 3, 5, 8]),
                            due_date=(now + timedelta(days=random.randint(3, 30))).date()
                        )

                        # Attach 1-2 random labels
                        issue.labels.set(random.sample(created_labels, k=random.randint(1, 2)))

                        # 7. Add 1-3 Comments per issue
                        num_comments = random.randint(1, 3)
                        for _ in range(num_comments):
                            Comment.objects.create(
                                issue=issue,
                                author=random.choice(users),
                                content=fake.sentence(nb_words=12)
                            )

                    self.stdout.write(f"  ✓ Created Project {project.key} with Board, 2 Sprints, and 20 Issues.")

        self.stdout.write(self.style.SUCCESS("\nDatabase successfully seeded with realistic multi-tenant data!"))
        self.stdout.write(self.style.SUCCESS("All users created with default password: 'Password123!'"))

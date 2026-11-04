# Multi-Tenant SaaS Project Management Platform

A production-ready Jira-like project management platform with multi-tenant workspace isolation, Kanban boards, sprint planning, Stripe billing, and more.

## Features
- **Multi-tenant workspaces** — shared schema with tenant isolation via workspace_id
- **Kanban boards** — drag-and-drop with WIP limits and custom columns
- **Sprint planning** — backlog management, sprint lifecycle
- **Issue tracking** — full CRUD with types, priorities, assignments, labels
- **Comments & Attachments** — threaded comments, file uploads
- **Audit log** — full history of all changes
- **Role-based permissions** — owner, admin, member, viewer
- **Custom workflows** — configurable board columns mapped to issue statuses
- **Webhooks** — outgoing webhooks with HMAC signatures and delivery retries
- **Stripe Billing** — subscription plans with Stripe Checkout and Customer Portal
- **Background jobs** — Celery workers for notifications, webhooks, reports
- **REST API** — DRF with OpenAPI/Swagger documentation
- **In-app notifications** — real-time-ready notification system

## Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Django 4.2 + Django REST Framework 3.15 |
| Frontend | React 18 + Vite + TypeScript + TailwindCSS |
| Database | PostgreSQL 15 |
| Cache/Broker | Redis 7 |
| Background Jobs | Celery 5 + Celery Beat |
| Payments | Stripe (test mode) |
| Auth | JWT (SimpleJWT) |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Browser   │────▶│    Nginx    │────▶│   Frontend   │
│  (React)    │     │  (Reverse   │     │   (Vite/     │
└─────────────┘     │   Proxy)    │     │   React)     │
                    └──────┬──────┘     └──────────────┘
                           │
                    ┌──────▼──────┐     ┌──────────────┐
                    │   Backend   │────▶│  PostgreSQL   │
                    │  (Django +  │     │      15       │
                    │   DRF)      │     └──────────────┘
                    └──────┬──────┘
                           │            ┌──────────────┐
                    ┌──────▼──────┐────▶│    Redis 7   │
                    │   Celery    │     └──────────────┘
                    │  Workers +  │
                    │   Beat      │     ┌──────────────┐
                    └─────────────┘────▶│    Stripe    │
                                        └──────────────┘
```

## Quick Start with Docker Compose

### Prerequisites
- Docker 24+
- Docker Compose v2+

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/saas-pm-platform.git
   cd saas-pm-platform
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and set your Stripe test keys
   ```

3. **Start all services**
   ```bash
   docker compose up -d
   ```

4. **Seed sample data**
   ```bash
   docker compose exec backend python manage.py seed_data
   ```

5. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api/
   - API Docs: http://localhost:8000/api/docs/
   - Admin: http://localhost:8000/admin/

## Manual Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # configure database
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_data
python manage.py runserver
```

### Celery (separate terminals)
```bash
celery -A celery_app.celery worker --loglevel=info
celery -A celery_app.celery beat --loglevel=info
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| DJANGO_SECRET_KEY | Django secret key | required |
| DB_NAME | PostgreSQL database name | saas_pm |
| DB_USER | PostgreSQL user | postgres |
| DB_PASSWORD | PostgreSQL password | postgres |
| DB_HOST | PostgreSQL host | db |
| REDIS_URL | Redis connection URL | redis://redis:6379/0 |
| STRIPE_SECRET_KEY | Stripe secret key (test) | required |
| STRIPE_WEBHOOK_SECRET | Stripe webhook secret | required |
| VITE_API_URL | Backend API URL | http://localhost:8000 |

## Running Tests

### Backend
```bash
cd backend
pytest apps/ -v --tb=short
# With coverage:
pytest apps/ --cov=apps/ --cov-report=html
```

### Frontend
```bash
cd frontend
npm run test
```

## Stripe Setup

1. Create a [Stripe account](https://stripe.com)
2. Get test mode API keys from the Stripe Dashboard
3. Create products/prices for Starter, Pro, Enterprise plans
4. Set up webhook endpoint pointing to `https://your-domain/api/billing/webhook/`
5. Add the webhook signing secret to `.env`

## API Documentation

Interactive API docs available at `/api/docs/` (Swagger UI) and `/api/redoc/`.

### Key Endpoints
```
POST   /api/auth/register/              Register new user
POST   /api/auth/login/                 Login
GET    /api/workspaces/                 List workspaces
POST   /api/workspaces/                 Create workspace
GET    /api/workspaces/{slug}/projects/ List projects
POST   /api/workspaces/{slug}/projects/ Create project
GET    /api/workspaces/{slug}/projects/{key}/issues/  List issues
PATCH  /api/workspaces/{slug}/projects/{key}/issues/{id}/  Update issue
GET    /api/billing/                    Current subscription
POST   /api/billing/checkout/           Create Stripe checkout
```

## Deployment

```bash
# Production deployment
cp .env.example .env
# Configure production values in .env
docker compose -f docker-compose.prod.yml up -d
```

### Required GitHub Secrets for CI/CD
| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `DEPLOY_HOST` | Production server IP/hostname |
| `DEPLOY_USER` | SSH username on production server |
| `DEPLOY_SSH_KEY` | Private SSH key for deployment |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

## License
MIT

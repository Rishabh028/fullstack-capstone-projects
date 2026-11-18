# API Documentation & Endpoint Specification

## Base URL
- Development: `http://localhost:8000/api/`
- Production: `https://your-domain.com/api/`
- Interactive OpenAPI 3 / Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
- Raw Schema: `http://localhost:8000/api/schema/`

---

## Authentication & Headers

All protected endpoints require a Bearer token in the HTTP Authorization header:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## 1. Authentication Endpoints (`/api/auth/`)

### Register User & Provision Workspace
- **Method**: `POST`
- **Path**: `/api/auth/register/`
- **Request Body**:
  ```json
  {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!",
    "workspace_name": "Acme Corp" // optional; defaults to "{first_name}'s Workspace"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "user": {
      "id": 1,
      "email": "jane@example.com",
      "first_name": "Jane",
      "last_name": "Doe",
      "avatar": null,
      "bio": ""
    },
    "tokens": {
      "access": "eyJhbGciOi...",
      "refresh": "eyJhbGciOi..."
    },
    "workspace": {
      "id": 1,
      "name": "Jane's Workspace",
      "slug": "janes-workspace",
      "plan": "free"
    }
  }
  ```

### User Login
- **Method**: `POST`
- **Path**: `/api/auth/login/`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "tokens": {
      "access": "eyJhbGci...",
      "refresh": "eyJhbGci..."
    },
    "user": {
      "id": 1,
      "email": "jane@example.com",
      "first_name": "Jane",
      "last_name": "Doe"
    }
  }
  ```

### Silent Token Refresh
- **Method**: `POST`
- **Path**: `/api/auth/refresh/`
- **Request Body**:
  ```json
  {
    "refresh": "eyJhbGci..."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access": "eyJhbGci...",
    "refresh": "eyJhbGci..."
  }
  ```

---

## 2. Workspaces Endpoints (`/api/workspaces/`)

| Method | Path | Description | Access Role |
|--------|------|-------------|-------------|
| `GET` | `/api/workspaces/` | List user's workspaces | Authenticated |
| `POST` | `/api/workspaces/` | Create a new workspace | Authenticated |
| `GET` | `/api/workspaces/{slug}/` | Retrieve workspace details | Member |
| `PATCH` | `/api/workspaces/{slug}/` | Update name, description, logo | Owner / Admin |
| `DELETE` | `/api/workspaces/{slug}/` | Delete workspace | Owner |
| `GET` | `/api/workspaces/{slug}/members/` | List members & roles | Member |
| `PATCH` | `/api/workspaces/{slug}/members/{id}/`| Update member role (`admin`, `member`, `viewer`)| Owner / Admin |
| `DELETE`| `/api/workspaces/{slug}/members/{id}/`| Remove member from workspace | Owner / Admin |
| `POST` | `/api/workspaces/{slug}/invite/` | Send invitation via email | Owner / Admin |
| `POST` | `/api/workspaces/accept-invite/{token}/`| Accept workspace invitation | Authenticated |

---

## 3. Projects Endpoints (`/api/projects/`)

- `GET /api/projects/?workspace_slug={slug}`: List all projects in workspace.
- `POST /api/projects/?workspace_slug={slug}`: Create project. Automatically creates default Kanban board with 5 columns: Backlog, To Do, In Progress, In Review, Done.
  ```json
  {
    "name": "E-Commerce Replatform",
    "key": "ECOMM",
    "description": "NextGen cloud storefront",
    "icon": "🛒",
    "color": "#6366f1"
  }
  ```
- `GET /api/projects/{key}/?workspace_slug={slug}`: Retrieve project detail.
- `PATCH /api/projects/{key}/?workspace_slug={slug}`: Update project metadata.
- `DELETE /api/projects/{key}/?workspace_slug={slug}`: Archive / delete project.

---

## 4. Boards & Columns Endpoints (`/api/boards/`)

- `GET /api/boards/?project_key={key}&workspace_slug={slug}`: List boards for project.
- `GET /api/boards/{id}/columns/`: List ordered columns for board.
- `POST /api/boards/{id}/columns/`: Add column with WIP limit (`issue_limit`) and status mapping (`maps_to_status`).
- `POST /api/boards/{id}/columns/reorder/`: Reorder columns via payload:
  ```json
  {
    "columns": [
      { "id": 1, "position": 0 },
      { "id": 2, "position": 1 }
    ]
  }
  ```

---

## 5. Issues & Kanban Endpoints (`/api/issues/`)

### List & Filter Issues
- `GET /api/issues/?workspace_slug={slug}&project_key={key}&status=in_progress&priority=high&search=auth`
- Supports query filters: `status`, `priority`, `issue_type`, `assignee`, `sprint`, `search`.

### Create Issue
- `POST /api/issues/?workspace_slug={slug}&project_key={key}`
  ```json
  {
    "title": "Implement Webhook Retry with Exponential Backoff",
    "description": "Detailed implementation criteria...",
    "issue_type": "task",
    "priority": "high",
    "status": "todo",
    "story_points": 5,
    "assignee": 3,
    "due_date": "2026-11-20"
  }
  ```
  *Note: `sequence_number` is assigned automatically (e.g., `ECOMM-14`).*

### Move Issue (Drag-and-Drop)
- `POST /api/issues/{id}/move/`
  ```json
  {
    "status": "in_progress",
    "order": 15.5,
    "column_id": 3
  }
  ```

### Bulk Update Issues
- `POST /api/issues/bulk-update/`
  ```json
  {
    "issues": [
      { "id": 10, "order": 1.0, "status": "todo" },
      { "id": 11, "order": 2.0, "status": "todo" }
    ]
  }
  ```

---

## 6. Sprints Endpoints (`/api/sprints/`)

- `GET /api/sprints/?project_key={key}&workspace_slug={slug}`: List sprints.
- `POST /api/sprints/?project_key={key}&workspace_slug={slug}`: Create sprint (Planning status).
- `POST /api/sprints/{id}/start/`: Starts sprint, sets start/end dates, sets status to `active`.
- `POST /api/sprints/{id}/complete/`: Completes sprint, moves unfinished tasks to backlog or next sprint.

---

## 7. Comments & Attachments (`/api/comments/`, `/api/attachments/`)

- `GET /api/comments/?issue_id={id}`: List comments for issue.
- `POST /api/comments/`: Post comment (supports nested replies via `parent` comment ID).
- `POST /api/attachments/`: Multipart form file upload (`multipart/form-data`) bound to `issue`.

---

## 8. Stripe Billing Endpoints (`/api/billing/`)

- `GET /api/billing/?workspace_slug={slug}`: Retrieve subscription status, current period, and tier.
- `POST /api/billing/checkout/`:
  ```json
  {
    "workspace_slug": "acme-corp",
    "plan": "pro"
  }
  ```
  Returns: `{ "checkout_url": "https://checkout.stripe.com/c/pay/..." }`
- `POST /api/billing/portal/`:
  ```json
  {
    "workspace_slug": "acme-corp"
  }
  ```
  Returns: `{ "portal_url": "https://billing.stripe.com/p/session/..." }`
- `POST /api/billing/webhook/`: Inbound Stripe webhook processor verifying signature and executing lifecycle state machine.

---

## 9. Webhooks & Notifications Endpoints

- `GET /api/webhooks/?workspace_slug={slug}`: List workspace webhook endpoints.
- `POST /api/webhooks/?workspace_slug={slug}`: Register endpoint with URL and subscribed events (`['issue.created', 'issue.updated', '*']`).
- `GET /api/webhooks/{id}/deliveries/`: Inspect HTTP delivery log, response headers, and HMAC timestamps.
- `GET /api/notifications/`: List user in-app notifications.
- `POST /api/notifications/mark-read/`: Mark notifications as read.

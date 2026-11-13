# API Reference: Real-Time Collaborative Workspace

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates a user and sets an HTTP-only JWT cookie.
- **Request Body:**
  ```json
  {
    "email": "alice@example.com",
    "password": "password123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "user": {
      "id": "cuid...",
      "name": "Alice Walker",
      "email": "alice@example.com",
      "color": "#6366f1"
    },
    "workspaceSlug": "notion-figma-hub"
  }
  ```

### `POST /api/auth/signup`
Creates a new user account, provisions a default personal workspace, and returns a session cookie.
- **Request Body:**
  ```json
  {
    "name": "Alex Mercer",
    "email": "alex@example.com",
    "password": "securepassword"
  }
  ```

### `GET /api/auth/me`
Returns the currently authenticated session user profile and workspace memberships.

### `POST /api/auth/logout`
Clears the session cookie.

---

## 2. Workspace Endpoints

### `GET /api/workspaces`
Lists all workspaces the authenticated user belongs to.

### `POST /api/workspaces`
Creates a new workspace.
- **Request Body:**
  ```json
  {
    "name": "Design Systems Team",
    "icon": "🎨"
  }
  ```

### `GET /api/workspaces/:slug`
Fetches workspace details, active members, and document hierarchy.

### `POST /api/workspaces/:slug/members`
Invites a user to the workspace. Requires `OWNER` or `ADMIN` role.
- **Request Body:**
  ```json
  {
    "email": "colleague@example.com",
    "role": "EDITOR" // "ADMIN" | "EDITOR" | "VIEWER"
  }
  ```

### `PATCH /api/workspaces/:slug/members`
Updates an existing member's role. Requires `OWNER` or `ADMIN` role.

---

## 3. Document & Canvas Endpoints

### `POST /api/documents`
Creates a new rich-text document or whiteboard canvas.
- **Request Body:**
  ```json
  {
    "workspaceId": "ws-123",
    "title": "Q4 Strategic Plan",
    "type": "DOCUMENT", // or "CANVAS"
    "icon": "📊",
    "parentId": null
  }
  ```

### `GET /api/documents/:id`
Fetches document metadata, user's current effective role, and created timestamp.

### `PATCH /api/documents/:id`
Updates title, icon, cover image, or archive status.

### `DELETE /api/documents/:id`
Permanently removes a document. Requires `OWNER` or `ADMIN`.

---

## 4. Comments & Annotations

### `GET /api/documents/:id/comments`
Retrieves all top-level comment threads and nested replies.

### `POST /api/documents/:id/comments`
Adds a new comment thread or a reply to an existing comment.
- **Request Body:**
  ```json
  {
    "content": "Can we clarify the Redis pub/sub timeout parameters?",
    "selectionRange": {
      "from": 12,
      "to": 45,
      "text": "Redis Pub/Sub acts as the distributed message bus"
    },
    "parentId": null // or parent comment ID for threaded reply
  }
  ```

### `PATCH /api/documents/:id/comments`
Resolves or unresolves a comment thread: `{ "commentId": "...", "resolved": true }`.

---

## 5. Version History & Snapshots

### `GET /api/documents/:id/snapshots`
Retrieves list of captured snapshots.

### `POST /api/documents/:id/snapshots`
Creates a point-in-time snapshot of the active Yjs CRDT state.
- **Request Body:**
  ```json
  {
    "title": "Release Candidate 1.0",
    "yjsState": "<base64_encoded_binary_state>",
    "previewText": "First 100 characters preview..."
  }
  ```

---

## 6. WebSocket Protocol (`ws://localhost:1234/:documentId`)

- **Protocol**: Subprotocol based on `y-websocket` binary message packets:
  - Byte `0`: `messageSync` (Sync Step 1, Sync Step 2, or Update).
  - Byte `1`: `messageAwareness` (Presence, cursors, user color and metadata).
- **Format**: High-efficiency variable-length integer (`lib0/encoding`) binary encoding.

# 🚀 Real-Time Collaborative Workspace (Notion & Figma Style)

> **FS-02 Project #2 of 2 — Production-Ready Deliverable**  
> Several people edit the same document or canvas at once, see each other's cursors, and never lose changes. Powered by **Yjs CRDTs**, **WebSockets**, **TipTap**, **Redis Pub/Sub**, **Prisma**, and **PostgreSQL**.

---

## 🌟 Features Overview

- **Real-Time Multiplayer Rich-Text Editor (Notion-style)**:
  - Powered by TipTap, ProseMirror, and Yjs CRDT bindings.
  - Headings, bold, italic, underline, strikethrough, inline code, code blocks with syntax highlighting, bullet/ordered lists, blockquotes, interactive task checklists, and dynamic tables.
  - Sub-15ms live synchronization with zero merge conflicts or locking.
- **Collaborative Whiteboard & Canvas (Figma-style)**:
  - Synchronized shapes (Rectangles, Circles, Sticky Notes, Text Cards) over Yjs `Y.Array`.
  - Figma-style pointer arrows with user names tracking `(x, y)` coordinates in real time.
  - Zoom in/out, pan, drag-and-drop, and editable sticky notes.
- **Presence & Live Awareness**:
  - Colored cursor indicators with user name badges.
  - Collaborator presence avatar bar with online status pulse and user counts.
- **Inline Comments & Threaded Discussions**:
  - Highlight text to attach anchored comments.
  - Threaded replies, open/resolved filters, and instant updates.
- **Point-in-Time Version History Snapshots**:
  - Automatic and manual version snapshots saved to the database.
  - One-click rollback restoring the exact document state to all connected peers in real time.
- **Granular Permissions & Role-Based Access Control (RBAC)**:
  - `OWNER`: Full administrative access to workspace and documents.
  - `ADMIN`: Invite members, manage roles, create and delete docs.
  - `EDITOR`: Real-time co-authoring on documents and whiteboards.
  - `VIEWER`: Read-only access with live cursor inspection.
- **Horizontal Scalability via Redis Pub/Sub**:
  - WebSocket servers communicate over Redis Pub/Sub channels to sync updates across multiple server instances.
  - Graceful single-node fallback for zero-dependency local development.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Clients["Browser Clients (Side-by-Side Multi-Tab)"]
        UserA["Alice (Owner) - Indigo Cursor"]
        UserB["Bob (Editor) - Emerald Cursor"]
        UserC["Charlie (Editor) - Amber Cursor"]
        UserD["Diana (Viewer) - Pink Cursor"]
    end

    subgraph WSNodes["WebSocket CRDT Cluster"]
        WS1["WebSocket Node 1 (:1234)"]
        WS2["WebSocket Node 2 (:1235)"]
    end

    subgraph Messaging["Distributed Message Bus"]
        Redis[("Redis 7 Pub/Sub Cluster")]
    end

    subgraph Persistence["Storage & Database"]
        DB[("PostgreSQL 16 / SQLite via Prisma")]
    end

    UserA -->|WebSocket /doc-123| WS1
    UserB -->|WebSocket /doc-123| WS1
    UserC -->|WebSocket /doc-123| WS2
    UserD -->|WebSocket /doc-123| WS2

    WS1 <-->|Sync Updates & Awareness| Redis
    WS2 <-->|Sync Updates & Awareness| Redis

    WS1 -->|Debounced Snapshots (2s)| DB
    WS2 -->|Debounced Snapshots (2s)| DB
```

---

## ⚡ Quickstart Guide

### Prerequisites
- Node.js 20+ (v22 installed and supported)
- npm or pnpm
- Docker (optional for PostgreSQL & Redis container deployment)

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Database Setup & Seeding
Generate Prisma Client and populate the database with demo users, initial rich-text documents, whiteboard canvas, comments, and snapshots:
```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### 3. Launch the Application
Run both the Next.js frontend and the real-time WebSocket CRDT server concurrently with a single command:
```bash
npm run dev:all
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **WebSocket Server**: `ws://localhost:1234`
- **Health Check**: [http://localhost:1234/health](http://localhost:1234/health)

---

## 👥 Demo Personas (1-Click Login)

The login screen features 1-click persona buttons for rapid multi-user testing across multiple browser windows:

| Persona | Role | Color | Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Walker** | `OWNER` | Indigo (`#6366f1`) | `alice@example.com` | `password123` |
| **Bob Chen** | `ADMIN` / `EDITOR` | Emerald (`#10b981`) | `bob@example.com` | `password123` |
| **Charlie Davis** | `EDITOR` | Amber (`#f59e0b`) | `charlie@example.com` | `password123` |
| **Diana Prince** | `VIEWER` | Pink (`#ec4899`) | `diana@example.com` | `password123` |

> 💡 **Multi-User Testing Tip**: Open one browser window in Normal mode as Alice and an Incognito window as Bob. Type in one window and watch the cursor and text update instantaneously in the other!

---

## 🐳 Production Deployment with Docker Compose

To run the complete production stack (PostgreSQL 16, Redis 7, two load-balanced WebSocket server instances, and Next.js):
```bash
docker-compose up --build
```

---

## 🧪 Benchmarks & Stress Testing

Run the automated concurrency stress test and microbenchmarks:
```bash
# Concurrency stress test (simulates 10 concurrent clients editing simultaneously)
npm run stress-test

# Microbenchmark suite (CRDT ops/sec, snapshot encoding, restore latency)
npm run benchmark
```

Empirical Benchmark Numbers:
- **Local Text Insert**: **20,408 ops/sec**
- **Snapshot Encoding**: **17.07 ms** for 8,000 characters (41.6 KB compressed)
- **Snapshot Restoration**: **52.32 ms** with 100% data integrity
- **Concurrency Convergence**: **100% Convergence across 10 concurrent clients** with 0 data loss

---

## 📁 Repository Structure

```
├── prisma/
│   ├── schema.prisma            # Prisma schema (SQLite dev & PostgreSQL prod)
│   ├── schema.postgresql.prisma # PostgreSQL production schema
│   └── seed.ts                  # Database seeder with demo accounts and documents
├── server/
│   └── websocket-server.ts      # Multi-instance Yjs WebSocket server with Redis Pub/Sub
├── src/
│   ├── app/                     # Next.js App Router (pages & API routes)
│   │   ├── api/                 # Auth, documents, comments, snapshots, members
│   │   ├── workspace/[slug]/    # Document editor, canvas, overview dashboard
│   │   └── login/               # Authentication with 1-click personas
│   ├── components/              # TipTap editor, Figma canvas, presence, comments
│   ├── lib/                     # Prisma client, JWT authentication, utilities
│   └── types/                   # TypeScript interfaces
├── scripts/
│   ├── dev-runner.ts            # Concurrent dev runner for Next.js and WS server
│   ├── stress-test.ts           # Concurrency stress test with Project Gutenberg text
│   └── benchmark.ts             # Microbenchmark suite
├── docker-compose.yml           # Multi-node Docker Compose setup with Redis & Postgres
├── ARCHITECTURE.md              # Deep dive into CRDT math, YATA algorithm, and protocols
├── API.md                       # Complete REST and WebSocket API documentation
├── BENCHMARKS.md                # Concurrency stress test and benchmark results
├── PRESENTATION.md              # 10-minute presentation slide deck
└── REFLECTION.md                # Intern reflection on learnings, ownership, and challenges
```

---

## 📋 Deliverables Verification

- [x] **Step 1: CRDT Conflict Resolution**: Documented in `ARCHITECTURE.md` with YATA algorithm analysis.
- [x] **Step 2: Login, Workspaces & Pages**: Built with Prisma, JWT session cookies, and database models.
- [x] **Step 3: TipTap Rich-Text Editor**: Integrated with `@tiptap/extension-collaboration` & `@tiptap/extension-collaboration-cursor`.
- [x] **Step 4: WebSocket Server**: `y-websocket` binary server running on port 1234.
- [x] **Step 5: Live Presence & Cursors**: Colored cursors and avatar presence indicators.
- [x] **Step 6: Comments, Snapshots & Permissions**: Threaded comments, version history with one-click restore, and RBAC (Owner, Admin, Editor, Viewer).
- [x] **Step 7: Redis Scaling & Multi-Browser Testing**: Redis Pub/Sub cluster support with fallback and multi-browser demo personas.
- [x] **Bonus: Collaborative Whiteboard (Figma-style)**: Synchronized shapes, sticky notes, and live pointer tracking.
- [x] **Automated Tests & Benchmarks**: Project Gutenberg dataset stress test in `scripts/stress-test.ts`.
- [x] **10-Minute Presentation**: Detailed slide deck in `PRESENTATION.md`.
- [x] **Intern Reflection**: Personal learning and engineering ownership in `REFLECTION.md`.

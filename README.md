# MCP Control Room

> **Open-source platform for AI agents to connect to real data sources via Model Context Protocol (MCP)**

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MCP Control Room is a **Model Context Protocol (MCP) management platform** that lets AI agents securely interact with real data sources — databases, APIs, file systems, and custom tools — through a unified, permission-governed interface.

---

## 🏗 Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  AI Agent /     │     │   MCP Control    │     │   Data Sources      │
│  LLM Client     │◄───►│   Room Server    │◄───►│   (MCP Servers)     │
│  (Claude, etc.) │     │   (FastAPI)      │     │   - PostgreSQL      │
└─────────────────┘     └──────────────────┘     │   - REST APIs       │
                          ▲                       │   - File Systems    │
                          │                       │   - Custom Tools    │
                          ▼                       └─────────────────────┘
                 ┌──────────────────┐
                 │  Frontend (Next.js│
                 │   + React 19)    │
                 └──────────────────┘
```

**Core Components:**

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| **REST API** | FastAPI 1.0.0 + Python 3.12 | 8000 | Auth, workspaces, projects, tasks, permissions, analytics |
| **MCP Server** | MCP SDK + FastAPI | 8001 | STDIO / HTTP (SSE) transport for 6 built-in tools |
| **Frontend** | Next.js 15 + React 19 + TypeScript | 3000 | Dashboard, task management, permissions UI, analytics |
| **Database** | PostgreSQL (Supabase) | 5432 | 8 tables with RLS, 18 indexes, 4 triggers |
| **Auth** | Supabase Auth + JWT (HS256) | — | Workspace-scoped RBAC |

---

## ✨ Features

### 🔐 Enterprise-Grade Permissions
- **5-layer evaluation pipeline**: Role permissions → Fine-grained rules → Workspace policies → Category defaults → Deny
- **Role-Based Access Control**: Owner (4), Admin (3), Member (2), Viewer (1)
- **9 Tool Categories**: `admin`, `api`, `auth`, `compute`, `database`, `file`, `notification`, `search`, `unknown`
- **Conditional Rules**: Time-based, parameter-based, user-based, resource-based conditions
- **Approval Workflow**: Destructive operations (write/delete) require explicit approval with 24h TTL

### 🤖 MCP Server Management
- **6 Built-in Tools**: `list_tasks`, `get_task`, `search_tasks`, `get_project_summary`, `propose_create_task`, `propose_update_task`
- **Multi-Transport**: STDIO (for local agents) + HTTP/SSE (for remote clients)
- **Auto-Discovery**: Tools, resources, and prompts synced from connected MCP servers
- **Health Monitoring**: Connection status, latency, error tracking

### 📊 Analytics & Observability
- **Dashboard Metrics**: Real-time tool execution counts, latency trends, error distributions
- **Approval Analytics**: Pending/approved/rejected rates, SLA tracking
- **Workspace Overview**: Project/task health, team activity

### 🛠 Developer Experience
- **Hot Reload**: Backend (uvicorn --reload) + Frontend (next dev)
- **Type Safety**: Pydantic 2 + TypeScript strict mode end-to-end
- **Structured Logging**: JSON-structured logs via structlog
- **Docker Compose**: One-command local dev environment

---

## 🚀 Quick Start

### Prerequisites
- **Docker** + Docker Compose (recommended)
- OR: Python 3.12+, Node.js 20+, PostgreSQL 15+, Supabase CLI

### Option 1: Docker (Easiest)
```bash
# 1. Clone and configure
git clone <your-repo-url>
cd mcp-control-room
cp .env.example .env
# Edit .env with your keys (SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET)

# 2. Start all services
docker-compose up -d

# 3. Verify
curl http://localhost:8001/health
# Frontend: http://localhost:3000
# Supabase Studio: http://localhost:54321
```

### Option 2: Local Development
```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## 📚 API Reference

**Base URL**: `http://localhost:8001/api/v1`

### Authentication
```bash
# Login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret"}'

# Use token
export TOKEN=<access_token>
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/workspaces
```

### Core Endpoints (11 route groups)

| Group | Prefix | Description |
|-------|--------|-------------|
| **Auth** | `/auth` | Login, register, get current user |
| **Workspaces** | `/workspaces` | CRUD + member management (invite, role update, remove) |
| **Projects** | `/projects` | Project CRUD within workspaces |
| **Tasks** | `/tasks` | Task CRUD, status/priority/assignee updates |
| **Tool Calls** | `/tool-calls` | Execute tools with permission enforcement |
| **Approvals** | `/approvals` | Create, review, list approval requests |
| **Analytics** | `/analytics` | Overview, metrics, trends, distributions |
| **Servers** | `/servers` | MCP server registration, health, tool discovery |
| **Permissions** | `/permissions` | Categories, policies, role permissions, rules, audit log |
| **Tool Execution** | `/tool-execution` | Direct tool execution with permission evaluation |

### Example: Create Workspace → Project → Task
```bash
# Create workspace
curl -X POST http://localhost:8001/api/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "Engineering"}'

# Create project (replace WORKSPACE_ID)
curl -X POST http://localhost:8001/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"workspace_id": "WORKSPACE_ID", "name": "API Redesign", "description": "v2 REST API"}'

# Create task (replace PROJECT_ID)
curl -X POST http://localhost:8001/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"project_id": "PROJECT_ID", "title": "Design new endpoints", "priority": "high"}'
```

---

## 🔌 MCP Tools (for AI Agents)

Connect any MCP-compatible client (Claude Desktop, Cursor, etc.) to `http://localhost:8002/mcp` (HTTP) or use STDIO.

| Tool | Description | Requires Approval |
|------|-------------|-------------------|
| `list_tasks` | List tasks with filters (status, priority, assignee) | No |
| `get_task` | Get single task by ID | No |
| `search_tasks` | Full-text search across title/description | No |
| `get_project_summary` | Project stats (task counts by status/priority) | No |
| `propose_create_task` | Create new task (writes require approval) | **Yes** |
| `propose_update_task` | Update existing task (writes require approval) | **Yes** |

**Claude Desktop Config:**
```json
{
  "mcpServers": {
    "mcp-control-room": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8002/mcp"]
    }
  }
}
```

---

## 🗄 Database Schema

**8 Tables with Row Level Security (RLS):**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `workspaces` | Top-level containers | Owner + soft delete |
| `workspace_members` | RBAC membership | Roles: owner/admin/member/viewer |
| `projects` | Task containers | Status: active/archived/on_hold |
| `tasks` | Work items | Status: todo/in_progress/review/done/blocked; Priority: low/medium/high/critical |
| `tool_calls` | Execution audit trail | Status: pending/running/completed/failed/approved/rejected |
| `approvals` | Write-operation gates | 24h TTL, status: pending/approved/rejected/executed/expired |
| `audit_logs` | Permission decisions | Decision: allowed/denied/pending_approval/error |
| `tool_permissions` | Category/policy/rule storage | 9 categories, 4 condition types |

**Indexes**: 18 composite indexes for common query patterns  
**Triggers**: 4 `updated_at` auto-update triggers  
**Migrations**: 3 files (`0001_initial_schema`, `0002_mcp_servers`, `0003_tool_permissions`)

---

## ⚙ Configuration

### Environment Variables (`.env`)
```bash
# Required
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-32-char-min-secret
SUPABASE_DB_PASSWORD=postgres

# Optional
SECRET_KEY=your-jwt-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
MCP_SERVER_PORT=8001
MCP_TRANSPORT=stdio
ENVIRONMENT=development
```

### Docker Ports
| Service | Container | Host | Purpose |
|---------|-----------|------|---------|
| Supabase PostgreSQL | 5432 | 5432 | Database |
| Supabase Studio | 54321 | 54321 | Admin UI |
| Kong Gateway | 8000 | 8000 | Supabase API |
| **FastAPI REST** | **8000** | **8001** | **Backend API** |
| **MCP Server HTTP** | **8001** | **8002** | **MCP Transport** |
| Frontend | 3000 | 3000 | Next.js Dev |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=backend --cov-report=term-missing

# Frontend tests
cd frontend
npm run test          # Unit (Jest + React Testing Library)
npm run test:e2e      # E2E (Playwright)
npm run type-check    # TypeScript strict check
npm run lint          # ESLint + Prettier
```

---

## 📁 Project Structure

```
mcp-control-room/
├── backend/
│   ├── api/
│   │   └── routes/          # 11 route modules (auth, workspaces, tasks, etc.)
│   ├── database/
│   │   └── connection.py    # asyncpg pool (min=5, max=20, timeout=60s)
│   ├── mcp_client.py        # MCP client for tool execution
│   ├── mcp_server/
│   │   ├── server.py        # MCP server (6 tools, STDIO + HTTP)
│   │   ├── auth.py          # MCP auth context
│   │   └── tools/           # 6 tool implementations
│   ├── schemas/
│   │   └── models.py        # All Pydantic models (16KB)
│   ├── security/            # JWT, password hashing
│   ├── services/            # 9 service classes (business logic)
│   ├── config.py            # Pydantic Settings
│   └── main.py              # FastAPI app entry point
├── frontend/
│   ├── app/                 # Next.js 15 App Router (496 lines page.tsx)
│   ├── components/          # Radix UI + custom components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # API client, Supabase client, utilities
│   └── types/               # TypeScript definitions
├── supabase/
│   ├── migrations/          # 4 SQL migration files
│   └── seed.sql             # Demo data (deterministic UUIDs)
├── docker-compose.yml       # 3 services (supabase, backend, frontend)
├── .env.example             # Template for environment variables
└── README.md                # This file
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code style (Ruff, ESLint, Prettier)
- Commit conventions (Conventional Commits)
- PR process (draft → review → squash merge)
- Testing requirements

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for:
- Vulnerability reporting
- Security model (RLS, JWT, approval gates)
- Dependency scanning

---

## 📄 License

**MIT License** — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) — The open standard this platform implements
- [Supabase](https://supabase.com/) — PostgreSQL + Auth + Realtime backend
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python web framework
- [Next.js](https://nextjs.org/) — React framework for production
- [Radix UI](https://www.radix-ui.com/) — Accessible component primitives
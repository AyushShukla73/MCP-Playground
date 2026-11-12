# Contributing to MCP Control Room

Thank you for your interest in contributing! This guide covers our development workflow, code standards, and how to submit changes.

---

## 🛠 Development Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL 15+ (or Docker)
- Git

### Local Development
```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../.env.example .env  # Edit with your config
alembic upgrade head
python -m uvicorn api.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
cp ../.env.example .env.local  # Edit with your config
npm run dev
```

---

## 📝 Code Style

### Python (Backend)
- **Formatter**: Ruff (replaces Black + isort)
- **Linter**: Ruff
- **Type Checker**: mypy (strict mode)

```bash
# Format
ruff format backend/
ruff check backend/ --fix

# Type check
mypy backend/
```

**Key Conventions:**
- Line length: 100 chars
- Use type hints everywhere (Pydantic models for API)
- Prefer `async`/`await` over sync
- Use `structlog` for logging (JSON output)

### TypeScript/React (Frontend)
- **Formatter**: Prettier
- **Linter**: ESLint (with TypeScript, React, Next.js configs)
- **Type Checker**: TypeScript strict mode

```bash
# Format
npm run format        # prettier --write
npm run lint          # eslint --fix

# Type check
npm run type-check    # tsc --noEmit
```

**Key Conventions:**
- Line length: 100 chars
- Use functional components + hooks
- Prefer `interface` over `type` for object shapes
- Use Radix UI primitives + Tailwind CSS
- Colocate component files: `Component.tsx`, `Component.styles.ts`, `index.ts`

---

## 📦 Commit Conventions

We follow **Conventional Commits** (https://conventionalcommits.org):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance, deps, tooling |
| `build` | Build system changes |
| `ci` | CI/CD changes |

### Examples
```
feat(auth): add password reset flow
fix(permissions): resolve rule evaluation order bug
docs(readme): update MCP server config example
refactor(api): extract workspace service to separate module
test(tool-calls): add unit tests for approval workflow
```

### Scope Guidelines
- Use lowercase, hyphen-separated: `auth`, `permissions`, `mcp-server`, `frontend`
- Match the affected module/package name
- Omit for cross-cutting changes

---

## 🔄 Pull Request Process

### 1. Before Opening a PR
- [ ] Run all tests locally (`pytest`, `npm test`, `npm run type-check`)
- [ ] Run linters/formatters (`ruff`, `eslint`, `prettier`)
- [ ] Update docs if behavior changes
- [ ] Add tests for new functionality

### 2. PR Requirements
- **Draft PR** first → convert to Ready for Review when complete
- **Clear title** following Conventional Commits
- **Description** with:
  - What changed and why
  - Testing performed
  - Screenshots (UI changes)
  - Breaking changes noted
- **Linked issues** (if applicable)
- **Single logical change** per PR (split large features)

### 3. Review Process
- **2 approvals** required from maintainers
- **All CI checks** must pass
- **No merge conflicts** with `main`
- **Squash merge** (default) — keep history clean

### 4. After Merge
- Delete feature branch
- Update related issues
- Consider follow-up PRs for tech debt

---

## ✅ Testing Requirements

### Backend (pytest)
```bash
cd backend
pytest tests/ -v --cov=backend --cov-report=term-missing
# Target: ≥80% coverage for new code
```

**Test Categories:**
- **Unit**: Service logic, permission evaluator, schema validation
- **Integration**: API endpoints, database operations, auth flow
- **E2E**: Full request→response cycles with test DB

### Frontend (Jest + React Testing Library + Playwright)
```bash
cd frontend
npm run test          # Unit + component tests
npm run test:e2e      # Playwright E2E
npm run type-check    # TypeScript strict check
```

**Test Categories:**
- **Unit**: Hooks, utilities, pure functions
- **Component**: Rendering, interactions, accessibility
- **E2E**: Critical user flows (login, create workspace, task CRUD)

### Adding Tests
- Place tests in `tests/` mirroring source structure
- Use descriptive names: `test_should_allow_admin_to_delete_workspace`
- Mock external dependencies (Supabase, HTTP calls)
- Test both success and error paths

---

## 🐛 Bug Reports

Use the issue template with:
- **Environment**: OS, Python/Node versions, Docker?
- **Steps to reproduce** (minimal)
- **Expected vs actual behavior**
- **Logs/screenshots** (sanitized)
- **Related PRs/issues**

---

## 💡 Feature Requests

- Search existing issues first
- Describe the **problem**, not just the solution
- Explain **use cases** and **user impact**
- Consider **breaking changes** and **migration path**

---

## 🏷 Labels

| Label | Purpose |
|-------|---------|
| `good first issue` | Beginner-friendly |
| `help wanted` | Community contributions welcome |
| `bug` | Confirmed defect |
| `enhancement` | New feature/improvement |
| `breaking` | Breaking change |
| `docs` | Documentation only |
| `needs triage` | Awaiting maintainer review |
| `security` | Security-related |

---

## 📞 Getting Help

- **Discord**: [MCP Control Room Community](https://discord.gg/mcp-control-room)
- **Discussions**: GitHub Discussions for questions
- **Issues**: Bug reports and feature requests

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the **MIT License** (see [LICENSE](LICENSE)).
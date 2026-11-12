# Security Policy

## 🔒 Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

We provide security updates for the latest stable release.

---

## 🐛 Reporting a Vulnerability

**Please do NOT open a public issue for security vulnerabilities.**

Instead, report them privately via:

### Preferred: GitHub Security Advisories
1. Go to the [Security tab](https://github.com/<owner>/mcp-control-room/security/advisories) of this repository
2. Click "Report a vulnerability"
3. Fill in the details

### Alternative: Email
Send details to: **security@mcp-control-room.dev**

---

## 📋 What to Include

Please provide:
- **Description** of the vulnerability
- **Steps to reproduce** (minimal proof-of-concept)
- **Impact assessment** (what could an attacker do?)
- **Affected versions** (if known)
- **Suggested fix** (if you have one)

We aim to acknowledge within **48 hours** and provide a timeline for fixes.

---

## 🛡 Security Model

### Authentication & Authorization
- **JWT (HS256)** tokens via Supabase Auth
- **30-minute** access token expiry (configurable)
- **Workspace-scoped RBAC**: Owner (4) > Admin (3) > Member (2) > Viewer (1)
- **Row Level Security (RLS)** on all PostgreSQL tables

### Permission Evaluation Pipeline (5 Layers)
1. **Role Permissions** — Base allow/deny per role
2. **Fine-grained Rules** — Conditional logic (time, params, user, resource)
3. **Workspace Policies** — Pattern-based allow/deny with priority
4. **Category Defaults** — Per-tool-category baselines
5. **Explicit Deny** — Final fallback

### Approval Gates
- **Write/delete operations** require explicit approval
- **24-hour TTL** on approval requests
- **Audit logging** for all permission decisions

### Data Protection
- **Passwords**: bcrypt (via Supabase Auth)
- **Secrets**: Never logged, stored in env vars
- **Database**: Encrypted at rest (Supabase managed)
- **Transport**: HTTPS/TLS in production

---

## 🔍 Security Practices

### Dependency Management
```bash
# Backend
pip-audit                    # Check for vulnerabilities
pip list --outdated          # Check for updates

# Frontend
npm audit                    # Check for vulnerabilities
npm outdated                 # Check for updates
```

### CI/CD Security
- **Dependabot** alerts enabled
- **SAST** via GitHub CodeQL (Python + TypeScript)
- **Container scanning** for Docker images
- **Secret scanning** on push

### Local Development
- Never commit `.env` files (in `.gitignore`)
- Use `.env.example` as template
- Rotate `SUPABASE_JWT_SECRET` regularly (min 32 chars)

---

## 🚨 Incident Response

If a vulnerability is confirmed:

1. **Assess** severity (CVSS)
2. **Patch** in private fork
3. **Test** fix thoroughly
4. **Release** patch version
5. **Disclose** via GitHub Security Advisory
6. **Notify** users via release notes

### Severity & Response Time
| Severity | CVSS | Response | Patch Target |
|----------|------|----------|--------------|
| Critical | 9.0-10.0 | 24 hours | 48 hours |
| High | 7.0-8.9 | 48 hours | 1 week |
| Medium | 4.0-6.9 | 1 week | 2 weeks |
| Low | 0.1-3.9 | 2 weeks | Next minor |

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Supabase Security Docs](https://supabase.com/docs/guides/platform/security)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

---

## 🙏 Acknowledgments

We thank security researchers who responsibly disclose vulnerabilities. Contributors will be credited in the Security Advisory (unless they prefer anonymity).
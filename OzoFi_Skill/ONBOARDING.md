# Developer Onboarding Guide
**ATS 4D Framework v2.13 | ANNAITECH SOLUTIONS**  
*Read this fully before writing your first line of code.*

---

## Welcome to ATS Engineering

You're joining a team that builds AI-powered products for real clients across web, mobile, and automation. We move fast but we don't move messy. This guide gets you from zero to first PR.

**Expected time to complete:** ~4 hours (reading + setup + exercises)

---

## Part 1 — Mindset & Standards

### The 4D Non-Negotiables

Every engineer at ATS follows the 4D Framework on every task — no exceptions, no matter how small the ticket.

```
DEFINE → DESIGN → DEVELOP → DEBUG
```

You will be asked in code review: "Where's your AAO?" and "Did you run STRIDE on this?"  
These are not optional. They are how we catch bugs and security issues before they reach production.

### What We Care About (In Order)

1. **Security** — A breach or data leak is an existential event. Security is not a phase; it's a constant.
2. **Correctness** — Code that doesn't work correctly is worse than no code.
3. **Observability** — If we can't see what's happening in production, we're flying blind.
4. **Maintainability** — Code is read 10x more than it's written. Write for the next engineer.
5. **Performance** — Optimise only with data (profiler, EXPLAIN ANALYZE). Never premature.

### What We Do NOT Do

Memorise these. Doing any of them is a serious issue:

- Hardcode secrets, API keys, or passwords in code
- Store plain-text passwords
- Use `Math.random()` for security tokens
- Put JWT in `localStorage`
- String-concatenate user input into SQL queries
- Return stack traces to the client
- Commit without running lint + tests
- Merge without code review
- Deploy to production without a rollback plan

---

## Part 2 — Repository Structure

```
project-root/
├── apps/
│   ├── web/          ← Next.js 15 (TypeScript)
│   ├── mobile/       ← React Native + Expo
│   └── api/          ← Fastify (Node.js) or FastAPI (Python)
├── packages/
│   ├── shared-types/ ← Shared TypeScript interfaces
│   ├── shared-utils/ ← Pure utility functions
│   └── shared-ui/    ← Design system components
├── infra/            ← Terraform IaC
├── docs/
│   ├── adr/          ← Architecture Decision Records
│   ├── api/          ← API contracts
│   ├── security/     ← Threat models
│   └── postmortems/  ← Incident postmortems
└── .github/workflows/← CI/CD pipelines
```

All docs live in `/docs`. Never leave architecture decisions as Slack messages or Notion pages that will disappear.

---

## Part 3 — Local Development Setup

### Prerequisites

```bash
# Required
node   >= 20 LTS
python >= 3.11 (if working on Python services)
docker + docker compose
git

# Install these globally
npm install -g pnpm     # package manager
npm install -g tsx      # TypeScript execution
```

### First-Time Setup

```bash
# 1. Clone the repo
git clone git@github.com:annaitech/{project}.git
cd {project}

# 2. Copy environment template (NEVER edit .env.example — it has fake values only)
cp .env.example .env
# Fill in real values — ask your lead for dev credentials

# 3. Install dependencies
pnpm install

# 4. Start local services (PostgreSQL, Redis, MailHog)
docker compose up -d

# 5. Run database migrations
pnpm --filter api db:migrate

# 6. Seed development data
pnpm --filter api db:seed

# 7. Start all services in dev mode
pnpm dev
```

**Services running locally:**
```
Web app:      http://localhost:3000
API:          http://localhost:4000
API docs:     http://localhost:4000/docs
PostgreSQL:   localhost:5432
Redis:        localhost:6379
MailHog (email test UI): http://localhost:8025
```

### IDE Setup (VS Code Recommended)

Required extensions — install these before anything else:
```
ESLint                    (dbaeumer.vscode-eslint)
Prettier                  (esbenp.prettier-vscode)
TypeScript Error Lens     (usernamehw.errorlens)
GitLens                   (eamodio.gitlens)
REST Client               (humao.rest-client)
Docker                    (ms-azuretools.vscode-docker)
```

Workspace settings are in `.vscode/settings.json` — committed to repo, don't override them.

---

## Part 4 — Git Workflow

### Branch Naming

```
feat/ATS-{id}-{short-description}    New feature
fix/ATS-{id}-{short-description}     Bug fix
security/ATS-{id}-{description}      Security fix (review process is faster)
refactor/ATS-{id}-{description}      Refactor, no functional change
chore/ATS-{id}-{description}         Build, tooling, dependencies
docs/ATS-{id}-{description}          Docs only

Examples:
  feat/ATS-123-palm-vein-registration
  fix/ATS-456-null-phone-crash
  security/ATS-789-rotate-jwt-key
```

### Commit Messages (Conventional Commits — Enforced by CI)

```
<type>(<scope>): <short description>

[optional body — what and why, not how]

[optional footer — BREAKING CHANGE: ..., Closes ATS-123]

Types: feat | fix | perf | refactor | test | docs | chore | security | BREAKING

Examples:
  feat(auth): add TOTP-based MFA for admin accounts
  fix(payment): handle null card token on retry
  security(api): add rate limit to /auth/login
  BREAKING(api): remove deprecated GET /users/list endpoint
```

CI will reject commits that don't follow this format. Use `pnpm commit` for an interactive prompt.

### PR Process

```
1. Create branch from main (or develop if project uses gitflow)
2. Make changes — small, focused PRs (< 400 lines diff preferred)
3. Run pre-PR checks:
     pnpm lint          ← must be zero errors
     pnpm typecheck     ← must pass
     pnpm test          ← must pass
     pnpm audit         ← no high/critical
4. Fill in TEMPLATE-PR-DESCRIPTION.md completely
5. Open PR — assign at least 1 reviewer
6. Address review comments within 1 business day
7. Merge only when: ✅ CI green + ✅ review approved + ✅ checklist complete
```

**PR size guide:** Aim for < 400 lines. > 600 lines → discuss with lead whether to split.

---

## Part 5 — The 4D Framework in Practice

### Step 1 — DEFINE (before writing any code)

When you pick up a ticket:

```
1. Read it fully. If anything is unclear, ask before starting (not after).

2. Write your AAO in the ticket comments:
   [Who] → [does what] → [result] → [constraint]

3. List at least 8 edge cases for the happy path.
   (If you can't think of 8, you haven't thought hard enough.)

4. Identify STRIDE threats — post in ticket if any are significant.

5. Check compliance: does this touch payments? PII? Health data?
   Flag it immediately.
```

### Step 2 — DESIGN (before writing implementation)

For any non-trivial feature (> 1 day of work):

```
1. Write an ADR (use TEMPLATE-ADR.md) for architecture decisions.
   Even a brief one. "We chose X because Y, trade-off is Z."

2. Design the data model changes first. Add column sensitivity labels.

3. Define the API contract (use TEMPLATE-API-CONTRACT.md) before building the route.

4. Get a quick sync with your lead if you're uncertain about the approach.
   10 minutes of alignment saves 2 days of rework.
```

### Step 3 — DEVELOP (follow the SKILL standards)

```
1. Function max 30 lines. If longer — extract.
2. Return early. Guard clauses, not nested ifs.
3. Validate all inputs at entry with Zod / Pydantic.
4. Error handling on every async operation.
5. Never log PII or secrets.
6. Use parameterized queries / ORM always.
7. Follow naming conventions exactly (see QUICK-REFERENCE.md).
```

### Step 4 — DEBUG (before raising PR)

```
1. Run tests locally: pnpm test (all must pass)
2. Run lint: pnpm lint (zero errors)
3. Run security: pnpm audit (no high/critical)
4. Check secrets: gitleaks scan (automated in pre-commit hook)
5. Fill PR template fully.
6. Self-review your own diff before requesting review.
   Read it like a reviewer who doesn't know what you changed.
```

---

## Part 6 — Security Practices You Must Know

### Passwords
Never store plain-text passwords. Ever. Use `argon2id`.  
```ts
import argon2 from 'argon2';
const hash = await argon2.hash(password, { type: argon2.argon2id });
const valid = await argon2.verify(hash, password);
```

### Secrets
Secrets go in `.env` (local only, gitignored) or AWS Secrets Manager (staging/prod).  
If you accidentally commit a secret:
1. Immediately tell your lead.
2. Revoke/rotate the secret.
3. Purge from git history (`git filter-repo`).
4. Check if it was ever deployed or exposed.

### SQL Queries
Every DB interaction goes through ORM or parameterised queries.
```ts
// ✅ Correct
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ Never
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### Authentication
Check auth and authorization on every protected route. Never trust the client's claimed identity.

### Logging
```ts
// ✅ Log this
logger.info({ userId: maskId(user.id), action: 'payment.initiated', amount: 1500 });

// ❌ Never log
logger.info({ password: user.password, token: jwt, aadhaar: user.aadhaar });
```

---

## Part 7 — AI Agent Development

If your ticket involves AI agents, read §3.5 and §4.6 of the SKILL file fully.

Key rules to internalise:
- **Never** put user input directly in the system prompt
- **Every** tool call must be logged (input, output, duration, success/error)
- **Every** tool needs a timeout
- **Destructive** tools (send email, charge payment, delete data) need human approval gate
- **Always** validate LLM output schema before acting on it

---

## Part 8 — Testing Expectations

You own the tests for your code. Reviewers will check test quality.

```
Domain logic:   ≥ 90% coverage
Controllers:    ≥ 75% coverage
Utilities:      ≥ 95% coverage
Auth flows:     100% coverage
Payment flows:  100% coverage
```

**Rule:** If you fix a bug, you must add a test that would have caught that bug.

**Rule:** Tests must be deterministic. No `Math.random()`, no `Date.now()` without mocking, no `sleep()`.

---

## Part 9 — Communication Standards

### When to Raise a Blocker

If you are blocked for more than 2 hours, raise it immediately. Do not silently sit on a blocker.

Post in `#dev-{project}` Slack:
```
🚧 BLOCKER | ATS-{id}
What I'm trying to do: ...
What's blocking me: ...
What I've tried: ...
Who can help: @{name} or anyone with knowledge of {area}
```

### When to Escalate a Security Issue

Immediately, no exceptions. Use `#security-alerts` Slack.  
Do NOT commit a workaround and plan to fix it later.

### Code Review Etiquette

**As an author:**
- Respond to comments within 1 business day
- Don't take feedback personally — it's about the code
- If you disagree, discuss respectfully with evidence

**As a reviewer:**
- Be specific and constructive: "Consider X because Y" not "This is wrong"
- Distinguish: `[Blocker]` vs `[Suggestion]` vs `[Nit]`
- Approve only when you've actually reviewed — not as a courtesy

---

## Part 10 — Your First Week Checklist

```
Day 1
  □ Complete development environment setup
  □ Run the full test suite locally (must pass)
  □ Read QUICK-REFERENCE.md fully
  □ Read §5 (Security Master Reference) of SKILL.md fully
  □ 1:1 with your lead — agree on first ticket

Day 2–3
  □ Pick up first ticket (start small — a bug fix or small feature)
  □ Write your AAO in the ticket before coding
  □ Pair with a teammate on the Define/Design phases

Day 4–5
  □ Open your first PR using TEMPLATE-PR-DESCRIPTION.md
  □ Walk your reviewer through your approach
  □ Address review feedback
  □ Read the relevant compliance section (§6) for your project domain

Week 2
  □ Read the full SKILL.md (set aside 2h — it's worth it)
  □ Contribute to a threat model session for an upcoming feature
  □ Shadow a production deployment
```

---

## Part 11 — Key References

| Document | Location | When to Read |
|---|---|---|
| 4D SKILL v2.13 | `/docs/4D_FULLSTACK_SKILL_v2.13.md` | Before every phase |
| Quick Reference | `/docs/QUICK-REFERENCE.md` | Pin it. Daily. |
| ADR Template | `/docs/TEMPLATE-ADR.md` | Before architecture decisions |
| Threat Model Template | `/docs/TEMPLATE-THREAT-MODEL.md` | Before designing new features |
| API Contract Template | `/docs/TEMPLATE-API-CONTRACT.md` | Before building new endpoints |
| PR Template | `/docs/TEMPLATE-PR-DESCRIPTION.md` | Every PR |
| Postmortem Template | `/docs/TEMPLATE-POSTMORTEM.md` | After incidents |
| AI Agent Playbook | `/docs/AI-AGENT-PLAYBOOK.md` | AI/agent features |
| Compliance Checklist | `/docs/COMPLIANCE-CHECKLIST.md` | Regulated features |
| Runbooks | `/docs/runbooks/` | Production incidents |

---

## Questions?

- **Stuck on code:** `#dev-{project}` or DM your lead
- **Security concern:** `#security-alerts` immediately
- **Process question:** `#engineering` or your lead
- **Urgent production issue:** Call / WhatsApp on-call engineer directly

---

*Welcome to ATS. Build things that matter, build them right.*  
*ATS Onboarding Guide v2.13 | Chennai | annaitech.com*

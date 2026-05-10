# Master Gate Checklists
**ATS 4D Framework v2.13 | ANNAITECH SOLUTIONS**  
*All gate checklists in one document. Use at each phase transition.*  
*Copy the relevant section into your ticket/PR as you work.*

---

## DEFINE GATE — Before Starting Design

```
Context
  □ Problem stated in one sentence
  □ AAO model written: [Actor] → [Action] → [Outcome] → [Constraint]
  □ Stakeholders and actors identified with privilege levels
  □ Out-of-scope items explicitly listed

Edge Cases (minimum 8)
  □ Null / empty inputs
  □ Maximum boundary values
  □ Concurrent access / race conditions
  □ Network failure mid-operation
  □ Partial success scenarios
  □ Expired tokens / sessions
  □ Duplicate submission (double-tap / double-click)
  □ Malformed data from third parties
  □ Time zone and character encoding edge cases
  □ Accessibility (keyboard-only, screen reader)

STRIDE Threat Model
  □ Spoofing threats identified and mitigations planned
  □ Tampering threats identified and mitigations planned
  □ Repudiation threats identified and mitigations planned
  □ Information Disclosure threats identified and mitigations planned
  □ Denial of Service threats identified and mitigations planned
  □ Elevation of Privilege threats identified and mitigations planned
  □ Complete threat model saved to /docs/security/threat-model-{feature}.md

Compliance
  □ GDPR: applies? Yes / No — if yes, lawful basis documented
  □ PCI-DSS: applies? Yes / No — if yes, scope reduction strategy confirmed
  □ HIPAA: applies? Yes / No — if yes, BAA in place
  □ DPDP Act: applies? Yes / No — if yes, consent mechanism designed
  □ RBI/NPCI: applies? Yes / No — if yes, 2FA + device binding planned
  □ WCAG 2.2 AA: applies? Yes / No — if yes, accessibility planned from design

Constraints
  □ Performance SLAs defined (P99 latency, throughput)
  □ Availability SLA defined (99.9% / 99.99%)
  □ Tech stack constraints confirmed
  □ Timeline and MVP scope agreed
```

---

## DESIGN GATE — Before Starting Development

```
Architecture
  □ Architecture pattern chosen (Monolith / Microservices / Serverless / etc.)
  □ ADR written and saved to /docs/adr/ADR-{N}-{slug}.md
  □ Domain boundaries defined
  □ No circular dependencies between domains

Data Design
  □ ERD or data model documented
  □ All PII fields labelled [PII]
  □ All encrypted fields labelled [ENCRYPTED]
  □ All hashed fields labelled [HASHED]
  □ Mandatory columns present (id, created_at, updated_at, deleted_at, created_by)
  □ UUID primary keys (not sequential integers for exposed IDs)
  □ Indexes planned for all FK and query columns
  □ Data retention and deletion policy defined per data type
  □ Migration has UP and DOWN scripts
  □ Migration backward-compatible with current schema

API Contract
  □ Endpoint written with: method, path, auth, rate limit, idempotency
  □ Request schema: all fields with type, required, validation rules
  □ Response schema: success + all error variants
  □ Standard envelope format used (success, data, meta / error, code, requestId)
  □ HTTP status codes correct per standard
  □ API contract saved to /docs/api/{service}.md

Security Architecture
  □ Auth strategy: OAuth 2.0 / JWT / session — documented
  □ Token expiry defined (access ≤ 15 min, refresh ≤ 7 days)
  □ Token storage strategy: httpOnly cookie (not localStorage)
  □ RBAC / ABAC / ReBAC model chosen and documented
  □ Ownership check defined: who can access what
  □ Secrets management: Secrets Manager / Doppler — no hardcoding plan
  □ Network trust boundaries defined
  □ CORS policy: explicit whitelist (no wildcard)

AI Agent Design (if applicable)
  □ Agent pattern chosen (ReAct / Plan-Act / Multi-Agent)
  □ Tool registry defined with tiers (READ_ONLY / WRITE / DESTRUCTIVE / EXTERNAL)
  □ Tool schemas defined (input + output)
  □ Human approval gate designed for DESTRUCTIVE tools
  □ Memory architecture defined
  □ Guardrails: prompt injection defense, PII filter, output validation
  □ Cost ceiling defined (tokens per run, USD per run)
  □ Kill switch planned (feature flag)
  □ Observability: full run trace planned

Infrastructure
  □ Environment strategy defined (dev / staging / prod)
  □ DR strategy: RTO and RPO defined
  □ Backup strategy: automated + tested
  □ Performance budget set (web vitals / API latency / throughput)
```

---

## DEVELOP GATE — Before Raising PR

```
Code Quality
  □ Linting passes: zero errors, zero warnings (pnpm lint)
  □ TypeScript type check passes: zero errors (pnpm typecheck)
  □ No functions exceeding 30 lines
  □ No parameters exceeding 3 (use options object)
  □ Naming follows conventions (see QUICK-REFERENCE.md)
  □ No commented-out dead code
  □ No TODOs without linked issue and owner
  □ No console.log / print debug statements

Security
  □ Secrets scan: gitleaks passes — no credentials in code
  □ Dependencies: npm audit / pip-audit — zero high/critical
  □ Inputs validated at entry point with schema (Zod / Pydantic)
  □ Auth check: every protected endpoint verifies token
  □ Ownership check: user can only access their own resources
  □ No SQL / shell / XSS / NoSQL injection vectors
  □ Sensitive data masked in logs and API responses
  □ No PII or stack traces in error messages returned to client
  □ Parameterized queries / ORM used exclusively
  □ Files: MIME magic bytes check + UUID filename + virus scan flag

Error Handling
  □ try/catch on every async operation
  □ No empty catch blocks (catch(e) {})
  □ Typed error classes used (AuthError, ValidationError)
  □ User-facing errors: generic message + error code only
  □ Server logs: full context + requestId + stack trace

Database
  □ SELECT only needed columns (no SELECT *)
  □ LIMIT on every query
  □ EXPLAIN ANALYZE run on all new queries
  □ N+1 queries: none introduced
  □ Multi-step writes wrapped in transactions

Background Jobs (if applicable)
  □ Jobs are idempotent (safe to run twice)
  □ Jobs serialize IDs only (not full objects)
  □ Timeout configured
  □ Retry with exponential backoff configured
  □ DLQ configured for failed jobs

AI Agent (if applicable)
  □ User input NOT in system prompt
  □ Tool schemas validated before call
  □ Output schema validated after call
  □ Every tool call: logged to audit trail
  □ Timeout on every tool call
  □ DESTRUCTIVE tool: human approval gate implemented
  □ Cost ceiling: implemented and tested
  □ PII filter on outgoing responses

Logging
  □ Structured JSON logging (not plain string)
  □ Every log has: timestamp, level, service, requestId
  □ Sensitive data masked or excluded from logs
  □ Business events logged at INFO level
  □ Errors logged at ERROR level with full context

PR Preparation
  □ PR description filled using TEMPLATE-PR-DESCRIPTION.md
  □ Security checklist section in PR completed
  □ Test instructions included
  □ Database changes section completed (if applicable)
  □ Deployment notes section completed
```

---

## DEBUG GATE — Before Merging PR

```
Unit Tests
  □ Unit tests added for all new business logic
  □ Unit tests cover: happy path, edge cases, error paths
  □ Domain / Business Logic coverage ≥ 90%
  □ API Controllers coverage ≥ 75%
  □ Utility Functions coverage ≥ 95%
  □ Auth and payment paths: 100% coverage
  □ Bug fixes: regression test added that would have caught the bug
  □ No sleep() in tests — fake timers or stubs used
  □ All tests deterministic (no Math.random(), no Date.now() without mock)
  □ pnpm test: passes fully with zero failures

Integration Tests
  □ API integration tests cover: 200 happy path, 400/401/403/404/429 responses
  □ Auth flows tested: register, login, token refresh, logout
  □ DB interactions: CRUD + constraints + soft delete
  □ Rate limiting tested (assert 429 after N requests)

Security Testing
  □ OWASP A01 Broken Access Control:
      □ Horizontal escalation: User A cannot access User B's resources
      □ Vertical escalation: User cannot access admin endpoints
      □ IDOR: iterating object IDs returns 403 for unauthorised
  □ OWASP A03 Injection:
      □ SQL injection attempt tested
      □ XSS payload rejected
  □ OWASP A07 Auth Failures:
      □ Expired token rejected
      □ Invalid token rejected
      □ Rate limit on auth endpoint verified
  □ Security headers verified:
      □ Strict-Transport-Security present
      □ X-Content-Type-Options: nosniff
      □ X-Frame-Options: DENY
      □ Content-Security-Policy present
  □ No sensitive data in response:
      □ Password hash not returned
      □ Full PAN not returned
      □ Stack trace not returned

AI Agent Testing (if applicable)
  □ Golden tests pass (known input → expected output schema)
  □ Prompt injection test: refused + audit logged
  □ PII extraction test: refused + no PII in response
  □ Tool schema validation: invalid input rejected
  □ Timeout test: tool respects timeout limit
  □ Cost ceiling test: run stops at defined limit

Performance
  □ EXPLAIN ANALYZE: no sequential scans on tables > 10k rows
  □ N+1 queries: none detected in test run
  □ Response time: P95 within SLA target
  □ No render-blocking resources on critical web path (if FE change)

Accessibility (if FE change)
  □ axe-core: zero violations
  □ Keyboard navigation: all interactive elements reachable
  □ Colour contrast: meets 4.5:1 for text
  □ Images: alt text present and meaningful

Code Review
  □ Approved by ≥ 1 reviewer (≥ 2 for auth/payment changes)
  □ All blocker comments resolved
  □ CI pipeline: fully green (lint + typecheck + tests + audit + scan)
```

---

## PRE-DEPLOY GATE — Before Production Deployment

```
Environment Readiness
  □ All env vars set in target environment (Secrets Manager / Doppler)
  □ No .env file in container image or committed
  □ Debug logging disabled in production config
  □ Secrets rotated from dev/staging API keys to production keys
  □ Feature flags configured for new features

Database
  □ Migration dry-run completed on staging
  □ Backup taken immediately before production migration
  □ Migration tested with production-size data on staging
  □ Migration is backward-compatible (old code works against new schema)
  □ Rollback migration (DOWN) written and tested
  □ DB connection pool sized correctly for production load

Security
  □ Security headers configured (Strict-Transport-Security, CSP, X-Frame-Options etc.)
  □ CORS: whitelist contains only production domains
  □ Rate limits: configured for production scale
  □ WAF rules: reviewed and updated if new attack surface added
  □ SSL certificate: valid and auto-renew configured
  □ Vulnerability scan: zero high/critical in container image (Trivy)

Monitoring
  □ Health check endpoint responds: GET /health → 200
  □ APM / tracing: configured and receiving data
  □ Error alerting: PagerDuty / Slack channel configured
  □ Log aggregation: flowing to CloudWatch / Datadog
  □ Dashboards: golden signals (latency, traffic, errors, saturation) updated
  □ New critical path: alert created for error rate threshold

Performance
  □ Load test on staging: results meet SLA targets
  □ Cache warming strategy: in place for cold start if applicable
  □ CDN: cache rules configured for new static assets

Rollback Readiness
  □ Previous container image: tagged and retained in ECR
  □ DB rollback procedure: documented and tested
  □ Traffic rollback: blue/green switch or canary stop tested
  □ Rollback runbook: updated and linked in release notes
  □ On-call engineer: aware of deployment window

AI Agent Production (if applicable)
  □ System prompt version committed and hash recorded
  □ Adversarial test suite passed on production prompt
  □ Cost ceiling configured for production user volume
  □ Kill switch (feature flag) configured and tested
  □ Run trace observability flowing to platform
  □ Alert: cost per run > threshold configured
  □ Gradual rollout: feature flag starts at 5%

Sign-Off
  □ QA / UAT: passed by product owner or stakeholder
  □ Security checklist above: fully completed
  □ Release notes: written and shared
  □ On-call engineer: confirmed available for 2h post-deploy
  □ Deployment window: agreed (avoid: Friday afternoon, before major holidays)
```

---

## INCIDENT RESPONSE CHECKLIST

*Use when a production incident is detected.*

```
□ DETECT — Alert received or user report received
    □ Confirm the issue is real (not a monitoring false positive)
    □ Assess initial scope: which services, how many users

□ ASSESS — Determine severity
    □ P1: payment down, data breach, complete service outage
    □ P2: major feature degraded, > 10% error rate
    □ P3: minor feature degraded, < 10% error rate, workaround exists
    □ P4: cosmetic or low-impact issue

□ DECLARE
    □ Open incident Slack channel: #inc-{YYYY-MM-DD}-{N}
    □ Page on-call engineer (P1/P2 only — wake if needed)
    □ Post status update in channel every 15 min (P1) or 30 min (P2)
    □ Notify customer support lead: alert them of ongoing issue
    □ Update status page if user-visible

□ INVESTIGATE
    □ Assign incident commander (one person in charge)
    □ Check dashboards: error rate, latency, saturation
    □ Check recent deployments (last 4 hours — likely cause)
    □ Check logs: filter by service + time of first error
    □ Check queue depth: any backup?
    □ Formulate ONE hypothesis before acting

□ MITIGATE
    □ Rollback deployment if deployment is root cause
    □ Scale up if resource exhaustion
    □ Disable feature flag if new feature is root cause
    □ Failover to DR if primary region unavailable
    □ Confirm: error rate returned to baseline after mitigation

□ RESOLVE
    □ Confirm: all services healthy for ≥ 15 min
    □ Update status page: resolved
    □ Notify stakeholders: resolved with summary
    □ Close incident channel

□ POSTMORTEM
    □ Author assigned within 1 hour of resolution
    □ Draft published within 24 hours (P1) or 48 hours (P2)
    □ Use TEMPLATE-POSTMORTEM.md
    □ Action items: owner + due date for every item
    □ Shared to #postmortems and internal wiki

Regulatory Notification (if data breach)
    □ GDPR: notify DPA within 72 hours if > 250 individuals affected
    □ DPDP: notify Data Protection Board within 72 hours
    □ HIPAA: notify HHS within 60 days (< 500) or immediately (≥ 500)
    □ RBI: notify within 6 hours for payment system incidents
    □ Legal team: notified for any data breach immediately
```

---

## AI AGENT SAFETY GATE — Before Any Agent Production Deploy

```
System Prompt
  □ Version-controlled (commit SHA recorded in agent config)
  □ Reviewed by ≥ 2 engineers
  □ No user-controlled input can reach system prompt
  □ Structural delimiters (XML tags) separate untrusted content
  □ Negative constraints explicit and specific

Tool Safety
  □ Every tool has: schema, timeout, rate limit, audit log
  □ READ_ONLY tools: schema validated, audit logged
  □ WRITE tools: schema validated, audit logged, rate limited
  □ DESTRUCTIVE tools: schema validated, human approval gate, audit logged
  □ EXTERNAL tools: URL allowlisted, rate limited, logged

Output Safety
  □ Output schema validated before any action taken
  □ PII filter applied on all outgoing responses
  □ Confidence threshold: low confidence → escalate, not act
  □ Canary detection: CANARY string in context → abort + alert

Adversarial Tests Passed
  □ Prompt injection: refused + logged
  □ System prompt extraction: refused + no disclosure
  □ Privilege escalation via tool: blocked
  □ Infinite loop: cost ceiling hit and stopped
  □ SSRF via URL tool: internal IPs blocked

Operations
  □ Kill switch: disable flag configured and tested
  □ Cost ceiling: token budget and USD ceiling set
  □ Alert: run failure rate > 1%
  □ Alert: cost per run > threshold
  □ Alert: tool call failure rate > 5%
  □ Rollout: starting at 5% of users
  □ Human review: 20 sample outputs reviewed before launch
```

---

*ATS Master Gate Checklists v2.13*  
*These checklists are mandatory at every phase transition — not optional.*  
*ANNAITECH SOLUTIONS | Chennai | annaitech.com*

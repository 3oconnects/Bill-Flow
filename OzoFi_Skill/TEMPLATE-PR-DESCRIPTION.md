# Pull Request Template
<!-- Copy this for every PR. Delete sections marked [optional] if not applicable. -->
<!-- Branch naming: type/ATS-{id}-short-description -->
<!-- Types: feat | fix | refactor | perf | test | docs | chore | security -->

## ATS-{ID} — {Short Title}

> **What:** One sentence describing the change.  
> **Why:** One sentence on the business/technical reason.

---

## Type of Change
<!-- Check all that apply -->

- [ ] ✨ New feature
- [ ] 🐛 Bug fix
- [ ] 🔒 Security fix
- [ ] ♻️ Refactor (no functional change)
- [ ] ⚡ Performance improvement
- [ ] 🗃️ Database migration
- [ ] 🧪 Tests only
- [ ] 📝 Documentation
- [ ] 🚧 Work in progress (do not merge)

---

## Description

### What Changed
> Describe the implementation. Reference key files, functions, or design decisions.
> Link to the ADR if an architecture decision was made.

### Why This Approach
> Brief justification. Link to the relevant section of the ticket or ADR.

### Edge Cases Handled
> List the edge cases you explicitly addressed. Reference the Define phase edge case list.

- [ ] {Edge case 1}
- [ ] {Edge case 2}
- [ ] {Null / empty input}
- [ ] {Concurrent access}
- [ ] {Token expiry mid-flow}

---

## Security Checklist
<!-- Required on every PR. Mark N/A where genuinely not applicable — don't skip. -->

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Inputs validated at entry point (Zod / Pydantic schema)
- [ ] Auth check present on all protected endpoints
- [ ] Ownership check present (user can only access their own resources)
- [ ] No SQL / shell / XSS injection vectors introduced
- [ ] Sensitive data masked in logs and API responses
- [ ] No PII in error messages returned to client
- [ ] New dependencies audited (`npm audit` / `pip-audit` — no high/critical)
- [ ] gitleaks scan passed (no secrets in diff)
- [ ] **N/A:** {explain if any above genuinely don't apply}

---

## Testing

### Test Coverage
- Unit tests added: **Yes / No** — {describe what's covered}
- Integration tests added: **Yes / No** — {describe what's covered}
- E2E test updated: **Yes / No / N/A**
- Coverage meets gate (≥ 90% domain, ≥ 75% controllers): **Yes / No**

### How to Test Manually
```
1. {Step 1 — e.g., POST /auth/register with body: {...}}
2. {Step 2 — e.g., Verify email in MailHog at localhost:8025}
3. {Step 3 — expected result}
```

### Test Credentials / Fixtures [optional]
```
Test user: test+feature@ats.dev / Password123!
Test card: 4111111111111111 (Razorpay test mode)
```

---

## Database Changes [optional — delete if none]

- [ ] Migration included
- [ ] Migration has UP and DOWN scripts
- [ ] Migration is backward-compatible (old code runs against new schema)
- [ ] Migration tested on staging with production-size dataset
- [ ] Indexes added for new query patterns
- [ ] `EXPLAIN ANALYZE` run on all new queries

**Migration name:** `{timestamp}_{description}.sql`  
**Rollback procedure:** {brief description or link}

---

## API Changes [optional — delete if none]

- [ ] No breaking changes to existing consumers
- [ ] API contract document updated (`/docs/api/...`)
- [ ] OpenAPI spec regenerated
- **Breaking change?** No / Yes — *Deprecation notice sent on {date}; consumers updated*

---

## AI Agent Changes [optional — delete if none]

- [ ] Tool schemas validated
- [ ] Tool timeouts configured
- [ ] Audit log entry verified in test
- [ ] Prompt injection guard tested
- [ ] Human approval gate present for DESTRUCTIVE tools
- [ ] Cost ceiling / token budget set

---

## Observability

- [ ] New code paths have structured log entries (INFO level business events)
- [ ] New errors have correct log level and context
- [ ] No PII or secrets in log output
- [ ] New metrics / dashboards created if critical path added
- [ ] Alerts updated if SLA-impacting change

---

## Deployment Notes

- [ ] Feature flag required: **Yes** — `{flag_name}` | **No**
- [ ] Environment variables added: **Yes** — {list var names, NOT values} | **No**
- [ ] Secrets to add in Secrets Manager: **Yes** — {list secret names} | **No**
- [ ] Rollback procedure: {describe or "standard image rollback"}
- [ ] Other pre-deploy steps: {describe or "None"}

---

## Screenshots / Demo [optional]

<!-- Attach screenshots for UI changes, Postman screenshots for API changes -->

---

## Related

- **Ticket:** [ATS-{ID}](https://linear.app/ats/issue/ATS-{ID})
- **ADR:** [ADR-{N}](/docs/adr/ADR-{N}-{slug}.md) *(if architecture decision made)*
- **API Contract:** [/docs/api/...](/docs/api/{service}.md) *(if API changed)*
- **Related PRs:** #{PR number}

---

## Reviewer Notes

> Anything you want to flag for the reviewer — areas of uncertainty, decisions you want second opinion on, or known limitations.

---

<!-- 
REVIEWER GUIDE:
  Blockers:     Must fix before merge — mark as "Request changes"
  Suggestions:  Worth discussing — mark as comment "Suggestion:"
  Nits:         Trivial optional — mark as "Nit:"
  Praise:       Worth noting — mark as "Nice:"
  
  DO check: correctness, security (use security checklist above), test quality, naming, error handling.
  DO NOT bike-shed style that follows the SKILL standard — trust the standard.
-->

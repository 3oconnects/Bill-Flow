# 4D Quick Reference — Developer Cheat Sheet
**v2.13 | ANNAITECH SOLUTIONS**  
*Pin this. Read before every PR.*

---

## THE 4D LOOP

```
DEFINE ──► DESIGN ──► DEVELOP ──► DEBUG
  │                                  │
  └──────── No phase skippable ──────┘
```

---

## DEFINE IN 60 SECONDS

```
1. One-sentence problem statement
2. AAO: [Actor] → [Action] → [Outcome] → [Constraint]
3. STRIDE: Spoofing / Tampering / Repudiation /
           Info Disclosure / DoS / Elevation of Privilege
4. Compliance flag: GDPR? PCI? HIPAA? DPDP? WCAG?
5. List 8+ edge cases before writing anything
```

---

## NAMING — ALWAYS

```
Variables      camelCase          userId, orderTotal
Functions      verb+noun          getUserById, sendOtpEmail
Classes        PascalCase         UserService, PaymentProcessor
Constants      UPPER_SNAKE_CASE   MAX_RETRY_COUNT
Files (TS)     kebab-case         user-service.ts
Files (Python) snake_case         user_service.py
DB tables      snake_case plural  user_accounts, payment_logs
Git branches   type/ATS-id-slug   feat/ATS-123-palm-auth
```

---

## FUNCTION RULES

```
Max length:   30 lines (extract if longer)
Max params:   3       (use options object if more)
Rule:         one function = one thing
Pattern:      return early (guard clauses, not nested ifs)
```

**Bad:**
```ts
function process(user, data, flag, type, ctx) {
  if (user) { if (data) { if (flag) { ... } } }
}
```
**Good:**
```ts
function processOrder(input: ProcessOrderInput): Result<Order> {
  if (!input.user)  return err('USER_REQUIRED');
  if (!input.items) return err('EMPTY_CART');
  return orderDomain.create(input);
}
```

---

## REQUEST LIFECYCLE ORDER (Backend)

```
1  Rate Limiting          ← reject early
2  Request ID attach      ← UUID on every request
3  Request logging        ← method, path, IP (masked)
4  Body parsing + size    ← enforce size limit
5  Input validation       ← Zod / Pydantic schema
6  Authentication         ← verify token
7  Authorization          ← check permissions
8  Business logic         ← domain processing
9  Response shaping       ← strip internals
10 Response logging       ← status, duration
```

---

## HTTP STATUS CODES — GET THESE RIGHT

```
200 OK              Success with body
201 Created         POST created resource
202 Accepted        Async queued
204 No Content      DELETE / empty response
400 Bad Request     Schema / type validation fail
401 Unauthorized    No token or invalid token
403 Forbidden       Token valid, no permission
404 Not Found       Resource doesn't exist
409 Conflict        Duplicate or state conflict
422 Unprocessable   Business rule violated
429 Too Many        Rate limit hit
500 Server Error    Unexpected — log, never expose details
```

---

## STANDARD API ENVELOPES

```json
// Success
{ "success": true, "data": {...}, "meta": { "requestId": "req_abc" } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR",
  "message": "Human message", "requestId": "req_abc" } }

// Paginated
{ "success": true, "data": [...],
  "pagination": { "cursor": "...", "hasMore": true, "total": 430 } }
```

---

## SECURITY — NON-NEGOTIABLES

```
Passwords    → Argon2id (preferred) or bcrypt ≥ cost 12. NEVER MD5/SHA1/plain.
Tokens       → JWT RS256, exp ≤ 15 min, httpOnly cookie (NOT localStorage)
Refresh      → Opaque, rotate on every use, revoke on logout
Random       → crypto.randomBytes / secrets module. NEVER Math.random()
SQL          → Parameterized queries / ORM. NEVER string concat.
Secrets      → AWS Secrets Manager / Doppler. NEVER committed to git.
CORS         → Explicit whitelist. NEVER * in production.
TLS          → 1.2 minimum, 1.3 preferred. NEVER verify=false.
Logs         → NEVER log: passwords, tokens, PAN, Aadhaar, OTPs, keys.
Files        → Validate MIME (magic bytes), regenerate filename, virus scan.
```

---

## SECURITY HEADERS (Apply to All Web Responses)

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: geolocation=(), microphone=()
```

---

## INPUT VALIDATION RULES

```
Strings  → max length, trim, charset validation
Numbers  → min/max range, int vs float, no NaN/Infinity
Dates    → ISO 8601, range check (not year 9999)
Files    → magic bytes MIME check, max size, sanitise filename
URLs     → allowlist domains, block internal IPs (SSRF)
HTML     → DOMPurify / bleach — NEVER regex sanitisation
SQL      → parameterized — always
Shell    → arg array — never string interpolation
```

---

## ERROR HANDLING RULES

```
✅ Catch at correct layer — never swallow silently
✅ User sees: generic message + error code
✅ Logs contain: full context + requestId + stack
✅ All async: try/catch or .catch()
✅ Use typed error classes: AuthError, ValidationError
❌ catch(e) {}          — empty catch forbidden
❌ HTTP 200 for errors  — use correct status code
❌ Stack trace to client — never
```

---

## TESTING MINIMUMS (CI FAILS IF NOT MET)

```
Domain / Business Logic    ≥ 90%
API Controllers            ≥ 75%
AI Agent Tools             ≥ 85%
Utility Functions          ≥ 95%
DB Migrations              100% (UP + DOWN tested)
Critical paths (auth/pay)  100%
```

---

## LOG STRUCTURE (Every Line)

```json
{
  "timestamp": "2026-05-07T10:30:00.123Z",
  "level": "info",
  "service": "payment-service",
  "requestId": "req_7x9abc",
  "userId": "usr_***xyz",
  "action": "payment.initiated",
  "duration_ms": 145,
  "message": "..."
}
```

**Level guide:** ERROR (alert now) → WARN (investigate) → INFO (business event) → DEBUG (dev only)

---

## DB QUERY RULES

```
✅ Parameterized queries always
✅ SELECT only needed columns (never SELECT *)
✅ LIMIT on every query
✅ Index on every FK + WHERE/ORDER column
✅ EXPLAIN ANALYZE before shipping any new query
✅ Wrap multi-step writes in explicit transaction
❌ N+1 queries — forbidden
❌ Unbounded queries — forbidden
❌ SELECT * — forbidden
```

---

## MANDATORY DB COLUMNS (Every Table)

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
deleted_at  TIMESTAMPTZ NULL          -- soft delete
created_by  UUID REFERENCES users(id)
```

---

## AI AGENT SAFETY RULES

```
✅ Schema-validate tool inputs before calling
✅ Schema-validate LLM output before acting on it
✅ Timeout on every tool call (default 10s)
✅ Human approval gate for DESTRUCTIVE tools
✅ Audit log entry on every tool call
✅ Cost ceiling per run / per user
✅ Kill switch (disable without redeploy)
❌ User input in system prompt — never
❌ Agent modifies its own prompt / tools — never
❌ Unbounded tool calls per run — never
❌ PII in LLM response logs — never
```

---

## AI AGENT TOOL TIERS

```
READ_ONLY   → DB queries, GETs, file reads
WRITE       → DB writes, POSTs (log justification)
DESTRUCTIVE → Delete, send email/SMS, charge payment → HUMAN APPROVAL
EXTERNAL    → Any internet call → logged + rate-limited
```

---

## COMPLIANCE QUICK SCAN

| Situation | Regulation | #1 Requirement |
|---|---|---|
| EU users | GDPR | Consent + right to erasure |
| Card payments | PCI-DSS | No raw PAN stored; tokenise |
| US health data | HIPAA | PHI encrypted + audit trail |
| B2B SaaS | SOC 2 | Change mgmt + access reviews |
| Indian users | DPDP Act | Consent + data principal rights |
| Indian payments | RBI/NPCI | 2FA + device binding |
| Public website | WCAG 2.2 AA | Keyboard + contrast + screen reader |

---

## ANTI-PATTERNS — INSTANT PR BLOCK

```
❌ Secrets in code
❌ Plain-text passwords stored
❌ Math.random() for security
❌ JWT in localStorage
❌ SQL string concatenation with user input
❌ eval() / exec() with user input
❌ verify=False / rejectUnauthorized:false
❌ CORS wildcard in production
❌ Stack trace returned to client
❌ SELECT *
❌ Empty catch block
❌ console.log in production code
❌ No error handling on async calls
❌ AI agent with no tool timeout
❌ Agent acting on unvalidated LLM output
```

---

## 4D GATE — MUST PASS BEFORE NEXT PHASE

| Phase | ✅ To Exit |
|---|---|
| DEFINE | Problem + AAO + STRIDE + compliance flags done |
| DESIGN | ADR + ERD + API contracts + auth strategy ready |
| DEVELOP | Lint clean + no secrets + inputs validated + PR written |
| DEBUG | Tests pass + OWASP checked + review approved + pre-deploy signed |

---

*ATS 4D Framework v2.13 | annaitech.com | Chennai*

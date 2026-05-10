# ATS 4D Framework — Document Suite
**Version:** 2.13 | **ANNAITECH SOLUTIONS | Chennai**  
*Full-stack development standard for Web · Mobile · AI Agents · Security · Compliance*

---

## Document Map

```
4D-FRAMEWORK/
├── README.md                          ← You are here — start here
├── 4D_FULLSTACK_SKILL_v2.13.md        ← MASTER SKILL FILE (read fully on onboarding)
├── QUICK-REFERENCE.md                 ← Daily cheat sheet — pin this
├── MASTER-CHECKLISTS.md               ← All gate checklists — use at every phase
├── ONBOARDING.md                      ← New developer guide
├── AI-AGENT-PLAYBOOK.md               ← AI/LLM agent development guide
├── COMPLIANCE-CHECKLIST.md            ← GDPR, PCI, HIPAA, DPDP, RBI, WCAG
│
└── templates/
    ├── TEMPLATE-ADR.md                ← Architecture Decision Record
    ├── TEMPLATE-THREAT-MODEL.md       ← STRIDE threat model
    ├── TEMPLATE-API-CONTRACT.md       ← API endpoint contract
    ├── TEMPLATE-PR-DESCRIPTION.md     ← Pull request template
    └── TEMPLATE-POSTMORTEM.md         ← Incident postmortem
```

---

## When to Use What

| Situation | Document |
|---|---|
| Starting any development task | `QUICK-REFERENCE.md` |
| Picking up a new ticket | `MASTER-CHECKLISTS.md` → DEFINE section |
| Making an architecture decision | `TEMPLATE-ADR.md` |
| Designing a new feature | `TEMPLATE-THREAT-MODEL.md` → `TEMPLATE-API-CONTRACT.md` |
| Starting development | `4D_FULLSTACK_SKILL_v2.13.md` §3 (DEVELOP) |
| Before raising a PR | `TEMPLATE-PR-DESCRIPTION.md` → `MASTER-CHECKLISTS.md` DEBUG section |
| Before deploying | `MASTER-CHECKLISTS.md` PRE-DEPLOY section |
| Building AI agents | `AI-AGENT-PLAYBOOK.md` |
| Handling a production incident | `MASTER-CHECKLISTS.md` INCIDENT RESPONSE section |
| Writing a postmortem | `TEMPLATE-POSTMORTEM.md` |
| Checking compliance requirements | `COMPLIANCE-CHECKLIST.md` |
| Onboarding a new developer | `ONBOARDING.md` |
| Deep reference on any topic | `4D_FULLSTACK_SKILL_v2.13.md` (full SKILL) |

---

## The 4D Framework in One Page

```
DEFINE ──────────────────────────────────────────────────────►
  Write AAO model before touching code.
  Run STRIDE threat model before designing.
  Flag compliance requirements upfront.
  List 8+ edge cases for every feature.

DESIGN ──────────────────────────────────────────────────────►
  Write ADR for architecture decisions.
  Design data model with sensitivity labels.
  Write API contract before building the route.
  Define auth, secrets, and trust boundaries.

DEVELOP ─────────────────────────────────────────────────────►
  Validate all inputs at entry.
  Parameterized queries / ORM only.
  Error handling on every async operation.
  Secrets never in code.
  Max 30 lines per function.
  Structured logs — never log PII.

DEBUG ───────────────────────────────────────────────────────►
  Tests: ≥90% domain, ≥75% controllers, 100% auth/payment.
  OWASP Top 10 checklist reviewed.
  Security headers verified.
  PR template fully completed.
  Pre-deploy checklist signed off.
```

---

## Key Rules (Memorise These)

```
1.  Write the AAO before writing any code.
2.  Run STRIDE before designing any feature.
3.  Never hardcode a secret. Ever.
4.  Argon2id for passwords. Never MD5/SHA1.
5.  JWT in httpOnly cookie. Never localStorage.
6.  Parameterized queries. Never string concat with user input.
7.  Validate at the boundary. Every input. Every time.
8.  Error handling on every async operation.
9.  Never log passwords, tokens, PAN, Aadhaar, OTPs.
10. Max 30 lines per function. Max 3 parameters.
11. Return early. Guard clauses > nested ifs.
12. Coverage gates: ≥90% domain, ≥75% controllers, 100% critical paths.
13. Pre-deploy checklist is mandatory, not optional.
14. AI agents: schema-validate output before acting. Always.
15. Incidents: blameless postmortem within 48 hours.
```

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 2.13 | 2026-05-09 | Full suite: Web, Mobile, AI Agents, FE, BE, Security, Compliance |
| 1.0 | 2026-05-07 | Initial 4D framework (backend + security basics) |

---

## Contacts

| Role | Responsibility | Contact |
|---|---|---|
| Framework Owner | Document updates, standard evolution | CEO / Tech Lead |
| Security Lead | Threat models, security review | |
| On-Call | Production incidents | Slack #on-call |
| Compliance | GDPR / DPDP / RBI queries | |

---

*This framework is a living document. Raise a PR to `/docs/` to suggest improvements.*  
*All ATS engineers are expected to know and apply this standard.*  
*ANNAITECH SOLUTIONS | Chennai, India | annaitech.com*

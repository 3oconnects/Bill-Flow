# ADR-{NUMBER}: {TITLE}
**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-{N}  
**Deciders:** {Names / Roles}  
**ATS Project:** {Project Name}  
**Ticket:** ATS-{ID}

---

## Context

> Describe the situation, technical or business forces that require a decision.
> What is the problem? Why does a decision need to be made now?
> Keep this factual — no solutions yet.

*Example: Our current monolithic API serves both the web dashboard and the mobile app. With the addition of a partner API, three clients now have diverging data shape requirements causing over-fetching on mobile (averaging 4x payload size needed) and complex conditional logic in controllers.*

---

## Decision Drivers

> List the key factors that matter for this decision. These become your evaluation criteria.

- **Driver 1:** {e.g., Mobile payload must be ≤ 50KB per response}
- **Driver 2:** {e.g., Partner API must be versioned independently}
- **Driver 3:** {e.g., Team size: 3 backend engineers — maintenance burden matters}
- **Driver 4:** {e.g., Must not break existing web client during migration}
- **Driver 5:** {e.g., Security: partner API needs separate auth scope}

---

## Options Considered

### Option A: {Name}

> Describe the option in 3–5 sentences. Be neutral.

**Pros:**
- {Pro 1}
- {Pro 2}

**Cons:**
- {Con 1}
- {Con 2}

**Risk:** {Low | Medium | High} — {one sentence reason}

---

### Option B: {Name}

> Describe the option.

**Pros:**
- {Pro 1}
- {Pro 2}

**Cons:**
- {Con 1}
- {Con 2}

**Risk:** {Low | Medium | High} — {one sentence reason}

---

### Option C: {Name} *(if applicable)*

**Pros:**
**Cons:**
**Risk:**

---

## Decision

**We choose Option {X}: {Name}**

> Explain the reasoning. Reference the decision drivers explicitly.
> Example: "We choose Option B (BFF pattern) because Driver 1 (mobile payload) and Driver 5 (auth scope) both require client-specific tailoring. The maintenance burden (Driver 3) is acceptable given the pattern fits within our existing Node.js expertise and adds only one new service boundary."

---

## Consequences

### Positive
- {What improves as a result}
- {What risk is mitigated}

### Negative / Trade-offs
- {What gets harder or more complex}
- {What we're accepting as a trade-off}

### Neutral
- {Changes that are neither good nor bad, just different}

---

## Implementation Notes

> Practical guidance for the team implementing this decision.

```
Step 1: {First concrete action}
Step 2: {Second action}
Step 3: ...
```

**Affected components:** {List files, services, infra}  
**Migration required:** Yes / No — {if yes, describe briefly}  
**Backward compatibility:** Yes / No — {breaking changes?}  
**Feature flag required:** Yes / No — `{flag_name}`

---

## Security Implications

> Mandatory section. If none, state "No new attack surface introduced."

- **New attack surface:** {describe or "None"}
- **Auth/authz changes:** {describe or "None"}
- **Data sensitivity:** {what new data is handled, classification level}
- **Compliance impact:** {GDPR/PCI/DPDP/HIPAA implications, or "None"}
- **STRIDE impact:** {which STRIDE threats this decision affects}

---

## Review Date

> When should this ADR be revisited?

**Next review:** {YYYY-MM-DD or "After {milestone}"}  
**Supersedes:** ADR-{N} *(if applicable)*  
**Related ADRs:** ADR-{N}, ADR-{N}

---

## Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| Tech Lead | | | ☐ Approved |
| Security | | | ☐ Approved |
| Product | | | ☐ Noted |

---

*ATS ADR Template v2.13 | Store in: /docs/adr/ADR-{NUMBER}-{slug}.md*

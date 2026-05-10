# Incident Postmortem: {Incident Title}
**Incident ID:** INC-{YYYY-MM-DD}-{N}  
**Severity:** P1 Critical | P2 High | P3 Medium  
**Date of Incident:** YYYY-MM-DD  
**Postmortem Author:** {Name}  
**Status:** Draft | In Review | Final  
**ATS Project:** {Project Name}

---

> **Blameless Culture:** This postmortem focuses on systems, processes, and tooling — not individuals.
> The goal is learning and prevention, not blame.

---

## 1. Executive Summary

> 3–5 sentences. What happened, who was affected, for how long, and the key root cause.
> Suitable for leadership and non-technical stakeholders.

*Example: On 2026-05-07 between 14:32 and 16:45 IST, the payment confirmation service was unavailable due to a Redis connection pool exhaustion caused by a misconfigured connection limit following a deployment at 14:30. Approximately 1,240 payment confirmation requests failed silently, and users received no feedback. No payment data was lost — all transactions are reconcilable. Root cause: the production Redis connection limit was not increased to match the new autoscaling configuration.*

---

## 2. Incident Timeline

> Use IST (or your local timezone consistently). Log every significant event.

| Time (IST) | Event | Actor |
|---|---|---|
| {HH:MM} | {What happened — deployment, alert fired, user report, etc.} | {System / Person} |
| {HH:MM} | Alert fired: "Payment service error rate > 5%" | PagerDuty |
| {HH:MM} | On-call engineer acknowledged alert | {Name} |
| {HH:MM} | Incident declared P{N} — war room opened in #inc-{id} | {Name} |
| {HH:MM} | Investigation started — logs reviewed | {Name} |
| {HH:MM} | Hypothesis formed: Redis connection pool exhausted | {Name} |
| {HH:MM} | Mitigation applied: rolled back deployment | {Name} |
| {HH:MM} | Error rate returned to < 0.1% | System |
| {HH:MM} | Service confirmed stable — incident resolved | {Name} |
| {HH:MM} | Stakeholders notified of resolution | {Name} |
| {HH:MM} | Postmortem initiated | {Name} |

**Detection to Resolution:** {X hours Y minutes}  
**Time to Detect:** {X min from incident start to alert / report}  
**Time to Mitigate:** {X min from detection to user impact stopped}  
**Time to Resolve:** {X min from detection to full resolution}

---

## 3. Impact Assessment

### User Impact
- **Users affected:** {N} users / {%} of user base
- **Transactions affected:** {N} transactions | {₹/$ amount}
- **Features unavailable:** {List of features}
- **Geographic scope:** {Region / Global}
- **User experience:** {e.g., Error page / silent failure / degraded performance}

### Business Impact
- **Revenue at risk:** {₹/$ estimate}
- **SLA breach:** Yes / No — {if yes, which SLA and by how much}
- **Customer communications sent:** Yes / No — {channel + time}
- **Regulatory reporting required:** Yes / No — {if yes, which regulation, deadline}

### Technical Impact
- **Services affected:** {List microservices / APIs}
- **Data loss:** Yes / No — {if yes, describe exactly what data, how much, recovery plan}
- **Data integrity:** Compromised / Intact
- **Security impact:** Yes / No — {if yes, was data exposed?}

---

## 4. Root Cause Analysis

### Immediate Cause
> What directly caused the incident?

*Example: Redis connection pool limit of 10 was not sufficient for 20 concurrent payment-service instances spun up by autoscaler after deployment.*

### Root Cause (5 Whys)

| Why | Answer |
|---|---|
| Why did the service fail? | Redis connection pool was exhausted |
| Why was the pool exhausted? | Autoscaler added 20 instances but pool limit was set to 10 |
| Why was the pool limit still 10? | The autoscaling config was updated but Redis config was not |
| Why were they not updated together? | No config coupling or pre-deploy checklist item for this dependency |
| Why was there no checklist item? | This dependency was introduced 3 weeks ago and checklist was not updated |

**Root Cause:** Missing checklist coverage for Redis connection limit when autoscaling config changes.

### Contributing Factors
- {Factor 1: e.g., No alerting on Redis connection pool saturation (we only alert on errors, not queue depth)}
- {Factor 2: e.g., Staging environment uses fixed 2 instances — doesn't expose autoscaling config gaps}
- {Factor 3: e.g., Deployment was done at peak traffic hour without load test validation}

---

## 5. What Went Well

> Genuinely identify things that worked. This reinforces good practices.

- {e.g., On-call engineer acknowledged alert within 4 minutes}
- {e.g., Rollback procedure was documented and executed cleanly in 8 minutes}
- {e.g., Error was contained to payment confirmation — no data corruption occurred}
- {e.g., War room communication was clear and decision-making was efficient}
- {e.g., All transactions are reconcilable — no financial data lost}

---

## 6. What Went Poorly

> Be specific and factual — not critical.

- {e.g., Alert threshold was set too high (5%) — 1,240 users failed before we knew}
- {e.g., No runbook existed for Redis connection pool issues — investigation took 20 min longer}
- {e.g., Staging environment did not replicate production autoscaling — gap not caught in testing}
- {e.g., Customer support was not notified until 45 minutes into the incident}

---

## 7. Action Items

> Every action item needs an owner, a due date, and should be tracked in JIRA/Linear.

| # | Action | Type | Owner | Due Date | Ticket |
|---|---|---|---|---|---|
| 1 | Add Redis connection limit to pre-deploy checklist | Process | {Name} | {Date} | ATS-{ID} |
| 2 | Add alert: Redis connection pool utilisation > 70% | Monitoring | {Name} | {Date} | ATS-{ID} |
| 3 | Update staging autoscaling to mirror production range | Infrastructure | {Name} | {Date} | ATS-{ID} |
| 4 | Write runbook: Redis connection pool exhaustion | Documentation | {Name} | {Date} | ATS-{ID} |
| 5 | Add load test at production autoscaling ceiling to pre-deploy | Process | {Name} | {Date} | ATS-{ID} |
| 6 | Notify CS team within 10 minutes for P1/P2 (add to incident playbook) | Process | {Name} | {Date} | ATS-{ID} |

**Action item types:** Prevent | Detect | Mitigate | Process | Documentation | Monitoring

---

## 8. Lessons Learned

> Distilled insights applicable beyond this specific incident.

1. **{Lesson title}:** {1–2 sentences}
   *Example: "Config dependencies must be grouped": When one config change implicitly depends on another, both must be updated together — or a check must prevent one without the other.*

2. **{Lesson title}:** {1–2 sentences}

3. **{Lesson title}:** {1–2 sentences}

---

## 9. Related Incidents

| Incident ID | Date | Similarity |
|---|---|---|
| INC-{date}-{N} | {date} | {brief description of relationship} |

---

## 10. Appendix

### Relevant Logs / Metrics
*Attach or link to: dashboards, log query results, APM traces, graphs.*

```
Log query: service:payment-service level:error start:2026-05-07T14:30:00Z end:2026-05-07T16:45:00Z
Dashboard: https://app.datadoghq.com/dashboard/...
Trace:     https://app.datadoghq.com/apm/trace/...
```

### Communication Log
| Time | Channel | Message Summary | Sent By |
|---|---|---|---|
| {HH:MM} | Slack #incidents | Incident declared: payment service errors | {Name} |
| {HH:MM} | Email (customers) | Service disruption notice | {Name} |
| {HH:MM} | Status page | Investigating payment confirmation delays | {Name} |
| {HH:MM} | Status page | Service restored | {Name} |

---

## Sign-off

| Role | Name | Date | Notes |
|---|---|---|---|
| Incident Owner | | | |
| Engineering Lead | | | |
| Product Manager | | | |
| Security (if data impacted) | | | |

**Published to:** `#postmortems` Slack channel | Internal wiki | {other}

---

*ATS Postmortem Template v2.13 | Store in: /docs/postmortems/INC-{YYYY-MM-DD}-{N}.md*

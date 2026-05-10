# Compliance Checklist
**ATS 4D Framework v2.13 | ANNAITECH SOLUTIONS**  
*Use alongside §6 of SKILL.md. Check all applicable frameworks at project start.*

---

## How to Use This Document

1. At **DEFINE** phase: identify which frameworks apply (§1.5 of SKILL.md)
2. At **DESIGN** phase: map requirements to architecture decisions
3. At **DEVELOP** phase: implement controls
4. At **DEBUG** phase: verify controls in this checklist before release
5. Ongoing: schedule reviews at indicated intervals

---

## GDPR — EU General Data Protection Regulation

**Applies when:** Any EU resident's personal data is processed, regardless of where your company is based.

### Legal Basis
```
□ Identify and document lawful basis for EACH type of data processing:
    □ Consent      — explicit, informed, granular, documented, withdrawable
    □ Contract     — necessary to deliver the service
    □ Legal Obligation — required by law (document which law)
    □ Legitimate Interest — document balancing test (LIA)
    □ Vital Interest   — emergency only
    □ Public Task      — public authority only
    
□ Processing Register (ROPA) maintained and up to date
□ Privacy Notice: plain language, accessible before collection
□ Consent record: timestamp, version, IP hash, withdrawal mechanism
```

### Data Subject Rights (Technical Implementation)
```
□ Right to Access (Art. 15)
    □ Endpoint or process to export all user data
    □ Response within 30 days
    □ Machine-readable format available
    
□ Right to Erasure / Right to Be Forgotten (Art. 17)
    □ Soft delete immediately on request
    □ Hard delete / anonymisation within 30 days (except legal hold)
    □ Cascade: verify all related data handled (comments, logs, orders)
    □ Notify downstream processors to delete
    □ Confirmation email to user with deletion summary
    
□ Right to Portability (Art. 20)
    □ Export in structured, machine-readable format (JSON / CSV)
    □ Available for data provided by user, not derived data
    
□ Right to Rectification (Art. 16)
    □ Self-service profile edit for own data
    □ Admin correction for data user cannot access
    
□ Right to Object (Art. 21)
    □ Opt-out mechanism for direct marketing
    □ Opt-out for profiling / automated decisions
    
□ Right to Restriction (Art. 18)
    □ Ability to pause processing while dispute is resolved
    □ Mark records as "processing restricted" in DB
```

### Technical Controls
```
□ Privacy by Design: most restrictive privacy setting is the default
□ Data Minimisation: collect only what's stated in privacy notice
□ Purpose Limitation: data used ONLY for stated purpose
□ Storage Limitation: automated retention/deletion job runs at defined intervals
□ DPA signed with all processors (AWS, Stripe, Mailgun, etc.)
□ Sub-processor list maintained and available on request
□ Data Transfer: adequacy decision or SCCs for non-EEA transfers
□ DPIA (Data Protection Impact Assessment) for high-risk processing
□ DPO appointed if required (public authority, large-scale systematic processing)
□ Breach notification workflow: detect → assess → notify DPA within 72h if >250 affected
□ Children's data: age verification for under-16 (member state may set lower)
```

**Review cadence:** Annual ROPA review | DPA review on each new vendor | Breach drill annually

---

## PCI-DSS v4.0 — Payment Card Industry Data Security Standard

**Applies when:** Your system processes, transmits, or stores payment card data.

### First: Reduce Scope
```
□ Use tokenisation: raw PAN never touches your server
□ Use hosted fields (Stripe Elements / Razorpay SDK)
    → Aim for SAQ A (simplest assessment)
□ If raw card data is in scope, engage a QSA immediately
```

### Requirement Checklist
```
Req 1 — Network Security
  □ Firewall rules: only necessary traffic to CDE
  □ CDE isolated from general business network
  □ No direct internet access to CDE servers
  □ Rules reviewed every 6 months

Req 2 — Secure Configurations
  □ No vendor-supplied default passwords changed on ALL systems
  □ Unnecessary services/ports disabled
  □ Configuration baseline documented and enforced

Req 3 — Cardholder Data Protection
  □ PAN never stored unless absolutely necessary
  □ If stored: encrypted AES-256, access logged, masked in display
  □ CVV: NEVER stored after authorisation — zero exceptions
  □ PAN retention policy: defined, automated deletion
  □ Inventory of all cardholder data storage locations

Req 4 — Data Transmission
  □ TLS 1.2+ for ALL transmission of cardholder data
  □ No fallback to SSL/TLS 1.0/1.1
  □ Certificate management: valid, auto-renewed
  □ PAN never transmitted in URLs or query strings

Req 6 — Vulnerability Management
  □ SAST scan on all code before production
  □ Penetration test: annual + after significant changes
  □ Critical patches: within 1 month
  □ OWASP Top 10 addressed in development process

Req 7 — Access Control
  □ Access to CHD limited to role-required basis
  □ Access control system: deny-all by default
  □ Access rights reviewed quarterly

Req 8 — Authentication
  □ Unique IDs for all users — no shared accounts in CDE
  □ MFA for all admin access to CDE
  □ Password policy: min 12 chars, change every 90 days
  □ Idle session timeout: 15 minutes

Req 10 — Audit Logs
  □ Logs for all access to CHD (read, write, delete)
  □ Logs for all admin actions in CDE
  □ Log integrity: cannot be deleted or modified
  □ Retention: 12 months (3 months immediately available)
  □ Log review: automated alerting on anomalies

Req 11 — Security Testing
  □ Quarterly vulnerability scans (ASV-approved)
  □ Annual penetration test (internal + external)
  □ File integrity monitoring on CDE systems
  □ Intrusion detection on CDE network

Req 12 — Policy
  □ Security policy documented and approved annually
  □ Incident response plan: documented and tested annually
  □ Security awareness training: annual for all staff
```

**Zero tolerance items (automatic failure):**
- CVV stored after auth
- PAN in logs
- Unencrypted PAN in DB
- Shared user accounts in CDE

---

## HIPAA — Health Insurance Portability and Accountability Act (US)

**Applies when:** Protected Health Information (PHI) of US patients is involved.

### PHI Identification
```
PHI = health information + any of 18 identifiers:
  Names, dates (DOB, admission, discharge), geographic data,
  phone, fax, email, SSN, medical record numbers, health plan IDs,
  account numbers, certificate/license numbers, VINs, device IDs,
  URLs, IPs, biometric IDs, photos, any other unique ID
  
□ PHI inventory: all locations PHI is stored, processed, transmitted
□ Data flow diagram: document how PHI moves through system
□ De-identification: 18 identifiers removed + expert certification
```

### Technical Safeguards
```
Access Control (§164.312(a))
  □ Unique user ID for every person with PHI access
  □ Automatic logoff: idle session terminated (≤15 min for clinical)
  □ Encryption/decryption mechanism for PHI at rest
  □ Emergency access procedure documented

Audit Controls (§164.312(b))
  □ Audit log on ALL PHI access: read, write, update, delete
  □ Log includes: user, timestamp, action, resource accessed
  □ Log retention: minimum 6 years
  □ Log review process: anomaly detection and regular review

Integrity Controls (§164.312(c))
  □ Mechanism to verify PHI not altered/destroyed without authorisation
  □ Checksums or hash verification on stored PHI
  □ Version history for modified PHI records

Transmission Security (§164.312(e))
  □ TLS 1.2+ for ALL PHI in transit — no exceptions
  □ No PHI in email without encryption
  □ No PHI in URL parameters or query strings
  □ Verify recipient identity before transmitting PHI
```

### Operational Safeguards
```
Business Associates
  □ BAA signed with EVERY vendor who touches PHI:
      AWS, Google Cloud, Azure, Stripe, Twilio, email providers...
  □ Sub-BAA chain: vendor's vendors also signed if PHI touches them
  □ BAA list maintained and reviewed annually

Breach Notification
  □ Breach detection process in place
  □ < 500 individuals: notify HHS within 60 days of year-end
  □ ≥ 500 individuals: notify HHS AND individuals AND media within 60 days
  □ Notification content: defined by HIPAA (what was exposed, how, mitigation)
  □ Breach log maintained

Training
  □ Annual HIPAA training: all staff who access PHI
  □ Training records maintained
  □ Sanctions policy: enforced for violations

Risk Analysis
  □ Comprehensive risk analysis: documented
  □ Risk management plan: implemented
  □ Review: annual + after significant environment change
```

---

## SOC 2 Type II

**Applies when:** B2B SaaS with enterprise customers, or processing sensitive customer data.

### Security (CC) — Mandatory
```
CC1 — Control Environment
  □ Security policy documented, approved by leadership
  □ Roles and responsibilities defined (who owns security)
  □ Code of conduct / acceptable use policy

CC2 — Communication
  □ Security responsibilities communicated to staff
  □ External communication: privacy notice, terms, security page

CC3 — Risk Assessment
  □ Annual risk assessment documented
  □ Threats and vulnerabilities identified and rated
  □ Risk treatment decisions documented

CC4 — Monitoring Activities
  □ Security monitoring: SIEM / log aggregation
  □ Vulnerability scanning: continuous or quarterly
  □ Penetration testing: annual

CC5 — Change Management
  □ All changes via PR (no direct production pushes)
  □ PR reviewed before merge
  □ Test environment required before production
  □ Change log maintained

CC6 — Logical Access
  □ Access provisioning process: documented and followed
  □ Quarterly access reviews: all system and data access
  □ MFA required for all production system access
  □ Offboarding: access revoked within 24h of departure
  □ Privileged access: limited, monitored, reviewed

CC7 — System Operations
  □ Incident detection: monitoring + alerting
  □ Incident response plan: documented and tested
  □ Backup and recovery: tested quarterly

CC8 — Change Management (same as CC5)

CC9 — Risk Mitigation
  □ Vendor risk assessment: for all third parties with data access
  □ Contracts: security requirements in vendor agreements
```

### Availability (A) — If Committed
```
□ Uptime monitoring: public status page (status.{domain}.com)
□ SLA documented and tracked
□ Incident response: classification, escalation, resolution times
□ BCP/DR plan: documented and tested annually
□ Backup: tested restoration quarterly
□ Capacity monitoring: forecast before hitting limits
```

### Evidence Collection (for Audit)
```
Maintain evidence for EVERY control:
  Access reviews:        screenshots of quarterly reviews with dates
  Change management:     PR history with approvals
  Training:              completion records with dates
  Incident response:     incident tickets with timelines
  Vendor assessments:    completed questionnaires or SOC 2 reports
  Pen test results:      report + remediation evidence
  Monitoring:            dashboard screenshots or reports
  Backup tests:          restoration test results with dates
```

**Review cadence:** Annual Type II audit (12-month observation period)

---

## ISO 27001:2022

**Applies when:** Enterprise security certification required.

### Key Implementation Steps
```
□ Scope: define ISMS boundaries (systems, processes, locations)
□ Information Security Policy: documented, approved, communicated
□ Risk Assessment: all assets identified, risks assessed, treatment decided
□ Statement of Applicability (SoA): all Annex A controls with include/exclude reason
□ Risk Treatment Plan: documented with owners and timelines

Annex A Key Controls (selected)
  A.5  Policies: security policy reviewed annually
  A.6  Organisation: roles defined; segregation of duties enforced
  A.7  HR: background checks; security in employment contracts; offboarding process
  A.8  Asset Management: asset inventory; classification; handling rules
  A.9  Access Control: access control policy; privileged access managed; MFA
  A.10 Cryptography: policy on acceptable algorithms and key lengths
  A.11 Physical: secure areas; clear desk/screen policy
  A.12 Operations: change management; malware protection; logging; backup
  A.13 Network: network segmentation; secure transfer; web filtering
  A.14 System Dev: security in SDLC; secure coding; change control
  A.15 Suppliers: supplier security policy; agreements; monitoring
  A.16 Incidents: reporting; response; learning from incidents
  A.17 Business Continuity: BCP and DR planning and testing
  A.18 Compliance: legal requirements identified; technical compliance reviews

Internal Audit
  □ Annual internal audit of ISMS
  □ Management review: annual (risk, incidents, KPIs)
  □ Certification audit: every 3 years (surveillance annually)
```

---

## India DPDP Act 2023

**Applies when:** Personal data of Indian citizens is processed digitally.

```
Consent Requirements
  □ Consent Notice: written in clear, plain language
  □ Consent Notice must state: what data, why collected, who it's shared with, rights
  □ Consent mechanism: affirmative (no pre-ticked boxes)
  □ Granular consent: separate consent for separate purposes
  □ Withdrawable: as easy to withdraw as to give
  □ Consent record: stored with timestamp, version, user ID

Data Principal Rights (technical implementation)
  □ Right to Access: API/portal to retrieve all personal data — within 72 hours
  □ Right to Correction: mechanism to correct inaccurate data
  □ Right to Erasure: delete personal data on request; confirm via email
  □ Right to Grievance: grievance officer appointed; 7-day acknowledgement; 30-day resolution
  □ Grievance mechanism: visible in app and website

Data Fiduciary Obligations
  □ Purpose Limitation: data used only for stated purpose
  □ Data Minimisation: collect only what's necessary
  □ Storage Limitation: retention policy defined; automated deletion enforced
  □ Data localisation: significant data fiduciaries — critical data in India
  □ Consent Manager registration (when notified by government)
  □ Cross-border transfer: only to notified countries

Children's Data (under 18)
  □ Verifiable parental consent required
  □ No behavioural tracking of children
  □ No targeted advertising to children

Breach Notification
  □ Notify Data Protection Board within 72 hours of breach
  □ Notify affected users promptly
  □ Breach log maintained

Penalties (context for prioritisation)
  □ Failure to take security safeguards: up to ₹250 Crore
  □ Failure to notify breach: up to ₹200 Crore
  □ Breach of child data provisions: up to ₹200 Crore
```

---

## RBI / NPCI — India Payment System Guidelines

**Applies when:** Any payment processing, UPI, prepaid instruments, or digital lending in India.

```
Authentication Standards
  □ Two-factor authentication for all transactions
  □ UPI: device binding + UPI PIN (second factor)
  □ Card: 3D Secure 2.0 for card transactions
  □ No SMS OTP as sole factor for high-value transactions

Transaction Security
  □ Transaction limits: enforce NPCI-defined limits
      UPI P2P: ₹1 Lakh per transaction
      UPI P2M: ₹2 Lakh per transaction (merchant)
  □ Device fingerprinting and binding
  □ Replay attack prevention: transaction ID unique + TTL
  □ Idempotency: same idempotency key → same response (safe retry)

Fraud Detection
  □ Real-time anomaly detection on transactions
  □ Velocity check: transactions per user per hour/day
  □ Suspicious pattern detection: unusual geography, device, time
  □ Customer alert: SMS/email on every transaction
  □ Dispute resolution: process defined and < 5 days for chargeback

Data & Audit
  □ Transaction audit trail: complete, tamper-proof, 8 years minimum
  □ Reconciliation: daily settlement reconciliation with NPCI/acquiring bank
  □ No PAN or CVV in logs — ever
  □ Masked display: card last 4 digits only in UI

Biometric Payments (additional — relevant to palm vein / AadhaarPay)
  □ FIDO2 or vendor-certified biometric standard
  □ Liveness detection: mandatory to prevent spoofing
  □ Template: stored in certified hardware (not cloud) if biometric used
  □ Fallback: PIN/OTP always available as alternative
  □ Offline capability: graceful degradation if connectivity lost
  □ UIDAI compliance if Aadhaar-linked biometric

Incident Reporting
  □ Significant security incident: report to NPCI within 6 hours
  □ Customer data breach: report to RBI within 6 hours
  □ Fraud exceeding threshold: automatic escalation to NPCI fraud team

Business Continuity
  □ Payment service uptime SLA: ≥ 99.5%
  □ DR: recovery within 4 hours for critical payment services
  □ DR test: conducted and reported to RBI annually
```

---

## WCAG 2.2 AA — Web Content Accessibility Guidelines

**Applies when:** Any public-facing web or mobile product (mandatory for government clients, advisable for all).

### Automated Checks (CI — must pass before merge)
```
□ axe-core: zero violations on all pages
□ Lighthouse accessibility score ≥ 90
□ HTML validator: no critical errors
□ Colour contrast: automated check on design tokens
```

### Manual Test Checklist
```
Perceivable
  □ 1.1.1 Alt text: every image has meaningful alt (decorative → alt="")
  □ 1.2.1 Audio/video: transcripts or captions available
  □ 1.3.1 Semantic HTML: headings in order (h1→h2→h3), lists as <ul>/<ol>
  □ 1.3.2 Meaningful sequence: reading order makes sense without CSS
  □ 1.4.1 Colour: information not conveyed by colour alone (also shape/text)
  □ 1.4.3 Contrast: text 4.5:1 minimum; large text 3:1 minimum
  □ 1.4.4 Resize: text can be zoomed to 200% without loss of functionality
  □ 1.4.5 Images of text: avoid (use actual text)
  □ 1.4.10 Reflow: no horizontal scroll at 320px wide
  □ 1.4.11 Non-text contrast: UI components 3:1 against background
  □ 1.4.12 Text spacing: no loss of content when spacing increased
  □ 1.4.13 Content on hover/focus: dismissible, hoverable, persistent

Operable
  □ 2.1.1 Keyboard: all functionality usable by keyboard alone
  □ 2.1.2 No keyboard trap: can navigate away from any component
  □ 2.4.1 Skip links: "Skip to main content" is first focusable element
  □ 2.4.2 Page titled: <title> is descriptive and unique per page
  □ 2.4.3 Focus order: Tab sequence is logical and meaningful
  □ 2.4.4 Link purpose: link text describes destination (not "click here")
  □ 2.4.7 Focus visible: visible focus indicator on all interactive elements
  □ 2.4.11 Focus not obscured: focused element not hidden by sticky headers
  □ 2.5.3 Label in name: accessible name contains visible label text
  □ 2.5.7 Dragging: all drag functions have single-pointer alternative
  □ 2.5.8 Target size: min 24×24 CSS pixels for interactive targets

Understandable
  □ 3.1.1 Language: <html lang="en"> (or correct language code)
  □ 3.2.1 On focus: no unexpected context change on focus
  □ 3.2.2 On input: no unexpected context change on input (warn before submit)
  □ 3.3.1 Error identification: errors described in text, not colour only
  □ 3.3.2 Labels: every form field has visible label
  □ 3.3.3 Error suggestion: explain how to fix the error
  □ 3.3.7 Redundant entry: don't ask same info twice in one session
  □ 3.3.8 Accessible auth: no cognitive test without alternative

Robust
  □ 4.1.1 Valid HTML: no duplicate IDs, proper nesting, required attributes
  □ 4.1.2 Name/Role/Value: all UI components have ARIA roles/states/properties
  □ 4.1.3 Status messages: announced to AT without receiving focus

Screen Reader Test (manual)
  □ VoiceOver on Safari (Mac/iOS): test key user journeys
  □ NVDA on Chrome (Windows): test key user journeys
  □ TalkBack on Chrome (Android): test mobile journeys
  
Focus Management
  □ Modal opens: focus moves to modal
  □ Modal closes: focus returns to trigger element
  □ Page navigation: focus moves to top or main heading
  □ Dynamically added content: announced to screen reader (aria-live or focus move)
```

**Review cadence:** Full manual audit: every 6 months | Automated: every PR

---

## Compliance Review Schedule

| Framework | Initial Audit | Ongoing Review | Evidence Collection |
|---|---|---|---|
| GDPR | Before EU launch | Annual ROPA review; breach drill | Continuous |
| PCI-DSS | Before card processing | Annual QSA assessment; quarterly ASV scan | Continuous |
| HIPAA | Before PHI handling | Annual risk analysis; annual training | Continuous |
| SOC 2 | 12-month observation | Annual Type II audit | Continuous |
| ISO 27001 | 3-month prep + audit | Annual surveillance; triennial recertification | Continuous |
| DPDP | Before India launch | Review on regulation update | Continuous |
| RBI/NPCI | Before payment go-live | Annual DR test | Per transaction |
| WCAG 2.2 | Before public launch | Every 6 months (manual) | Per PR (automated) |

---

*ATS Compliance Checklist v2.13 | Companion to SKILL.md §06*  
*ANNAITECH SOLUTIONS | Chennai | annaitech.com*  
*Note: This document does not constitute legal advice. Engage a qualified compliance consultant for formal assessments.*

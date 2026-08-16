# BILLFLOW PRO — COMPLETE PRODUCTION LAUNCH EXECUTION PLAN
**Engineering Leadership Report · June 2026 · CONFIDENTIAL**
**Target: 1,000 Paying Indian SMB Customers**

---

## EXECUTIVE SUMMARY — FINAL VERDICT

> ## ❌ NO — BILLFLOW IS NOT READY FOR PRODUCTION

Ozofi Books has a strong frontend and a promising architecture, but contains **critical backend defects that guarantee financial data corruption under real usage**. Three core financial engines — payment allocation, inventory stock deduction, and GST ledger posting — were built as standalone services but are **completely disconnected from the API routes**. Every invoice a real customer creates today bypasses stock deduction, creates no GST ledger entry, and performs no payment allocation.

The entire security middleware stack (helmet, CORS, rate limiting) lives in `server-PRODUCTION.js` — a file that **is never run**. The app runs `server.js`, which has none of it. Input validation (Zod) is fully written but never imported in any route. The Bull queue for recurring billing is installed but has **zero worker files**.

**Timeline to fix: 6 weeks. The architecture is correct. The integration is missing.**

---

## SCORE SUMMARY

| Dimension | Score | Verdict |
|-----------|-------|---------|
| **Production Readiness** | **18 / 100** | Critical disconnection in core financial services. Not deployable. |
| **Financial Accuracy** | **22 / 100** | Invoices do not deduct stock. Payments not allocated. Customer balances never updated. |
| **GST Compliance** | **35 / 100** | GST service correct but never called. gst_ledger always empty. GSTR-3B has a query bug. |
| **Security** | **45 / 100** | Full security stack written but server.js (the running app) applies none of it. |
| **Scalability** | **40 / 100** | Good schema and indexes. Pool too small (max 10). No pagination. No cache. No MV refresh. |
| **Investor Readiness** | **30 / 100** | Strong vision. Zero tests, no monitoring, no CI/CD, not deployable. |
| **OVERALL** | **25 / 100** | NOT PRODUCTION READY. 6-week remediation plan below. |

---

## PHASE 1 — GAP ANALYSIS

### 1.1 Already Completed ✅

- PostgreSQL schema: DECIMAL(14,2) money types, UUIDs, foreign keys, soft deletes across all tables
- Migrations 001–005: relational hardening, payment allocation tables, GST columns, performance indexes, stock_movements table
- Materialized views: `mv_daily_revenue`, `mv_customer_aging` — strong reporting foundation when refreshed
- `gstCalculationService.js` — complete CGST/SGST/IGST logic, place of supply, GSTR-1, GSTR-3B, ITC tracking
- `paymentAllocationService.js` — full allocation engine with partial payments, overpayment guard, unapplied balance handling, reversal
- `inventoryTransactionService.js` — FIFO-ready, atomic stock deduction with FOR UPDATE row locks
- `validators.js` (Zod) — auth, org, customer, invoice schemas all defined and correct
- `security.js` — helmet, CORS whitelist, rate limiters, sanitizeRequest, cookie config, audit logger all correct
- `rateLimiter.js` — login (5/15min), register (3/hr), API (100/15min), sensitive ops (10/min), reports (5/5min)
- `auditLog.js` — CREATE/UPDATE/DELETE capture with old_values/new_values JSONB
- Full frontend: invoices, customers, vendors, products, AP/AR, recurring, reports, GST center, banking UI
- AP module: invoices, credit memos, down payments, reserve invoices, goods returns
- Quotations → Invoice conversion flow, Credit notes, Warranty claims
- JWT + httpOnly cookie auth with bcrypt(12) password hashing
- RBAC: owner / admin / user role hierarchy in `requireOwner` and `requireAdmin`
- `server-PRODUCTION.js` — hardened server with all middleware correctly assembled

---

### 1.2 Partially Completed — Critical Disconnections 🔴

| Priority | Issue | Risk | Effort |
|----------|-------|------|--------|
| **P0** | `paymentAllocationService` created but **NOT imported** in payments route — bare `stmts.insertPayment` used (no allocation, no outstanding recalc) | Financial data corruption | 2h |
| **P0** | `inventoryTransactionService` created but **NOT called** in invoices route — stock never deducted on invoice creation | Inventory corruption | 4h |
| **P0** | `gstCalculationService` created but **NOT called anywhere** — gst_ledger always empty, GSTR-1/3B returns zeros | GST non-compliance | 2h |
| **P0** | `validators.js` (Zod) exists but **no route imports or calls it** — all API inputs arrive unvalidated | Data integrity / injection | 4h |
| **P0** | `server-PRODUCTION.js` has all security middleware but `server.js` (the running app) has **NONE** — no helmet, no CORS, no rate limiting | Security exposure | 30min |
| **P0** | `JWT_SECRET` has insecure hardcoded fallback in `auth.js` | Token forgery | 10min |
| **P1** | Invoice UPDATE does DELETE + full reinsert with no stock reconciliation — double deductions on every edit | Inventory corruption | 4h |
| **P1** | Recurring invoice route stores templates but has zero scheduler/worker — templates never execute | Feature entirely dead | 1d |
| **P1** | GSTR-3B query bug: `igst_outward` uses `cgst` column for `gst_type='igst'` — always returns zero for IGST | Wrong tax liability | 1h |
| **P1** | Materialized views created but never refreshed — go stale immediately | Stale dashboard/aging | 2h |
| **P2** | Procurement analysis page uses mock data (`mockProducts.js`/`mockTrends.js`) — not real DB queries | Feature non-functional | 1d |
| **P2** | Connection pool max: 10 — insufficient for 100+ concurrent organisations | Timeouts at scale | 30min |
| **P2** | No pagination on any list endpoint — full table returned to client | Performance degradation | 4h |

---

### 1.3 Missing Completely 🚫

| Priority | Missing Module | Risk | Effort |
|----------|---------------|------|--------|
| **P0** | No Chart of Accounts / Journal Entries / General Ledger — Balance Sheet is raw aggregation, not double-entry | Incorrect financials | 5d |
| **P0** | No banking backend routes — all 10 banking frontend pages have no API | Feature entirely broken | 3d |
| **P0** | Zero automated tests — test scripts in package.json are echo statements | No correctness guarantee | 2w |
| **P0** | No payment gateway integration — Razorpay not installed, no webhook handler | Cannot collect money online | 3d |
| **P0** | No Bull worker process files — bull installed but zero queue/worker/scheduler files | Recurring billing dead | 2d |
| **P1** | No Sentry / structured logging — console.log only in all routes | Blind in production | 1d |
| **P1** | No health check endpoint — no /health or /health/db route | Load balancer cannot route | 2h |
| **P1** | No GSTIN check digit validation | Invalid GST data | 4h |
| **P1** | No reverse charge (RCM), export supply, or exempt supply handling | GST edge case non-compliance | 2d |
| **P1** | No ITC claim workflow — `itc_ledger` table exists but no route to claim/offset | ITC lost for customers | 1d |
| **P1** | No e-invoice (IRN) integration — mandatory for B2B invoices > ₹5 crore since FY2024 | Legal non-compliance | 3d |
| **P1** | No CI/CD pipeline | Manual deployment risk | 2d |
| **P1** | No database backup / PITR configuration | Data loss risk | 1d |
| **P2** | No server-side PDF generation for invoices | Cannot email invoices | 1d |
| **P2** | No email delivery configuration | Core UX broken | 1d |
| **P2** | No TDS deduction engine — TDSPage.jsx exists in frontend, zero backend routes | Compliance gap | 2d |

---

## PHASE 2 — FINANCIAL ACCURACY CERTIFICATION

### 2.1 Can Balances Become Incorrect?
**YES — GUARANTEED.** The payments route calls `stmts.insertPayment` (a bare INSERT). It never calls `paymentAllocationService.createPaymentWithAllocation`. The invoice `paid_amount` is never updated. A customer who pays ₹1,00,000 against an invoice will show that invoice as UNPAID forever.

**Fix — `backend/routes/payments.js`:**
```javascript
// REPLACE stmts.insertPayment.run(...) WITH:
const PaymentSvc = require('../services/paymentAllocationService');
const result = await PaymentSvc.createPaymentWithAllocation(
  req.orgId, customerId, amount, date, method, allocationDetails
);
sendSuccess(res, result);
```

### 2.2 Can Inventory Become Incorrect?
**YES — GUARANTEED.** The invoices POST route calls `stmts.insertInvoice` then `stmts.insertInvoiceItem`. It never calls `inventoryTransactionService`. Stock quantities remain unchanged after every sale.

**Fix — `backend/routes/invoices.js` POST handler:**
```javascript
// REPLACE all stmts.insertInvoice/insertInvoiceItem calls WITH:
const InvSvc = require('../services/inventoryTransactionService');
const result = await InvSvc.createInvoiceWithStockDeduction(req.orgId, invoiceData, items);
sendSuccess(res, { id: result.invoiceId });
```

**Also:** The PUT /:id handler deletes and reinserts all items with no stock delta. Fix: compute old vs new quantity difference and apply the DELTA atomically.

### 2.3 Can GST Become Incorrect?
**YES — STRUCTURALLY.** `gstCalculationService` is correct but never called. `gst_ledger` is always empty. GSTR-1 always returns an empty list. GSTR-3B has a confirmed query bug:

```sql
-- WRONG (current): reads cgst column for IGST invoices
SUM(CASE WHEN gst_type='igst' THEN cgst ELSE 0 END) as igst_outward

-- CORRECT (fix):
SUM(CASE WHEN gst_type='igst'  THEN igst ELSE 0 END) as igst_outward,
SUM(CASE WHEN gst_type='intra' THEN cgst ELSE 0 END) as cgst_outward,
SUM(CASE WHEN gst_type='intra' THEN sgst ELSE 0 END) as sgst_outward
```

### 2.4 Can Reports Become Incorrect?
**YES.** The Balance Sheet is raw SQL aggregation without a General Ledger. `mv_daily_revenue` and `mv_customer_aging` have no refresh schedule — they are permanently stale from creation.

---

## PHASE 3 — ACCOUNTING ENGINE

Ozofi Books needs a double-entry General Ledger. Without it, the Balance Sheet cannot balance, Trial Balance cannot be generated, and Period-Close is not possible.

### Migration 006 — Required Schema
```sql
BEGIN;

CREATE TABLE chart_of_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id),
  code       VARCHAR(20) NOT NULL,
  name       VARCHAR(200) NOT NULL,
  type       VARCHAR(30) NOT NULL,  -- asset|liability|equity|revenue|expense
  sub_type   VARCHAR(50),
  parent_id  UUID REFERENCES chart_of_accounts(id),
  is_system  BOOLEAN DEFAULT FALSE,
  is_active  BOOLEAN DEFAULT TRUE,
  UNIQUE(org_id, code)
);

CREATE TABLE journal_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  entry_date  DATE NOT NULL,
  reference   VARCHAR(100),        -- INV-001, PMT-001, etc.
  source_type VARCHAR(50) NOT NULL, -- invoice|payment|expense|credit_note
  source_id   UUID,
  narration   TEXT,
  is_posted   BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE journal_lines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id   UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit      DECIMAL(14,2) DEFAULT 0 CHECK (debit >= 0),
  credit     DECIMAL(14,2) DEFAULT 0 CHECK (credit >= 0),
  CHECK (debit = 0 OR credit = 0),
  CHECK (debit + credit > 0)
);

CREATE TABLE fiscal_periods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id),
  name       VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  is_closed  BOOLEAN DEFAULT FALSE,
  UNIQUE(org_id, start_date)
);

CREATE INDEX idx_je_org_date ON journal_entries(org_id, entry_date DESC);
CREATE INDEX idx_je_source   ON journal_entries(source_type, source_id);
CREATE INDEX idx_jl_account  ON journal_lines(account_id);

COMMIT;
```

### Default Chart of Accounts (India)
| Code | Account | Type | System? |
|------|---------|------|---------|
| 1000 | Bank / Cash | Asset (Current) | Yes |
| 1100 | Accounts Receivable | Asset (Current) | Yes |
| 1200 | Inventory | Asset (Current) | Yes |
| 1300–1320 | Input Tax Credit (CGST/SGST/IGST) | Asset (Current) | Yes |
| 2000 | Accounts Payable | Liability | Yes |
| 2100–2120 | GST Payable (CGST/SGST/IGST) | Liability | Yes |
| 3000 | Owner Equity | Equity | Yes |
| 4000 | Sales Revenue | Revenue | Yes |
| 5000 | Cost of Goods Sold | Expense | Yes |
| 6000 | Operating Expenses | Expense | Yes |

### Journal Posting Rules
| Transaction | Debit | Credit |
|-------------|-------|--------|
| Invoice (Sale) | Accounts Receivable (1100) | Sales Revenue (4000) + GST Payable (2100/2110/2120) |
| Payment Received | Bank / Cash (1000) | Accounts Receivable (1100) |
| Credit Note | Sales Revenue (4000) | Accounts Receivable (1100) |
| Vendor Bill | Expenses + ITC (1300/1310/1320) | Accounts Payable (2000) |
| Vendor Payment | Accounts Payable (2000) | Bank / Cash (1000) |
| Stock Purchase | Inventory (1200) | Accounts Payable (2000) |

Each service must call `postJournalEntry()` **inside its existing transaction block** — always atomic with the operational insert.

---

## PHASE 4 — GST COMPLIANCE

| GST Feature | Status | Gap |
|-------------|--------|-----|
| CGST / SGST split | ✅ Implemented | Not wired to routes |
| IGST inter-state | ✅ Implemented | Not wired to routes |
| Place of Supply | ✅ Implemented | `getPlaceOfSupply()` exists but not called |
| HSN codes | ⚠️ Partial | Column exists — SAC for services missing |
| GSTR-1 generation | ⚠️ Partial | Built — gst_ledger empty so returns zeros |
| GSTR-3B generation | ❌ BUG | `igst_outward` reads wrong column (see Phase 2) |
| Input Tax Credit | ⚠️ Partial | `trackInputTaxCredit()` built — no claim route |
| Reverse Charge (RCM) | ❌ Missing | No flag, no posting logic |
| Export / Zero-rated | ❌ Missing | No `is_export` flag, no LUT tracking |
| Exempt supplies | ❌ Missing | No `is_exempt` flag on line items |
| e-Invoice (IRN) | ❌ Missing | Mandatory for B2B > ₹5cr since FY2024 |
| GSTIN validation | ⚠️ Partial | Regex in validators — not enforced in routes |

### Migration 007 — Missing GST Fields
```sql
ALTER TABLE invoices       ADD COLUMN IF NOT EXISTS is_export   BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices       ADD COLUMN IF NOT EXISTS lut_number  VARCHAR(50);
ALTER TABLE invoices       ADD COLUMN IF NOT EXISTS is_rcm      BOOLEAN DEFAULT FALSE;
ALTER TABLE invoice_items  ADD COLUMN IF NOT EXISTS is_exempt   BOOLEAN DEFAULT FALSE;
ALTER TABLE invoice_items  ADD COLUMN IF NOT EXISTS sac_code    VARCHAR(10);
ALTER TABLE invoice_items  ADD COLUMN IF NOT EXISTS supply_type VARCHAR(20) DEFAULT 'taxable';
-- supply_type: taxable | exempt | zero_rated | nil_rated | non_gst
```

---

## PHASE 5 — SECURITY HARDENING

**CRITICAL:** The running server (`server.js`) applies **no security headers, no CORS, no rate limiting**. `server-PRODUCTION.js` has all of it but is never started.

### P0 — Fix Immediately

| # | Fix | Risk | Time |
|---|-----|------|------|
| 1 | Merge `server-PRODUCTION.js` middleware into `server.js` (or replace it) | Full security exposure | 30min |
| 2 | Remove JWT_SECRET hardcoded fallback: `const JWT_SECRET = process.env.JWT_SECRET` — throw if missing | Token forgery | 10min |
| 3 | Apply Zod `validate(schema)` middleware to all routes | SQL injection / data corruption | 4h |
| 4 | Validate `COOKIE_SECRET` at startup — throw if default value in production | Cookie tampering | 10min |

### P1 — Before Launch

- Audit all DELETE/PUT routes for `org_id` scoping (cross-tenant data access risk)
- Implement HTTPS redirect in production
- Short-lived JWT (15min) + refresh token rotation — current 7-day JWT cannot be invalidated
- Add ORDER BY whitelist in `sqlBuilder.js` (SQL injection via sort param)

### P2 — Post-Launch

- 2FA (TOTP) for owner/admin accounts
- Field-level encryption for PAN, GSTIN, bank account numbers at rest
- File upload MIME validation + size limits for warranty claim proofs

---

## PHASE 6 — DATABASE HARDENING

### Migration 008 — Constraints & Triggers
```sql
BEGIN;

-- Prevent negative inventory at DB level
ALTER TABLE products ADD CONSTRAINT chk_stock_non_negative CHECK (stock_qty >= 0);

-- Prevent overpayment at DB level
ALTER TABLE invoices ADD CONSTRAINT chk_paid_not_exceed_total
  CHECK (COALESCE(paid_amount, 0) <= total);

-- Journal balance trigger (debit must equal credit)
CREATE OR REPLACE FUNCTION check_journal_balance() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT ABS(SUM(debit) - SUM(credit)) FROM journal_lines WHERE entry_id = NEW.entry_id) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry % is not balanced', NEW.entry_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_journal_balance
  AFTER INSERT OR UPDATE ON journal_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_journal_balance();

-- Prevent posting to closed fiscal periods
CREATE OR REPLACE FUNCTION prevent_closed_period_entry() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM fiscal_periods WHERE org_id = NEW.org_id
             AND is_closed = TRUE AND NEW.entry_date BETWEEN start_date AND end_date) THEN
    RAISE EXCEPTION 'Cannot post to a closed fiscal period';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_closed_period
  BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_entry();

-- Materialized view refresh (requires pg_cron extension on Supabase/RDS)
SELECT cron.schedule('mv-refresh', '*/5 9-20 * * 1-6',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_aging;$$);

COMMIT;
```

---

## PHASE 7 — PERFORMANCE & SCALABILITY

| Scale | Current State | With Fixes | Required Changes |
|-------|--------------|------------|-----------------|
| 100 orgs | Likely works | OK | Pagination + pool fix |
| 1,000 orgs | Timeouts / crashes | OK | Pool=25, Redis cache, read replica |
| 10,000 orgs | Total failure | Achievable | PgBouncer, horizontal scaling, CDN |

### Immediate Code Changes

```javascript
// 1. Increase pool — backend/db/conn.js
const pool = new Pool({
  max: 25,                       // was 10
  connectionTimeoutMillis: 5000, // was 30000 — fail fast
});

// 2. Pagination on all list routes
const page   = Math.max(1, parseInt(req.query.page)  || 1);
const limit  = Math.min(100, parseInt(req.query.limit) || 50);
const offset = (page - 1) * limit;
// SELECT ... LIMIT $2 OFFSET $3
// Return: { data: rows, total, page, limit }

// 3. Redis cache for dashboard (install: npm install ioredis)
const redis = new Redis(process.env.REDIS_URL);
router.get('/summary', requireAuth, async (req, res) => {
  const cached = await redis.get(`summary:${req.orgId}`);
  if (cached) return sendSuccess(res, JSON.parse(cached));
  const data = await buildSummary(req.orgId);
  await redis.setex(`summary:${req.orgId}`, 300, JSON.stringify(data)); // 5min TTL
  sendSuccess(res, data);
});
```

---

## PHASE 8 — BANKING & RECONCILIATION

**Status: ENTIRELY MISSING.** Ten banking frontend pages exist with zero backend routes.

### Migration 009 — Required Schema
```sql
CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  account_name    VARCHAR(200) NOT NULL,
  account_number  VARCHAR(50),
  bank_name       VARCHAR(200),
  ifsc_code       VARCHAR(20),
  account_type    VARCHAR(30) DEFAULT 'current',
  currency        VARCHAR(10) DEFAULT 'INR',
  opening_balance DECIMAL(14,2) DEFAULT 0,
  current_balance DECIMAL(14,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bank_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id),
  bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id),
  transaction_date DATE NOT NULL,
  description      TEXT,
  debit            DECIMAL(14,2) DEFAULT 0,
  credit           DECIMAL(14,2) DEFAULT 0,
  balance          DECIMAL(14,2),
  reference        VARCHAR(200),
  reconciled       BOOLEAN DEFAULT FALSE,
  matched_to_type  VARCHAR(50),
  matched_to_id    UUID,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bank_reconciliations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  bank_account_id   UUID NOT NULL REFERENCES bank_accounts(id),
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  statement_balance DECIMAL(14,2) NOT NULL,
  book_balance      DECIMAL(14,2) NOT NULL,
  difference        DECIMAL(14,2) GENERATED ALWAYS AS (statement_balance - book_balance) STORED,
  status            VARCHAR(20) DEFAULT 'open',
  closed_at         TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### Required Routes (`backend/routes/banking.js`)
- `GET  /api/banking/accounts` — list bank accounts
- `POST /api/banking/accounts` — create bank account
- `GET  /api/banking/accounts/:id/transactions` — paginated transactions
- `POST /api/banking/accounts/:id/import` — CSV/OFX statement import
- `POST /api/banking/transactions/:id/match` — match to invoice/bill/expense
- `GET  /api/banking/reconciliation` — open reconciliation
- `POST /api/banking/reconciliation/close` — close period
- `GET  /api/banking/cash-forecast` — 30/60/90 day projection from open AR/AP

---

## PHASE 9 — RECURRING BILLING (BULL WORKER ARCHITECTURE)

**Status: DEAD.** Bull installed. Zero worker files. Every recurring invoice template will sit in the DB forever.

```javascript
// backend/workers/queues.js
const Bull = require('bull');
const R = process.env.REDIS_URL || 'redis://localhost:6379';
module.exports = {
  recurringQueue: new Bull('recurring-invoices', R),
  emailQueue:     new Bull('email-delivery', R),
  mvRefreshQueue: new Bull('mv-refresh', R),
};

// backend/workers/recurringInvoiceWorker.js
const { recurringQueue } = require('./queues');
const InvSvc = require('../services/inventoryTransactionService');
recurringQueue.process(async (job) => {
  const { orgId, templateId } = job.data;
  const tmpl = await getTemplate(templateId, orgId);
  if (!tmpl || tmpl.status !== 'active') return;
  const invoiceData = {
    ...JSON.parse(tmpl.template_data || '{}'),
    number: await getNextInvoiceNumber(orgId),
    date: new Date().toISOString().split('T')[0],
  };
  await InvSvc.createInvoiceWithStockDeduction(orgId, invoiceData, invoiceData.items || []);
  await updateNextRun(templateId, tmpl.frequency);
});

// backend/workers/scheduler.js — runs every 60 seconds
const { recurringQueue } = require('./queues');
const { db } = require('../db');
async function dispatchDue() {
  const due = await db.query(
    "SELECT id, org_id FROM recurring_invoices WHERE status='active' AND next_run <= NOW() AND deleted_at IS NULL"
  );
  for (const r of due.rows) {
    await recurringQueue.add(
      { orgId: r.org_id, templateId: r.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );
  }
}
setInterval(dispatchDue, 60000);
dispatchDue();

// Add to server.js:
require('./workers/scheduler');
require('./workers/recurringInvoiceWorker');
```

---

## PHASE 10 — RAZORPAY PAYMENT COLLECTION

**Status: NOT STARTED.**

```javascript
// Install: npm install razorpay
// backend/routes/razorpay.js

const Razorpay = require('razorpay');
const crypto   = require('crypto');
const PaySvc   = require('../services/paymentAllocationService');

const rzp = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order for an invoice
router.post('/orders', requireAuth, async (req, res) => {
  const { invoice_id } = req.body;
  const inv = await db.query(
    'SELECT total, COALESCE(paid_amount,0) as paid FROM invoices WHERE id=$1 AND org_id=$2',
    [invoice_id, req.orgId]
  );
  const paise = Math.round((inv.rows[0].total - inv.rows[0].paid) * 100);
  const order = await rzp.orders.create({
    amount: paise, currency: 'INR', receipt: invoice_id,
    notes: { org_id: req.orgId, invoice_id }
  });
  sendSuccess(res, { order_id: order.id, amount: paise });
});

// Webhook — Razorpay calls this on payment.captured
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
                         .update(req.body).digest('hex');
  if (sig !== expected) return res.status(400).send('Bad signature');

  const event = JSON.parse(req.body.toString());
  if (event.event === 'payment.captured') {
    const pay  = event.payload.payment.entity;
    const order = await rzp.orders.fetch(pay.order_id);
    await PaySvc.createPaymentWithAllocation(
      order.notes.org_id, null, pay.amount / 100,
      new Date().toISOString().split('T')[0], 'razorpay',
      { [order.notes.invoice_id]: { amount: pay.amount / 100 } }
    );
  }
  res.json({ status: 'ok' });
});
// Add env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
```

---

## PHASE 11 — TESTING REQUIREMENTS

**Current state: ZERO tests.** The `package.json` test scripts are echo statements.

| Test Type | Scope | Tool | Target |
|-----------|-------|------|--------|
| Unit | GST calculations (CGST/SGST/IGST math) | Jest | 100% |
| Unit | Payment allocation, overpayment guard, reversal | Jest | 100% |
| Unit | Inventory deduction, stock underflow guard | Jest | 100% |
| Integration | Invoice CREATE → stock deducted → GST ledger → outstanding | Supertest | 100% |
| Integration | Payment → invoice status → customer balance | Supertest | 100% |
| Integration | Recurring invoice queue dispatch and execution | Jest + Bull mock | 100% |
| API | All 60+ REST endpoints: auth, validation, RBAC | Supertest | 95%+ |
| Load | 500 concurrent invoice creates, report generation | k6 | p95 < 2s |
| Security | SQL injection, XSS, CORS, cross-org data access | OWASP ZAP | All P0/P1 zero |
| E2E | Login → Invoice → Payment → Report | Playwright | Full happy path |

### Critical Financial Test Cases (Must Pass at 100%)
1. GST intra-state: ₹10,000 at 18% → CGST=₹900, SGST=₹900, IGST=₹0
2. GST inter-state: ₹10,000 at 18% → CGST=₹0, SGST=₹0, IGST=₹1,800
3. Overpayment guard: allocate ₹11,000 to ₹10,000 invoice → must throw, no payment created
4. Concurrent payments: two simultaneous ₹5,000 payments to one ₹8,000 invoice → total allocated exactly ₹8,000
5. Stock deduction: invoice 10 units → `product.stock_qty` decremented by exactly 10
6. Stock underflow: invoice 15 units with 10 in stock → throw, no invoice created, stock unchanged
7. Invoice edit delta: change 10 units to 7 → stock restored by 3, not re-deducted from 7
8. GSTR-3B cross-check: SUM(CGST in gst_ledger for period) = `gstr3b.cgst_outward` for same period
9. Customer outstanding: after 3 payments → `outstanding = SUM(total) - SUM(paid)` with no rounding drift
10. Payment reversal: reverse payment → invoice back to "sent", stock qty restored

---

## PHASE 12 — OBSERVABILITY

```javascript
// Install: npm install @sentry/node winston ioredis

// backend/utils/logger.js
const winston = require('winston');
module.exports = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ozofibooks-api' },
  transports: [new winston.transports.Console()],
});

// Sentry — add to server.js startup
require('@sentry/node').init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Health check routes
router.get('/health',    (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
router.get('/health/db', async (req, res) => {
  try { await db.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch (e) { res.status(503).json({ status: 'error', message: e.message }); }
});
```

---

## PHASE 13 — DEVOPS & DEPLOYMENT

| Layer | Service | Specification |
|-------|---------|---------------|
| Frontend | Vercel / Cloudflare Pages | React SPA, edge CDN |
| Backend | Railway / Render | Node.js, 2 vCPU, 2GB RAM, 2 instances |
| Database | Supabase / RDS PostgreSQL 14+ | 4GB RAM, 100GB SSD, PITR 7 days |
| Cache | Upstash Redis | 512MB, queue + dashboard cache |
| File Storage | Cloudflare R2 / S3 | Invoice PDFs, warranty proofs |
| Email | Resend / SendGrid | Invoices, receipts, overdue alerts |
| Monitoring | Sentry + Uptime Robot | Errors + 1-min uptime checks |
| CI/CD | GitHub Actions | Test → Lint → Build → Deploy on main |

### Monthly Cost Estimate (1,000 companies)
| Service | Cost | Notes |
|---------|------|-------|
| PostgreSQL (Supabase Pro) | ₹6,000 ($70) | Backups + PITR |
| Backend (Render x2) | ₹4,300 ($50) | Zero-downtime deploys |
| Redis (Upstash) | ₹860 ($10) | Queue + cache |
| Frontend (Vercel Pro) | ₹1,720 ($20) | Analytics included |
| Email (Resend) | ₹860 ($10) | 100K emails/month |
| Storage (R2) | ₹430 ($5) | 10GB PDFs/month |
| Sentry | ₹860 ($10) | Error tracking |
| **TOTAL** | **~₹15,000/month** | Scales to ~₹35,000 at 5,000 companies |

---

## PHASE 14 — PRODUCTION READINESS CHECKLIST

### 🔴 Must Fix Before Launch (P0 Blockers)

| # | Task | Risk | Effort |
|---|------|------|--------|
| 1 | Wire paymentAllocationService into payments route | Financial data loss | 2h |
| 2 | Wire inventoryTransactionService into invoices create + edit | Inventory corruption | 4h |
| 3 | Wire gstCalculationService into all invoice/AP creation | GST non-compliance | 2h |
| 4 | Apply Zod validators to all routes | Data integrity / injection | 4h |
| 5 | Activate security middleware (server-PRODUCTION.js) | Full security exposure | 30min |
| 6 | Remove JWT_SECRET hardcoded fallback in auth.js | Token forgery | 10min |
| 7 | Fix GSTR-3B igst_outward column reference bug | Wrong GST liability | 1h |
| 8 | Write unit tests for all financial services (50+ cases) | No correctness guarantee | 3d |
| 9 | Add pagination to all list endpoints | Full table scans | 4h |
| 10 | Create banking backend (Migration 009 + 12 routes) | Banking feature broken | 3d |
| 11 | Build Bull worker for recurring invoice execution | Recurring billing dead | 1d |
| 12 | Add /health and /health/db endpoints | Load balancer blind | 2h |
| 13 | Deploy with HTTPS + valid TLS cert | Credential exposure | 2h |
| 14 | Set all required env vars in production | Security | 1h |

### 🟡 Should Fix Before Launch (P1)

| # | Task | Risk | Effort |
|---|------|------|--------|
| 1 | Build General Ledger (Migration 006 + postJournalEntry in services) | Incorrect Balance Sheet | 5d |
| 2 | Add Sentry + Winston structured logging | Blind in production | 1d |
| 3 | Integrate Razorpay payment collection + webhook | Cannot collect money online | 3d |
| 4 | Materialize view REFRESH schedule (pg_cron or Bull) | Stale reports | 2h |
| 5 | Increase DB pool to 25, add Redis caching for dashboard | Performance at scale | 2h |
| 6 | GitHub Actions CI/CD pipeline | Manual deploy risk | 1d |
| 7 | Database PITR backup config | Data loss risk | 2h |
| 8 | Server-side PDF generation for invoices | Cannot send invoices | 1d |
| 9 | Email delivery (Resend/SendGrid) | Core UX broken | 1d |
| 10 | GSTIN check digit validation | Invalid GST data | 4h |
| 11 | Reverse charge (RCM) flag + GST posting logic | GST edge case gap | 2d |

### 🟢 Can Fix After Launch (P2)

- e-Invoice (IRN) integration via NIC sandbox — 3d
- TDS deduction engine + reports — 2d
- 2FA (TOTP) for owner/admin — 2d
- Multi-currency FX rate lookup — 2d
- Playwright E2E test suite — 1w
- k6 load testing at 500 concurrent users — 2d
- Procurement analysis: replace mock data with real queries — 1d
- Field-level encryption for PAN, GSTIN, bank account numbers — 2d

---

## PHASE 15 — 6-WEEK EXECUTION ROADMAP

### Week 1 — Fix the Financial Engine (Days 1–7)

| Task | Effort | Risk If Skipped |
|------|--------|-----------------|
| Wire paymentAllocationService into payments.js | 2h | Financial data loss on every payment |
| Wire inventoryTransactionService into invoices.js (create + edit) | 4h | Inventory never decremented — phantom stock |
| Wire gstCalculationService into invoice/AP creation | 2h | GST returns always zero |
| Fix GSTR-3B igst_outward query bug | 1h | Wrong IGST liability in tax return |
| Activate security middleware (merge server-PRODUCTION.js) | 30min | App running with zero security |
| Remove JWT_SECRET + COOKIE_SECRET hardcoded fallbacks | 30min | Predictable signing keys in production |
| Apply Zod validate() middleware to all routes | 4h | Unvalidated input on every endpoint |
| Add pagination (page/limit) to all list endpoints | 4h | Full-table scan on every request |
| Increase pool max to 25 | 30min | Connection timeouts under any real load |
| Write 50 unit tests for GST, payment allocation, inventory services | 3d | No proof that financial math is correct |

### Week 2 — Accounting Engine + Banking Backend (Days 8–14)

| Task | Effort | Risk If Skipped |
|------|--------|-----------------|
| Write integration tests: Invoice→Payment→Report full flow | 1d | Regression risk on financial flows |
| Run Migration 006: chart_of_accounts + journal_entries + journal_lines | 4h | Balance Sheet cannot balance |
| Implement postJournalEntry() in each service (inside existing transactions) | 1d | GL out of sync with operational tables |
| Run Migration 009: banking schema | 2h | Banking feature entirely broken |
| Build backend/routes/banking.js (12 routes) | 1.5d | All banking pages return 404 |
| Wire /banking into routes/index.js + test all routes | 2h | Banking still broken |
| Add /health and /health/db endpoints | 1h | Load balancer cannot health-check app |

### Week 3 — Scheduler + Razorpay + GST Compliance (Days 15–21)

| Task | Effort | Risk If Skipped |
|------|--------|-----------------|
| Build queues.js + recurringInvoiceWorker.js + scheduler.js | 1d | Recurring billing entirely dead |
| Test recurring execution end-to-end | 4h | Core billing feature non-functional |
| Build mvRefreshWorker (refresh MV every 5 min) | 2h | Dashboard permanently stale |
| Integrate Razorpay: order creation + webhook handler | 1.5d | Cannot collect digital payments |
| Add GSTIN format + check digit validation | 4h | Invalid GSTIN data in GST returns |
| Run Migration 007 + implement RCM posting logic | 3h | RCM transactions misreported |

### Week 4 — Observability + Email + PDF + CI/CD (Days 22–28)

| Task | Effort | Risk If Skipped |
|------|--------|-----------------|
| Add Sentry initialization + Express error handler | 2h | No error visibility in production |
| Replace console.log with Winston logger | 4h | Unstructured logs in production |
| Configure Resend/SendGrid for invoice email + payment receipts | 1d | Cannot send invoices to customers |
| Server-side PDF generation (puppeteer/pdfkit) | 1d | Cannot generate invoice PDFs |
| Set up GitHub Actions CI/CD | 1d | Manual deployments — risky |
| Configure database PITR backup | 2h | Data loss with no recovery |
| Deploy to staging — run full smoke test suite | 4h | Unknown surprises at production |

### Week 5 — Load Testing + Security Audit (Days 29–35)

| Task | Effort | Risk If Skipped |
|------|--------|-----------------|
| k6 load test: 500 concurrent users, 10,000 invoices | 1d | Unknown performance ceiling |
| Add Redis caching for heavy report queries | 4h | Slow queries impact all users |
| OWASP ZAP automated scan + fix all P0/P1 findings | 1d | Undetected vulnerabilities |
| Playwright E2E: Login → Invoice → Payment → Report | 1d | No automated regression guard |
| Audit all PUT/DELETE for org_id cross-tenant scoping | 4h | Cross-organisation data access |
| Short-lived JWT (15min) + refresh token rotation | 4h | Non-revocable 7-day tokens |

### Week 6 — Launch Preparation (Days 36–42)

| Task | Effort | Risk If Skipped |
|------|--------|-----------------|
| Run all migrations on fresh DB + verify rollback scripts | 4h | Migration failure at launch |
| Write operations runbook (startup, shutdown, backup restore, incident response) | 4h | Ops team blind during incidents |
| Manual penetration test (auth bypass, cross-org access, payment manipulation) | 1d | Security vulnerability in financial app |
| Decide billing/subscription model + create price table | 1d | Cannot charge customers |
| Legal review: Privacy policy, ToS, GST invoice format compliance | 1d | Legal exposure at launch |
| All P0 items verified closed — sign-off | 4h | Premature launch with known bugs |
| **PRODUCTION GO-LIVE** | — | — |

---

## FINAL ASSESSMENT

### Production Readiness Scores

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Production Readiness | **18 / 100** | Three core services built but unconnected. Not deployable. |
| Financial Accuracy | **22 / 100** | Invoices skip stock deduction. Payments not allocated. Balances never updated. |
| GST Compliance | **35 / 100** | Correct logic, never called. gst_ledger empty. GSTR-3B query bug confirmed. |
| Security | **45 / 100** | Full stack written in security.js but server.js (the running app) applies none of it. |
| Scalability | **40 / 100** | Good schema. Pool too small. No pagination. No cache. MV never refreshed. |
| Investor Readiness | **30 / 100** | Strong architecture. Zero tests, no monitoring, no CI/CD, not deployable. |
| **OVERALL** | **25 / 100** | **NOT PRODUCTION READY** |

---

### Engineering Leadership Bottom Line

Ozofi Books has excellent bones. The PostgreSQL schema is production-grade. The financial service layer is architecturally sound. The security middleware is written and correct. The frontend covers almost every workflow an Indian SMB needs.

**The single biggest problem is one of integration, not design.** Three perfectly implemented financial services — payment allocation, inventory deduction, GST posting — are completely disconnected from the running application. Each can be wired in under 2–4 hours.

**The second biggest problem** is that the entire security stack lives in a file that is never run. This is a 30-minute fix with production-ending consequences if not addressed.

Execute the 6-week roadmap above — prioritising the 14 P0 blockers in Week 1 — and Ozofi Books will safely and confidently serve **1,000 paying Indian SMBs**. The architecture will scale to 10,000 businesses with the Phase 7 investments.

> **Projected production readiness score after 6 weeks of focused execution: 88 / 100**

---

*Document prepared June 2026 · Ozofi Books Pro Engineering Leadership*

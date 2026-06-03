# BillFlow Pro Production Hardening - Phases 4-9 (Compressed)

---

## PHASE 4: API & VALIDATION HARDENING (35 hours)

### Issue 4.1: No Pagination Implementation
**Time:** 8h | **Priority:** HIGH

**Implementation:** Add cursor-based pagination to all list endpoints

```javascript
// backend/utils/pagination.js
class Pagination {
  static async paginate(query, params, limit = 50) {
    const cursor = params.cursor ? Buffer.from(params.cursor, 'base64').toString() : null;
    const MAX_LIMIT = 500;
    const actualLimit = Math.min(parseInt(limit, 10), MAX_LIMIT);

    let sql = query;
    if (cursor) {
      sql += ` AND id > '${cursor}'`;
    }
    sql += ` LIMIT ${actualLimit + 1}`;

    const result = await db.query(sql);
    const rows = result.rows;
    
    const hasMore = rows.length > actualLimit;
    const data = hasMore ? rows.slice(0, actualLimit) : rows;
    const nextCursor = hasMore ? Buffer.from(data[actualLimit - 1].id).toString('base64') : null;

    return { data, nextCursor, hasMore };
  }
}

module.exports = Pagination;
```

**Test:** Verify `limit` clamping, cursor validation, hasMore flag

---

### Issue 4.2: No Request Validation Middleware  
**Time:** 12h | **Priority:** HIGH

*See Phase 1 Issue 1.4 for Zod implementation*

**Apply to all routes:**
```javascript
router.post('/', requireAuth, validateRequest('createInvoice'), async (req, res) => {
  const { ...validated } = req.validated;  // Use validated data, not req.body
});
```

---

### Issue 4.3: No Error Code Standardization
**Time:** 8h | **Priority:** MEDIUM

**backend/utils/errors.js**
```javascript
const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  OVERPAYMENT: 400,
  STOCK_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  PAYMENT_ERROR: 500,
};

function createErrorResponse(code, message, details = {}) {
  return {
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { ERROR_CODES, createErrorResponse };
```

---

## PHASE 5: COMPREHENSIVE TESTING (80 hours)

### Issue 5.1: Zero Test Coverage
**Time:** 80h | **Priority:** CRITICAL

**Test Structure:**

```
backend/tests/
  ├── unit/
  │   ├── gstCalculator.test.js (20 tests)
  │   ├── inventoryService.test.js (20 tests)
  │   └── validators.test.js (15 tests)
  ├── integration/
  │   ├── auth.integration.test.js (15 tests)
  │   ├── invoices.integration.test.js (30 tests)
  │   ├── payments.integration.test.js (25 tests)
  │   ├── inventory.integration.test.js (20 tests)
  │   └── creditNotes.integration.test.js (15 tests)
  └── e2e/
      ├── checkout.e2e.test.js (10 tests)
      └── recurring.e2e.test.js (10 tests)
```

**Total: 180 tests**

**Setup:**
```bash
npm install --save-dev jest supertest @faker-js/faker
```

**jest.config.js**
```javascript
module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: ['backend/**/*.js', '!backend/tests/**'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Sample Test:**
```javascript
// backend/tests/integration/invoices.integration.test.js
describe('Invoice Lifecycle', () => {
  let customer, token;

  beforeAll(async () => {
    await initDatabase();
    token = await authenticate();
  });

  beforeEach(async () => {
    customer = await createCustomer({ name: 'Test', state: 'KA' });
  });

  it('should create invoice with correct GST calculation', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        number: 'INV-001',
        customer_id: customer.id,
        customer_name: 'Test',
        items: [{ description: 'Item', quantity: 1, unit_price: 1000, tax_rate: 18 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('cgst_amount', 90);  // 1000 * 9% (half of 18%)
    expect(res.body.data).toHaveProperty('sgst_amount', 90);
  });

  it('should update customer outstanding', async () => {
    const invoice = await createInvoice({ customer_id: customer.id, total: 1000 });
    
    let cust = await getCustomer(customer.id);
    expect(cust.outstanding).toBe(1000);

    await createPayment({ invoice_id: invoice.id, amount: 600 });

    cust = await getCustomer(customer.id);
    expect(cust.outstanding).toBe(400);
  });
});
```

**Estimated Tests by Category:**
- Unit tests (Calculations, Validators): 55 tests
- Integration tests (Workflows): 100 tests
- E2E tests (Full scenarios): 20 tests
- Security tests: 15 tests

---

## PHASE 6: PERFORMANCE OPTIMIZATION (45 hours)

### Issue 6.1: No Query Optimization
**Time:** 15h

**Actions:**
1. Add database indexes (see Phase 3)
2. Denormalize summary tables
3. Add materialized views for reports

```sql
-- Materialized view for daily revenue
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
  org_id,
  DATE(created_at) as revenue_date,
  SUM(total) as total_revenue,
  COUNT(*) as invoice_count,
  AVG(total) as avg_invoice
FROM invoices
WHERE status IN ('paid', 'partially_paid')
GROUP BY org_id, DATE(created_at);

CREATE INDEX idx_mv_daily_revenue ON mv_daily_revenue(org_id, revenue_date DESC);

-- Refresh schedule
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
```

**Usage in reports:**
```javascript
router.get('/daily-revenue', requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT * FROM mv_daily_revenue WHERE org_id = $1 ORDER BY revenue_date DESC LIMIT 30`,
    [req.orgId]
  );
  sendSuccess(res, result.rows);
});
```

### Issue 6.2: No Caching Strategy
**Time:** 15h

**Redis Setup:**
```javascript
// backend/cache/redis.js
const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

async function getOrSet(key, ttl, getter) {
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);

  const value = await getter();
  await client.setex(key, ttl, JSON.stringify(value));
  return value;
}

module.exports = { client, getOrSet };
```

**Cache Keys:**
```javascript
const CACHE = {
  ORG_SUMMARY: (orgId) => `org:${orgId}:summary`,
  CUSTOMER_BALANCE: (customerId) => `customer:${customerId}:balance`,
  INVOICE_TOTAL: (invoiceId) => `invoice:${invoiceId}:total`,
};

// Usage
const summary = await getOrSet(CACHE.ORG_SUMMARY(orgId), 3600, async () => {
  return await fetchSummary(orgId);
});

// Invalidate on change
await cache.client.del(CACHE.ORG_SUMMARY(orgId));
```

### Issue 6.3: Reports Running Full Table Scans
**Time:** 15h

**Optimize reports.js:**
```javascript
router.get('/summary', requireAuth, async (req, res) => {
  try {
    // Use pre-calculated aggregates instead of scanning tables
    const summary = await db.query(
      `SELECT
        COALESCE((SELECT SUM(total) FROM invoices WHERE org_id=$1 AND status='paid'), 0) as totalRevenue,
        COALESCE((SELECT SUM(total) - SUM(paid_amount) FROM invoices WHERE org_id=$1), 0) as outstanding,
        COUNT(DISTINCT customer_id) as customerCount
       FROM invoices WHERE org_id=$1`,
      [req.orgId]
    ).then(r => r.rows[0]);

    sendSuccess(res, summary);
  } catch (err) {
    sendError(res, 'Report error', 'REPORT_ERROR', 500);
  }
});
```

---

## PHASE 7: RECURRING BILLING ENGINE (30 hours)

### Issue 7.1: No Job Scheduler
**Time:** 30h

**Option A: BullMQ (Recommended for production)**
```bash
npm install bull redis
```

```javascript
// backend/jobs/recurringInvoices.js
const Bull = require('bull');
const { v4: uuid } = require('uuid');
const { db } = require('../db');

const recurringQueue = new Bull('recurring-invoices', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

// Process recurring invoices every hour
recurringQueue.process(async (job) => {
  const { orgId } = job.data;

  const templates = await db.query(
    `SELECT * FROM recurring_invoices 
     WHERE org_id = $1 AND status = 'active' AND next_run <= NOW()`,
    [orgId]
  ).then(r => r.rows);

  for (const template of templates) {
    try {
      // Generate invoice from template
      const invoice = {
        id: uuid(),
        org_id: orgId,
        number: await generateInvoiceNumber(orgId),
        customer_id: template.customer_id,
        customer_name: template.customer_name,
        amount: template.amount,
        // ... other fields from template
      };

      await db.query(
        `INSERT INTO invoices (...) VALUES (...)`,
        [...Object.values(invoice)]
      );

      // Schedule next run
      const nextRun = calculateNextRun(template.frequency, template.next_run);
      await db.query(
        `UPDATE recurring_invoices SET next_run = $1 WHERE id = $2`,
        [nextRun, template.id]
      );

      // Send invoice if auto_send
      if (template.auto_send) {
        await sendInvoice(invoice);
      }

      await AuditLog.log(orgId, 'system', 'recurring_invoice_generated', 'recurring', template.id);

    } catch (err) {
      console.error(`Recurring invoice error for ${template.id}:`, err);
      await AuditLog.log(orgId, 'system', 'recurring_invoice_failed', 'recurring', template.id, { error: err.message });
    }
  }

  return { processed: templates.length };
});

// Schedule job to run every hour
const rule = new cron.ScheduleExpression();
rule.hours = '*';  // Every hour
rule.minutes = 0;

recurringQueue.add({}, { repeat: rule });

module.exports = { recurringQueue };
```

**Option B: node-cron (Simpler, for small scale)**
```javascript
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {  // Every hour
  console.log('Running recurring invoice job...');
  try {
    // Same logic as above
  } catch (err) {
    console.error('Recurring invoice job failed:', err);
  }
});
```

**Recommendation:** Use BullMQ for production (better error handling, retries, monitoring)

---

## PHASE 8: GENERAL LEDGER & ACCOUNTING ENGINE (40 hours)

### Issue 8.1: No Journal Entries
**Time:** 40h

**Database Schema:**
```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  account_code VARCHAR(20) UNIQUE,
  account_name VARCHAR(100),
  account_type ENUM ('asset', 'liability', 'equity', 'revenue', 'expense'),
  sub_type VARCHAR(50),
  balance DECIMAL(14,2),
  created_at TIMESTAMP,
  
  UNIQUE(org_id, account_code)
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  entry_date DATE,
  reference_type VARCHAR(50),  -- 'invoice', 'payment', 'expense'
  reference_id UUID,
  description TEXT,
  created_by UUID,
  posted_at TIMESTAMP,
  posted_by UUID,
  created_at TIMESTAMP
);

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY,
  journal_entry_id UUID REFERENCES journal_entries,
  account_id UUID REFERENCES chart_of_accounts,
  debit DECIMAL(14,2),
  credit DECIMAL(14,2),
  line_no INTEGER
);
```

**Posting Logic:**
```javascript
class JournalService {
  // Invoice → GL entries
  static async postInvoice(invoice) {
    const debit = {
      account: 'accounts_receivable',
      amount: invoice.total,
    };
    const credit = {
      account: 'revenue',
      amount: invoice.total,
    };

    await this.createEntry(invoice.org_id, 'invoice', invoice.id, [debit, credit]);
  }

  // Payment → GL entries
  static async postPayment(payment, invoice) {
    const debit = {
      account: 'cash',
      amount: payment.amount,
    };
    const credit = {
      account: 'accounts_receivable',
      amount: payment.amount,
    };

    await this.createEntry(payment.org_id, 'payment', payment.id, [debit, credit]);
  }

  static async createEntry(orgId, type, referenceId, lines) {
    const entryId = uuid();
    await db.query(
      `INSERT INTO journal_entries (...) VALUES (...)`,
      [entryId, orgId, new Date(), type, referenceId, ...]
    );

    for (let i = 0; i < lines.length; i++) {
      await db.query(
        `INSERT INTO journal_lines (...) VALUES (...)`,
        [uuid(), entryId, lines[i].account, lines[i].debit || 0, lines[i].credit || 0, i]
      );
    }
  }
}
```

---

## PHASE 9: IMPLEMENTATION ROADMAP

### Week 1: Security & Auth (40h)
- Day 1-2: JWT + CORS + Helmet (16h)
- Day 3: Rate limiting + Audit logs (8h)
- Day 4: Input validation (12h)
- Day 5: Security testing (4h)

### Week 2: Financial Accuracy (60h)
- Day 1-2: Payment allocation (20h)
- Day 3: Credit notes (8h)
- Day 4-5: GST implementation (32h)

### Week 3: Database & Testing (50h + 80h)
- Day 1-2: Inventory transactions (12h)
- Day 3: Connection pooling + indexes (9h)
- Day 4-5: Unit & integration tests (40h)

### Week 4: Performance & Remaining (45h + 30h + 40h)
- Day 1-2: Query optimization + caching (30h)
- Day 3-4: Recurring billing engine (15h)
- Day 5: Accounting GL (25h)

### Post-Launch
- Week 5-6: E2E testing + UAT (40h)
- Week 7: Performance testing & tuning (20h)
- Week 8: Security audit + penetration testing (20h)

---

## DEPLOYMENT CHECKLIST

### Pre-Launch
- [ ] All security configs set (JWT secret, CORS, Helmet)
- [ ] Database migrations applied
- [ ] Tests passing (min 80% coverage)
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Backup strategy verified
- [ ] Rollback plan documented
- [ ] Monitoring configured (logs, metrics, alerts)
- [ ] SSL/TLS certificate installed
- [ ] Environment variables set in production

### Post-Launch
- [ ] Monitor error rates (target: < 1 per 10K requests)
- [ ] Track payment processing latency (target: < 200ms)
- [ ] Monitor database connection pool
- [ ] Set up automated backup tests
- [ ] Schedule weekly security patching

---

## CRITICAL COMMAND REFERENCE

```bash
# Generate JWT secret
node -e "const c=require('crypto'); console.log(c.randomBytes(64).toString('hex'))"

# Apply database migrations
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f 003_payment_allocation_engine.sql

# Run full test suite
npm test -- --coverage

# Performance load testing
npm install -g autocannon
autocannon http://localhost:3000/api/invoices -c 50 -d 60

# Database validation
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname='public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

---

## SUMMARY

| Phase | Hours | Priority | Dependencies |
|-------|-------|----------|--------------|
| 1: Security | 40 | P0 | None |
| 2: Financial | 60 | P0 | Phase 1 |
| 3: Database | 50 | P0 | Phase 1, 2 |
| 4: API | 35 | P1 | Phase 1-3 |
| 5: Testing | 80 | P1 | Phase 1-4 |
| 6: Performance | 45 | P2 | Phase 3-5 |
| 7: Recurring | 30 | P2 | Phase 2-6 |
| 8: GL | 40 | P2 | Phase 2, 3 |
| 9: Roadmap | - | - | All phases |

**Total Time:** ~380 hours (9-10 weeks with team of 2)

**Risk Assessment:**
- High Risk: Payment allocation (financial correctness)
- High Risk: Inventory deductions (stock accuracy)
- Medium Risk: GST calculations (compliance)
- Low Risk: Performance (user experience)

// backend/routes/banking.js
const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { db }  = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError }    = require('../utils/response');

// ── List bank accounts ────────────────────────────────────────────────────────
router.get('/accounts', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM bank_accounts WHERE org_id = $1 AND is_active = TRUE ORDER BY created_at`,
      [req.orgId]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get bank accounts error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Create bank account ───────────────────────────────────────────────────────
router.post('/accounts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      account_name, account_number, bank_name, ifsc_code,
      account_type, currency, opening_balance,
    } = req.body;
    if (!account_name) return sendError(res, 'account_name required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    const balance = parseFloat(opening_balance || 0);
    await db.query(
      `INSERT INTO bank_accounts
       (id, org_id, account_name, account_number, bank_name, ifsc_code,
        account_type, currency, opening_balance, current_balance, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,NOW())`,
      [
        id, req.orgId, account_name, account_number || null, bank_name || '',
        ifsc_code || null, account_type || 'current', currency || 'INR',
        balance, req.user.id,
      ]
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create bank account error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Update bank account ───────────────────────────────────────────────────────
router.put('/accounts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { account_name, bank_name, ifsc_code, account_type } = req.body;
    await db.query(
      `UPDATE bank_accounts SET account_name=$1, bank_name=$2, ifsc_code=$3,
       account_type=$4, updated_at=NOW() WHERE id=$5 AND org_id=$6`,
      [account_name, bank_name, ifsc_code, account_type, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Get transactions for an account (paginated) ───────────────────────────────
router.get('/accounts/:id/transactions', requireAuth, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(500, parseInt(req.query.limit) || 100);
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT * FROM bank_transactions
        WHERE bank_account_id = $1 AND org_id = $2
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT $3 OFFSET $4`,
      [req.params.id, req.orgId, limit, offset]
    );
    sendSuccess(res, { data: rows, page, limit });
  } catch (err) {
    console.error('Get transactions error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Manually add a transaction ────────────────────────────────────────────────
router.post('/accounts/:id/transactions', requireAuth, async (req, res) => {
  try {
    const {
      transaction_date, description, debit, credit, reference,
      transaction_type, value_date,
    } = req.body;

    if (!transaction_date) return sendError(res, 'transaction_date required', 'VALIDATION_ERROR', 400);
    if (!debit && !credit)  return sendError(res, 'debit or credit required', 'VALIDATION_ERROR', 400);

    const txId = uuid();
    const dr = parseFloat(debit || 0);
    const cr = parseFloat(credit || 0);

    // Update running balance
    const prev = await db.query(
      `SELECT current_balance FROM bank_accounts WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!prev.rows.length) return sendError(res, 'Account not found', 'NOT_FOUND', 404);

    const newBalance = parseFloat(prev.rows[0].current_balance) - dr + cr;

    await db.query('BEGIN');
    try {
      await db.query(
        `INSERT INTO bank_transactions
         (id, org_id, bank_account_id, transaction_date, value_date, description,
          debit, credit, balance, reference, transaction_type, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
        [
          txId, req.orgId, req.params.id,
          transaction_date, value_date || transaction_date,
          description || '', dr, cr, newBalance,
          reference || '', transaction_type || 'manual',
        ]
      );
      await db.query(
        `UPDATE bank_accounts SET current_balance=$1, updated_at=NOW() WHERE id=$2`,
        [newBalance, req.params.id]
      );
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }

    sendSuccess(res, { id: txId, balance: newBalance });
  } catch (err) {
    console.error('Add transaction error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Import CSV statement ──────────────────────────────────────────────────────
router.post('/accounts/:accountId/import', requireAuth, async (req, res) => {
  try {
    const { transactions } = req.body; // array of { date, description, debit, credit, reference }
    if (!Array.isArray(transactions) || !transactions.length)
      return sendError(res, 'transactions array required', 'VALIDATION_ERROR', 400);

    const prev = await db.query(
      `SELECT current_balance FROM bank_accounts WHERE id = $1 AND org_id = $2`,
      [req.params.accountId, req.orgId]
    );
    if (!prev.rows.length) return sendError(res, 'Account not found', 'NOT_FOUND', 404);

    let runningBalance = parseFloat(prev.rows[0].current_balance);
    let imported = 0;

    for (const tx of transactions) {
      const dr = parseFloat(tx.debit  || 0);
      const cr = parseFloat(tx.credit || 0);
      runningBalance = runningBalance - dr + cr;

      await db.query(
        `INSERT INTO bank_transactions
         (id, org_id, bank_account_id, transaction_date, description,
          debit, credit, balance, reference, transaction_type, import_source, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'imported','csv',NOW())
         ON CONFLICT DO NOTHING`,
        [
          uuid(), req.orgId, req.params.accountId,
          tx.date, tx.description || '',
          dr, cr, runningBalance, tx.reference || '',
        ]
      );
      imported++;
    }

    await db.query(
      `UPDATE bank_accounts SET current_balance=$1, updated_at=NOW() WHERE id=$2`,
      [runningBalance, req.params.accountId]
    );

    sendSuccess(res, { imported });
  } catch (err) {
    console.error('Import statement error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Match transaction to invoice / expense ────────────────────────────────────
router.post('/transactions/:txId/match', requireAuth, async (req, res) => {
  try {
    const { matched_to_type, matched_to_id } = req.body;
    await db.query(
      `UPDATE bank_transactions
         SET matched_to_type=$1, matched_to_id=$2, reconciled=TRUE, updated_at=NOW()
       WHERE id=$3 AND org_id=$4`,
      [matched_to_type, matched_to_id, req.params.txId, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Match transaction error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Get open / current reconciliation ────────────────────────────────────────
router.get('/reconciliation', requireAuth, async (req, res) => {
  try {
    const { account_id } = req.query;
    if (!account_id) return sendError(res, 'account_id required', 'VALIDATION_ERROR', 400);

    const { rows } = await db.query(
      `SELECT * FROM bank_reconciliations
        WHERE org_id=$1 AND bank_account_id=$2 AND status='open'
        ORDER BY period_end DESC LIMIT 1`,
      [req.orgId, account_id]
    );

    // Unreconciled transactions
    const unreconciled = await db.query(
      `SELECT * FROM bank_transactions
        WHERE org_id=$1 AND bank_account_id=$2 AND reconciled=FALSE
        ORDER BY transaction_date`,
      [req.orgId, account_id]
    );

    sendSuccess(res, {
      reconciliation: rows[0] || null,
      unreconciled: unreconciled.rows,
    });
  } catch (err) {
    console.error('Get reconciliation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Create reconciliation period ──────────────────────────────────────────────
router.post('/reconciliation', requireAuth, async (req, res) => {
  try {
    const { account_id, period_start, period_end, statement_balance } = req.body;
    if (!account_id || !period_start || !period_end || statement_balance === undefined)
      return sendError(res, 'account_id, period_start, period_end, statement_balance required', 'VALIDATION_ERROR', 400);

    // Get book balance from running bank transactions
    const bookRow = await db.query(
      `SELECT COALESCE(
         (SELECT balance FROM bank_transactions
           WHERE bank_account_id=$1 AND org_id=$2
             AND transaction_date <= $3
           ORDER BY transaction_date DESC, created_at DESC LIMIT 1),
         (SELECT opening_balance FROM bank_accounts WHERE id=$1)
       ) AS book_balance`,
      [account_id, req.orgId, period_end]
    );

    const book_balance = parseFloat(bookRow.rows[0]?.book_balance || 0);
    const id = uuid();

    await db.query(
      `INSERT INTO bank_reconciliations
       (id, org_id, bank_account_id, period_start, period_end,
        statement_balance, book_balance, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,NOW())`,
      [id, req.orgId, account_id, period_start, period_end,
       parseFloat(statement_balance), book_balance, req.user.id]
    );

    sendSuccess(res, { id, book_balance, difference: parseFloat(statement_balance) - book_balance });
  } catch (err) {
    console.error('Create reconciliation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Close reconciliation period ───────────────────────────────────────────────
router.post('/reconciliation/:id/close', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Mark all transactions in range as reconciled
    const rec = await db.query(
      `SELECT * FROM bank_reconciliations WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    if (!rec.rows.length) return sendError(res, 'Reconciliation not found', 'NOT_FOUND', 404);
    const r = rec.rows[0];

    await db.query(
      `UPDATE bank_transactions SET reconciled=TRUE, updated_at=NOW()
        WHERE org_id=$1 AND bank_account_id=$2
          AND transaction_date BETWEEN $3 AND $4`,
      [req.orgId, r.bank_account_id, r.period_start, r.period_end]
    );

    await db.query(
      `UPDATE bank_reconciliations SET status='closed', closed_at=NOW()
        WHERE id=$1`,
      [req.params.id]
    );

    sendSuccess(res, null);
  } catch (err) {
    console.error('Close reconciliation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Cash forecast (30/60/90-day) ──────────────────────────────────────────────
router.get('/cash-forecast', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [bankBalance, arForecast, apForecast] = await Promise.all([
      // Current total cash
      db.query(
        `SELECT COALESCE(SUM(current_balance), 0) AS total_cash
           FROM bank_accounts WHERE org_id=$1 AND is_active=TRUE`,
        [req.orgId]
      ),
      // Receivables due in next 90 days (inflows)
      db.query(
        `SELECT
           due_date,
           SUM(total - COALESCE(paid_amount,0)) AS amount
         FROM invoices
         WHERE org_id=$1
           AND status IN ('sent','partially_paid','overdue')
           AND due_date >= $2
           AND due_date <= (CURRENT_DATE + INTERVAL '90 days')
           AND deleted_at IS NULL
         GROUP BY due_date ORDER BY due_date`,
        [req.orgId, today]
      ),
      // Payables due in next 90 days (outflows)
      db.query(
        `SELECT
           due_date,
           SUM(total_amount - COALESCE(paid_amount,0)) AS amount
         FROM ap_invoices
         WHERE org_id=$1
           AND status IN ('pending','partially_paid')
           AND due_date >= $2
           AND due_date <= (CURRENT_DATE + INTERVAL '90 days')
         GROUP BY due_date ORDER BY due_date`,
        [req.orgId, today]
      ),
    ]);

    sendSuccess(res, {
      current_cash:    parseFloat(bankBalance.rows[0].total_cash),
      ar_forecast:     arForecast.rows,
      ap_forecast:     apForecast.rows,
      net_30d:         _netForecast(arForecast.rows, apForecast.rows, 30),
      net_60d:         _netForecast(arForecast.rows, apForecast.rows, 60),
      net_90d:         _netForecast(arForecast.rows, apForecast.rows, 90),
    });
  } catch (err) {
    console.error('Cash forecast error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

function _netForecast(ar, ap, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const inflow  = ar.filter(r => r.due_date <= cutoffStr).reduce((s, r) => s + parseFloat(r.amount), 0);
  const outflow = ap.filter(r => r.due_date <= cutoffStr).reduce((s, r) => s + parseFloat(r.amount), 0);
  return { inflow, outflow, net: inflow - outflow };
}

// ── Overview (account balances + recent transactions) ─────────────────────────
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const [accounts, recentTx] = await Promise.all([
      db.query(
        `SELECT id, account_name, bank_name, account_type, current_balance, currency
           FROM bank_accounts WHERE org_id=$1 AND is_active=TRUE ORDER BY account_name`,
        [req.orgId]
      ),
      db.query(
        `SELECT bt.*, ba.account_name
           FROM bank_transactions bt
           JOIN bank_accounts ba ON bt.bank_account_id = ba.id
          WHERE bt.org_id=$1
          ORDER BY bt.transaction_date DESC, bt.created_at DESC LIMIT 20`,
        [req.orgId]
      ),
    ]);
    sendSuccess(res, { accounts: accounts.rows, recent_transactions: recentTx.rows });
  } catch (err) {
    console.error('Banking overview error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Cash ledger (all bank movements sorted by date) ───────────────────────────
router.get('/cash-ledger', requireAuth, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(500, parseInt(req.query.limit) || 100);
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT bt.*, ba.account_name, ba.currency
         FROM bank_transactions bt
         JOIN bank_accounts ba ON bt.bank_account_id = ba.id
        WHERE bt.org_id=$1
        ORDER BY bt.transaction_date DESC, bt.created_at DESC
        LIMIT $2 OFFSET $3`,
      [req.orgId, limit, offset]
    );
    sendSuccess(res, { data: rows, page, limit });
  } catch (err) {
    console.error('Cash ledger error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Banking insights ──────────────────────────────────────────────────────────
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const [totalCash, monthlyInOut, topPayees] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(current_balance),0) AS total FROM bank_accounts
          WHERE org_id=$1 AND is_active=TRUE`,
        [req.orgId]
      ),
      db.query(
        `SELECT
           DATE_TRUNC('month', transaction_date)::DATE AS month,
           SUM(credit) AS inflow,
           SUM(debit)  AS outflow
         FROM bank_transactions
         WHERE org_id=$1 AND transaction_date >= CURRENT_DATE - INTERVAL '6 months'
         GROUP BY 1 ORDER BY 1`,
        [req.orgId]
      ),
      db.query(
        `SELECT description, SUM(debit) AS total_paid
           FROM bank_transactions
          WHERE org_id=$1 AND debit > 0
            AND transaction_date >= CURRENT_DATE - INTERVAL '3 months'
          GROUP BY description
          ORDER BY total_paid DESC LIMIT 10`,
        [req.orgId]
      ),
    ]);

    sendSuccess(res, {
      total_cash:       parseFloat(totalCash.rows[0].total),
      monthly_cash_flow: monthlyInOut.rows,
      top_payees:       topPayees.rows,
    });
  } catch (err) {
    console.error('Banking insights error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;

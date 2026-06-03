// backend/tests/paymentAllocation.test.js
'use strict';

// ── Mock the DB pool ──────────────────────────────────────────────────────────
const mockClient = {
  query:   jest.fn(),
  release: jest.fn(),
};
jest.mock('../db', () => ({
  db: {
    query:   jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
  },
}));

const PaymentAllocationService = require('../services/paymentAllocationService');

// Helper: set up the standard "begin/commit" call sequence
function setupMockClient(overrides = {}) {
  mockClient.query.mockReset();
  mockClient.query.mockImplementation((sql, params) => {
    const q = sql.trim().toUpperCase();
    if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return { rows: [], rowCount: 0 };
    if (overrides[q]) return overrides[q];
    // Default: echo back empty
    return { rows: [], rowCount: 0 };
  });
}

describe('PaymentAllocationService', () => {

  beforeEach(() => {
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  // ── createPaymentWithAllocation ───────────────────────────────────────────
  describe('createPaymentWithAllocation', () => {

    test('allocates payment to a single invoice', async () => {
      const calls = [];
      mockClient.query.mockImplementation(async (sql, params) => {
        calls.push({ sql: sql.trim(), params });
        const up = sql.trim().toUpperCase();
        if (up === 'BEGIN' || up === 'COMMIT') return { rows: [], rowCount: 0 };

        // Resolve customer from invoice
        if (up.includes('SELECT CUSTOMER_ID FROM INVOICES')) {
          return { rows: [{ customer_id: 'cust-1' }], rowCount: 1 };
        }
        // INSERT INTO payments
        if (up.startsWith('INSERT INTO PAYMENTS')) return { rows: [], rowCount: 1 };
        // SELECT invoice FOR UPDATE
        if (up.includes('FOR UPDATE')) {
          return { rows: [{ customer_id: 'cust-1', total: 10000, paid_amount: 0 }], rowCount: 1 };
        }
        // UPDATE invoices
        if (up.startsWith('UPDATE INVOICES')) return { rows: [], rowCount: 1 };
        // INSERT INTO payment_allocations
        if (up.startsWith('INSERT INTO PAYMENT_ALLOCATIONS')) return { rows: [], rowCount: 1 };
        // SELECT SUM outstanding
        if (up.includes('SUM(TOTAL')) return { rows: [{ outstanding: 0 }], rowCount: 1 };
        // UPDATE customers
        if (up.startsWith('UPDATE CUSTOMERS')) return { rows: [], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });

      const result = await PaymentAllocationService.createPaymentWithAllocation(
        'org-1', null, 10000, '2026-01-01', 'bank_transfer',
        { 'inv-1': { amount: 10000, notes: 'Full payment' } }
      );

      expect(result.allocatedAmount).toBe(10000);
      expect(result.unappliedAmount).toBe(0);
      expect(result.paymentId).toBeTruthy();
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('throws on overpayment to a single invoice', async () => {
      mockClient.query.mockImplementation(async (sql) => {
        const up = sql.trim().toUpperCase();
        if (up === 'BEGIN' || up === 'COMMIT' || up === 'ROLLBACK') return { rows: [], rowCount: 0 };
        if (up.includes('SELECT CUSTOMER_ID FROM INVOICES'))
          return { rows: [{ customer_id: 'cust-1' }], rowCount: 1 };
        if (up.startsWith('INSERT INTO PAYMENTS')) return { rows: [], rowCount: 1 };
        if (up.includes('FOR UPDATE'))
          return { rows: [{ customer_id: 'cust-1', total: 10000, paid_amount: 0 }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });

      await expect(
        PaymentAllocationService.createPaymentWithAllocation(
          'org-1', null, 11000, '2026-01-01', 'bank_transfer',
          { 'inv-1': { amount: 11000 } }
        )
      ).rejects.toThrow(/Overpayment/i);

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('unapplied amount = payment - allocated', async () => {
      mockClient.query.mockImplementation(async (sql) => {
        const up = sql.trim().toUpperCase();
        if (up === 'BEGIN' || up === 'COMMIT') return { rows: [], rowCount: 0 };
        if (up.includes('SELECT CUSTOMER_ID FROM INVOICES'))
          return { rows: [{ customer_id: 'cust-1' }], rowCount: 1 };
        if (up.startsWith('INSERT INTO PAYMENTS')) return { rows: [], rowCount: 1 };
        if (up.includes('FOR UPDATE'))
          return { rows: [{ customer_id: 'cust-1', total: 10000, paid_amount: 0 }], rowCount: 1 };
        if (up.startsWith('UPDATE INVOICES')) return { rows: [], rowCount: 1 };
        if (up.startsWith('INSERT INTO PAYMENT_ALLOCATIONS')) return { rows: [], rowCount: 1 };
        if (up.includes('SUM(TOTAL')) return { rows: [{ outstanding: 5000 }], rowCount: 1 };
        if (up.startsWith('UPDATE CUSTOMERS')) return { rows: [], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });

      const result = await PaymentAllocationService.createPaymentWithAllocation(
        'org-1', null, 15000, '2026-01-01', 'bank_transfer',
        { 'inv-1': { amount: 10000 } }
      );

      expect(result.unappliedAmount).toBe(5000);
      expect(result.allocatedAmount).toBe(10000);
    });

    test('rollback on DB error', async () => {
      let rollbackCalled = false;
      mockClient.query.mockImplementation(async (sql) => {
        const up = sql.trim().toUpperCase();
        if (up === 'BEGIN') return { rows: [], rowCount: 0 };
        if (up === 'ROLLBACK') { rollbackCalled = true; return { rows: [], rowCount: 0 }; }
        if (up.startsWith('INSERT INTO PAYMENTS')) throw new Error('DB error');
        return { rows: [], rowCount: 0 };
      });

      await expect(
        PaymentAllocationService.createPaymentWithAllocation(
          'org-1', null, 1000, '2026-01-01', 'bank_transfer', {}
        )
      ).rejects.toThrow('DB error');

      expect(rollbackCalled).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ── reversePayment ────────────────────────────────────────────────────────
  describe('reversePayment', () => {
    test('reverses allocations and restores invoice status', async () => {
      const updatedInvoices = [];
      mockClient.query.mockImplementation(async (sql, params) => {
        const up = sql.trim().toUpperCase();
        if (up === 'BEGIN' || up === 'COMMIT') return { rows: [], rowCount: 0 };
        if (up.startsWith('SELECT') && up.includes('FROM PAYMENTS'))
          return { rows: [{ customer_id: 'cust-1', amount: 10000 }], rowCount: 1 };
        if (up.includes('FROM PAYMENT_ALLOCATIONS') && up.startsWith('SELECT'))
          return { rows: [{ invoice_id: 'inv-1', amount: 10000 }], rowCount: 1 };
        if (up.startsWith('SELECT') && up.includes('PAID_AMOUNT'))
          return { rows: [{ paid_amount: 10000 }], rowCount: 1 };
        if (up.startsWith('UPDATE INVOICES')) {
          updatedInvoices.push(params);
          return { rows: [], rowCount: 1 };
        }
        if (up.startsWith('DELETE FROM PAYMENT_ALLOCATIONS')) return { rows: [], rowCount: 1 };
        if (up.startsWith('UPDATE PAYMENTS')) return { rows: [], rowCount: 1 };
        if (up.includes('SUM(TOTAL')) return { rows: [{ outstanding: 10000 }], rowCount: 1 };
        if (up.startsWith('UPDATE CUSTOMERS')) return { rows: [], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });

      const result = await PaymentAllocationService.reversePayment('org-1', 'pay-1');
      expect(result.reversed).toBe(true);
      expect(result.amount).toBe(10000);
    });
  });
});

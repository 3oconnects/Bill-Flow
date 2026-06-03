// backend/tests/inventoryService.test.js
'use strict';

// Mock GSTCalculationService (tested separately)
jest.mock('../services/gstCalculationService', () => ({
  calculateInvoiceGST: jest.fn().mockReturnValue({
    cgst: 900, sgst: 900, igst: 0, total_tax: 1800, gst_type: 'intra',
  }),
}));

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

const InventoryTransactionService = require('../services/inventoryTransactionService');

function setupStdMock(stockQty = 100) {
  mockClient.query.mockReset();
  mockClient.query.mockImplementation(async (sql) => {
    const up = sql.trim().toUpperCase();
    if (up === 'BEGIN' || up === 'COMMIT') return { rows: [], rowCount: 0 };
    // Invoice insert
    if (up.startsWith('INSERT INTO INVOICES')) return { rows: [], rowCount: 1 };
    // Item insert
    if (up.startsWith('INSERT INTO INVOICE_ITEMS')) return { rows: [], rowCount: 1 };
    // Product stock lock
    if (up.includes('FOR UPDATE')) {
      return { rows: [{ stock_qty: stockQty, low_stock_alert: 5 }], rowCount: 1 };
    }
    // Update stock
    if (up.startsWith('UPDATE PRODUCTS')) return { rows: [], rowCount: 1 };
    // Inventory transaction insert
    if (up.startsWith('INSERT INTO INVENTORY_TRANSACTIONS')) return { rows: [], rowCount: 1 };
    // GST ledger
    if (up.startsWith('INSERT INTO GST_LEDGER')) return { rows: [], rowCount: 1 };
    // Customer outstanding
    if (up.startsWith('UPDATE CUSTOMERS')) return { rows: [], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
}

describe('InventoryTransactionService — createInvoiceWithStockDeduction', () => {

  const orgId   = 'org-1';
  const invData = {
    number: 'INV-001', customer_id: 'cust-1', customer_name: 'Test Customer',
    subtotal: 10000, total: 11800, tax: 1800,
    date: '2026-01-01', due_date: '2026-01-31',
  };
  const items = [
    { product_id: 'prod-1', description: 'Item A', quantity: 10, unit_price: 1000, tax_rate: 18, tax_amount: 1800, amount: 10000 },
  ];

  test('creates invoice and returns invoiceId', async () => {
    setupStdMock(100);
    const result = await InventoryTransactionService.createInvoiceWithStockDeduction(orgId, invData, items);
    expect(result.invoiceId).toBeTruthy();
    expect(result.items).toBe(1);
  });

  test('deducts correct quantity from stock', async () => {
    const stockUpdates = [];
    mockClient.query.mockReset();
    mockClient.query.mockImplementation(async (sql, params) => {
      const up = sql.trim().toUpperCase();
      if (up === 'BEGIN' || up === 'COMMIT') return { rows: [], rowCount: 0 };
      if (up.startsWith('INSERT INTO INVOICES')) return { rows: [], rowCount: 1 };
      if (up.startsWith('INSERT INTO INVOICE_ITEMS')) return { rows: [], rowCount: 1 };
      if (up.includes('FOR UPDATE'))
        return { rows: [{ stock_qty: 100, low_stock_alert: 5 }], rowCount: 1 };
      if (up.startsWith('UPDATE PRODUCTS') && up.includes('SET STOCK_QTY')) {
        stockUpdates.push(params[0]); // new stock value
        return { rows: [], rowCount: 1 };
      }
      if (up.startsWith('INSERT INTO INVENTORY_TRANSACTIONS')) return { rows: [], rowCount: 1 };
      if (up.startsWith('INSERT INTO GST_LEDGER')) return { rows: [], rowCount: 1 };
      if (up.startsWith('UPDATE CUSTOMERS')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    await InventoryTransactionService.createInvoiceWithStockDeduction(orgId, invData, items);
    // Stock was 100, sold 10 → should be 90
    expect(stockUpdates[0]).toBe(90);
  });

  test('throws on insufficient stock', async () => {
    setupStdMock(5); // Only 5 in stock, trying to sell 10
    await expect(
      InventoryTransactionService.createInvoiceWithStockDeduction(orgId, invData, items)
    ).rejects.toThrow(/Insufficient stock/i);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('rollback called on error', async () => {
    let rollbackCalled = false;
    mockClient.query.mockReset();
    mockClient.query.mockImplementation(async (sql) => {
      const up = sql.trim().toUpperCase();
      if (up === 'BEGIN') return { rows: [], rowCount: 0 };
      if (up === 'ROLLBACK') { rollbackCalled = true; return { rows: [], rowCount: 0 }; }
      if (up.startsWith('INSERT INTO INVOICES')) throw new Error('Insert failed');
      return { rows: [], rowCount: 0 };
    });

    await expect(
      InventoryTransactionService.createInvoiceWithStockDeduction(orgId, invData, items)
    ).rejects.toThrow('Insert failed');

    expect(rollbackCalled).toBe(true);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('items without product_id skip stock deduction', async () => {
    setupStdMock(10);
    const serviceItems = [
      { product_id: null, description: 'Consulting', quantity: 1, unit_price: 5000, tax_rate: 18, tax_amount: 900, amount: 5000 },
    ];
    // Should not throw even though no product row
    const result = await InventoryTransactionService.createInvoiceWithStockDeduction(
      orgId, { ...invData, total: 5900 }, serviceItems
    );
    expect(result.invoiceId).toBeTruthy();
  });
});

describe('InventoryTransactionService — updateInvoiceWithStockDelta', () => {
  test('restores stock when quantity is reduced', async () => {
    const stockUpdates = [];
    mockClient.query.mockReset();
    mockClient.query.mockImplementation(async (sql, params) => {
      const up = sql.trim().toUpperCase();
      if (up === 'BEGIN' || up === 'COMMIT') return { rows: [], rowCount: 0 };
      // Get current invoice
      if (up.startsWith('SELECT') && up.includes('FROM INVOICES') && up.includes('FOR UPDATE'))
        return { rows: [{ number: 'INV-001', customer_id: 'cust-1', total: 11800, subtotal: 10000, status: 'sent' }], rowCount: 1 };
      // Get old items
      if (up.startsWith('SELECT') && up.includes('FROM INVOICE_ITEMS') && up.includes('DELETED_AT IS NULL'))
        return { rows: [{ product_id: 'prod-1', quantity: 10 }], rowCount: 1 };
      // Soft-delete old items
      if (up.startsWith('UPDATE INVOICE_ITEMS') && up.includes('DELETED_AT')) return { rows: [], rowCount: 1 };
      // Insert new items
      if (up.startsWith('INSERT INTO INVOICE_ITEMS')) return { rows: [], rowCount: 1 };
      // Stock lock for delta
      if (up.includes('FOR UPDATE'))
        return { rows: [{ stock_qty: 90, low_stock_alert: 5 }], rowCount: 1 };
      // Stock update
      if (up.startsWith('UPDATE PRODUCTS') && up.includes('STOCK_QTY')) {
        stockUpdates.push(params[0]);
        return { rows: [], rowCount: 1 };
      }
      // Inventory transaction
      if (up.startsWith('INSERT INTO INVENTORY_TRANSACTIONS')) return { rows: [], rowCount: 1 };
      // Invoice update
      if (up.startsWith('UPDATE INVOICES') && up.includes('CUSTOMER_ID')) return { rows: [], rowCount: 1 };
      // GST ledger
      if (up.startsWith('DELETE FROM GST_LEDGER')) return { rows: [], rowCount: 1 };
      if (up.startsWith('INSERT INTO GST_LEDGER')) return { rows: [], rowCount: 1 };
      // Outstanding
      if (up.includes('SUM(TOTAL')) return { rows: [{ outstanding: 0 }], rowCount: 1 };
      if (up.startsWith('UPDATE CUSTOMERS')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    // Old qty was 10, new qty is 7 → delta = +3 restored to stock
    const newItems = [
      { product_id: 'prod-1', description: 'Item A', quantity: 7, unit_price: 1000, tax_rate: 18, tax_amount: 1260, amount: 7000 },
    ];
    await InventoryTransactionService.updateInvoiceWithStockDelta(
      'org-1', 'inv-1', newItems,
      { customer_id: 'cust-1', customer_name: 'Test', total: 8260, subtotal: 7000, tax: 1260 }
    );

    // delta = old(10) - new(7) = 3 → stock goes from 90 to 93
    expect(stockUpdates[0]).toBe(93);
  });
});

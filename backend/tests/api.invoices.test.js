// backend/tests/api.invoices.test.js
// Integration tests for the invoices REST API
'use strict';
process.env.JWT_SECRET   = 'test-secret-for-jest-only';
process.env.NODE_ENV     = 'test';
process.env.COOKIE_SECRET = 'test-cookie-secret';

const request = require('supertest');
const jwt     = require('jsonwebtoken');

// Mock DB pool so no real DB needed
jest.mock('../db', () => {
  const dbMock = {
    query:   jest.fn(),
    connect: jest.fn(),
  };
  return { db: dbMock, stmts: {} };
});

// Mock inventory service so unit test doesn't need real DB
jest.mock('../services/inventoryTransactionService', () => ({
  createInvoiceWithStockDeduction: jest.fn(),
  updateInvoiceWithStockDelta:     jest.fn(),
}));
jest.mock('../services/gstCalculationService', () => ({
  calculateInvoiceGST: jest.fn().mockReturnValue({
    cgst: 900, sgst: 900, igst: 0, total_tax: 1800, gst_type: 'intra',
  }),
}));

const { db } = require('../db');
const InvSvc  = require('../services/inventoryTransactionService');
const app     = require('../server');

function authCookie(userId = 'user-1', orgId = 'org-1') {
  const token = jwt.sign({ uid: userId, oid: orgId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `bf_session=${token}`;
}

// Suppress console.log noise during tests
beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(()  => { jest.restoreAllMocks(); });

describe('GET /api/invoices', () => {
  test('returns 401 without auth cookie', async () => {
    const res = await request(app).get('/api/invoices');
    expect(res.status).toBe(401);
  });

  test('returns 200 with auth cookie', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Mock user lookup
    const { stmts } = require('../db');
    stmts.getUserById = { get: jest.fn().mockResolvedValue({ id: 'user-1', org_id: 'org-1', is_active: true, role: 'owner' }) };

    const res = await request(app)
      .get('/api/invoices')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/invoices', () => {
  const validBody = {
    number: 'INV-001',
    customer_name: 'Test Customer',
    customer_id: 'cust-1',
    date: '2026-01-01',
    due_date: '2026-01-31',
    subtotal: 10000,
    tax: 1800,
    total: 11800,
    items: [
      { description: 'Item A', quantity: 1, unit_price: 10000, tax_rate: 18, tax_amount: 1800, amount: 10000 },
    ],
  };

  beforeEach(() => {
    const { stmts } = require('../db');
    stmts.getUserById = { get: jest.fn().mockResolvedValue({ id: 'user-1', org_id: 'org-1', is_active: true, role: 'owner' }) };
  });

  test('returns 400 when number is missing', async () => {
    const { number, ...body } = validBody;
    const res = await request(app)
      .post('/api/invoices')
      .set('Cookie', authCookie())
      .send(body);
    expect(res.status).toBe(400);
  });

  test('returns 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Cookie', authCookie())
      .send({ ...validBody, items: [] });
    expect(res.status).toBe(400);
  });

  test('calls InventoryTransactionService on valid request', async () => {
    InvSvc.createInvoiceWithStockDeduction.mockResolvedValueOnce({
      invoiceId: 'new-inv-id',
      gst: { cgst: 900, sgst: 900, igst: 0, total_tax: 1800 },
      items: 1,
    });

    const res = await request(app)
      .post('/api/invoices')
      .set('Cookie', authCookie())
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('new-inv-id');
    expect(InvSvc.createInvoiceWithStockDeduction).toHaveBeenCalled();
  });

  test('returns 422 on insufficient stock error', async () => {
    InvSvc.createInvoiceWithStockDeduction.mockRejectedValueOnce(
      new Error('Insufficient stock for product prod-1. Available: 5, Requested: 10')
    );

    const res = await request(app)
      .post('/api/invoices')
      .set('Cookie', authCookie())
      .send(validBody);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('STOCK_ERROR');
  });
});

describe('PATCH /api/invoices/:id/status', () => {
  beforeEach(() => {
    const { stmts } = require('../db');
    stmts.getUserById = { get: jest.fn().mockResolvedValue({ id: 'user-1', org_id: 'org-1', is_active: true, role: 'owner' }) };
  });

  test('rejects invalid status values', async () => {
    const res = await request(app)
      .patch('/api/invoices/inv-1/status')
      .set('Cookie', authCookie())
      .send({ status: 'hacked' });
    expect(res.status).toBe(400);
  });

  test('accepts valid status', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const res = await request(app)
      .patch('/api/invoices/inv-1/status')
      .set('Cookie', authCookie())
      .send({ status: 'sent' });
    expect(res.status).toBe(200);
  });
});

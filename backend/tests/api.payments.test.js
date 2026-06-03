// backend/tests/api.payments.test.js
'use strict';
process.env.JWT_SECRET    = 'test-secret-for-jest-only';
process.env.NODE_ENV      = 'test';
process.env.COOKIE_SECRET = 'test-cookie-secret';

const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../db', () => ({
  db: { query: jest.fn(), connect: jest.fn() },
  stmts: {},
}));
jest.mock('../services/paymentAllocationService');

const { db } = require('../db');
const PaySvc  = require('../services/paymentAllocationService');
const app     = require('../server');

function authCookie(userId = 'user-1', orgId = 'org-1') {
  const token = jwt.sign({ uid: userId, oid: orgId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `bf_session=${token}`;
}

function mockUser() {
  const { stmts } = require('../db');
  stmts.getUserById = { get: jest.fn().mockResolvedValue({ id: 'user-1', org_id: 'org-1', is_active: true, role: 'owner' }) };
}

beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(()  => { jest.restoreAllMocks(); });

describe('POST /api/payments', () => {
  beforeEach(() => { mockUser(); PaySvc.createPaymentWithAllocation.mockReset(); });

  test('returns 400 when amount missing', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', authCookie())
      .send({ date: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when date missing', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', authCookie())
      .send({ amount: 1000 });
    expect(res.status).toBe(400);
  });

  test('calls PaymentAllocationService with correct args', async () => {
    PaySvc.createPaymentWithAllocation.mockResolvedValueOnce({
      paymentId: 'pay-1', allocatedAmount: 1000, unappliedAmount: 0,
    });

    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', authCookie())
      .send({
        amount: 1000, date: '2026-01-01', method: 'bank_transfer',
        invoice_id: 'inv-1', customer_id: 'cust-1',
      });

    expect(res.status).toBe(200);
    expect(PaySvc.createPaymentWithAllocation).toHaveBeenCalledWith(
      'org-1',
      'cust-1',
      1000,
      '2026-01-01',
      'bank_transfer',
      { 'inv-1': { amount: 1000, notes: '' } },
      expect.objectContaining({ created_by: 'user-1' })
    );
  });

  test('returns 422 on overpayment error', async () => {
    PaySvc.createPaymentWithAllocation.mockRejectedValueOnce(
      new Error('Overpayment to invoice inv-1')
    );
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', authCookie())
      .send({ amount: 9999, date: '2026-01-01', invoice_id: 'inv-1' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OVERPAYMENT_ERROR');
  });

  test('rejects zero amount', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Cookie', authCookie())
      .send({ amount: 0, date: '2026-01-01' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/payments/:id/reverse', () => {
  beforeEach(() => {
    mockUser();
    PaySvc.reversePayment = jest.fn();
  });

  test('calls reversePayment service', async () => {
    PaySvc.reversePayment.mockResolvedValueOnce({ reversed: true, amount: 1000 });
    const res = await request(app)
      .post('/api/payments/pay-1/reverse')
      .set('Cookie', authCookie());
    expect(res.status).toBe(200);
    expect(PaySvc.reversePayment).toHaveBeenCalledWith('org-1', 'pay-1');
  });
});

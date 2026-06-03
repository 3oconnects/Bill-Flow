// backend/tests/gst.test.js
'use strict';
const GSTCalculationService = require('../services/gstCalculationService');

describe('GSTCalculationService — calculateInvoiceGST', () => {
  const items100k = [{ amount: 100000, discount: 0 }];

  // ── CGST / SGST (intra-state) ──────────────────────────────────────────────
  test('intra-state 18%: splits into CGST 9% + SGST 9%', () => {
    const r = GSTCalculationService.calculateInvoiceGST(items100k, 'MH', 'MH', 18);
    expect(r.cgst).toBe(9000);
    expect(r.sgst).toBe(9000);
    expect(r.igst).toBe(0);
    expect(r.total_tax).toBe(18000);
    expect(r.gst_type).toBe('intra');
  });

  test('intra-state 5%: CGST 2.5% + SGST 2.5%', () => {
    const r = GSTCalculationService.calculateInvoiceGST(items100k, 'KA', 'KA', 5);
    expect(r.cgst).toBe(2500);
    expect(r.sgst).toBe(2500);
    expect(r.igst).toBe(0);
    expect(r.total_tax).toBe(5000);
  });

  test('intra-state 28%: CGST 14% + SGST 14%', () => {
    const r = GSTCalculationService.calculateInvoiceGST(items100k, 'DL', 'DL', 28);
    expect(r.cgst).toBe(14000);
    expect(r.sgst).toBe(14000);
    expect(r.igst).toBe(0);
    expect(r.total_tax).toBe(28000);
  });

  // ── IGST (inter-state) ─────────────────────────────────────────────────────
  test('inter-state 18%: full IGST, zero CGST/SGST', () => {
    const r = GSTCalculationService.calculateInvoiceGST(items100k, 'MH', 'KA', 18);
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
    expect(r.igst).toBe(18000);
    expect(r.total_tax).toBe(18000);
    expect(r.gst_type).toBe('igst');
  });

  test('inter-state 12%: IGST = 12%', () => {
    const r = GSTCalculationService.calculateInvoiceGST(items100k, 'DL', 'GJ', 12);
    expect(r.igst).toBe(12000);
    expect(r.cgst).toBe(0);
    expect(r.total_tax).toBe(12000);
  });

  // ── Multiple line items ────────────────────────────────────────────────────
  test('multiple items summed correctly', () => {
    const multiItems = [
      { amount: 50000, discount: 0 },
      { amount: 30000, discount: 0 },
      { amount: 20000, discount: 0 },
    ];
    const r = GSTCalculationService.calculateInvoiceGST(multiItems, 'MH', 'MH', 18);
    expect(r.cgst).toBe(9000);
    expect(r.sgst).toBe(9000);
    expect(r.total_tax).toBe(18000);
  });

  // ── Zero rate ──────────────────────────────────────────────────────────────
  test('0% GST: all zeros', () => {
    const r = GSTCalculationService.calculateInvoiceGST(items100k, 'MH', 'MH', 0);
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
    expect(r.igst).toBe(0);
    expect(r.total_tax).toBe(0);
  });

  // ── Place of supply ────────────────────────────────────────────────────────
  test('getPlaceOfSupply: same state → intra', () => {
    const p = GSTCalculationService.getPlaceOfSupply('MH', 'MH', null);
    expect(p.isIntra).toBe(true);
    expect(p.state).toBe('MH');
  });

  test('getPlaceOfSupply: different states → inter', () => {
    const p = GSTCalculationService.getPlaceOfSupply('MH', 'KA', null);
    expect(p.isIntra).toBe(false);
  });

  // ── Rounding ───────────────────────────────────────────────────────────────
  test('rounding: no more than 2 decimal places', () => {
    const r = GSTCalculationService.calculateInvoiceGST(
      [{ amount: 333.33, discount: 0 }], 'MH', 'MH', 18
    );
    expect(r.cgst.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    expect(r.total_tax).toBe(parseFloat((333.33 * 0.18).toFixed(2)));
  });

  // ── Discount ───────────────────────────────────────────────────────────────
  test('discount reduces taxable amount', () => {
    const r = GSTCalculationService.calculateInvoiceGST(
      [{ amount: 100000, discount: 10000 }], 'MH', 'MH', 18
    );
    expect(r.total_tax).toBe(16200); // (100000 - 10000) * 18 / 100
  });
});

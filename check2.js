const db = require('./backend/db/conn');
const stmts = require('./backend/db/statements/purchasing');
const { v4: uuid } = require('uuid');

async function check() {
  try {
    const id = uuid();
    const orgId = 'org-test'; // fake
    const po_number = 'PO-TEST';
    const vendor_id = 'test';
    const vendor_name = 'test';
    const quotation_ref = null;
    const status = 'draft';
    const expected_delivery_date = null;
    const subtotal = 0;
    const discount_pct = 0;
    const discount_amount = 0;
    const tax = 0;
    const total = 0;
    const currency = 'INR';
    const notes = '';
    const terms = '';
    const items = '[]';
    const created_by = 'user-test';

    await stmts.insertPurchaseOrder.run(
      id, orgId, po_number, vendor_id, vendor_name,
      quotation_ref, status, expected_delivery_date,
      subtotal, discount_pct, discount_amount, tax,
      total, currency, notes, terms,
      items, created_by
    );
    console.log('Success');
  } catch (e) {
    console.error('Error inserting:', e);
  } finally {
    process.exit(0);
  }
}
check();

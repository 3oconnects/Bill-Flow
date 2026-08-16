const db = require('./backend/db/conn');
const InventoryTransactionService = require('./backend/services/inventoryTransactionService');

async function seed() {
  try {
    const pId = 'ac2b0fe5-456f-407d-9e59-54fbd421f2fd'; // Laptop

    const prodRes = await db.query('SELECT org_id FROM products WHERE id = $1', [pId]);
    const orgId = prodRes.rows[0].org_id;

    // Invoice 1
    await InventoryTransactionService.createInvoiceWithStockDeduction(orgId, {
      number: 'INV-TEST-901',
      customer_name: 'Tech Corp',
      status: 'paid',
      subtotal: 5000,
      tax: 900,
      total: 5900,
      paid_amount: 5900,
      due_date: new Date().toISOString().split('T')[0]
    }, [{
      product_id: pId,
      description: 'Laptop',
      quantity: 5,
      unit_price: 1000,
      tax_rate: 18,
      tax_amount: 900,
      amount: 5900
    }]);

    // Invoice 2
    await InventoryTransactionService.createInvoiceWithStockDeduction(orgId, {
      number: 'INV-TEST-902',
      customer_name: 'Global Industries',
      status: 'sent',
      subtotal: 2000,
      tax: 360,
      total: 2360,
      paid_amount: 0,
      due_date: new Date().toISOString().split('T')[0]
    }, [{
      product_id: pId,
      description: 'Laptop',
      quantity: 2,
      unit_price: 1000,
      tax_rate: 18,
      tax_amount: 360,
      amount: 2360
    }]);

    console.log('Seeded mock sales successfully.');
  } catch (err) {
    console.error('Seed Error:', err);
  } finally {
    process.exit(0);
  }
}

seed();

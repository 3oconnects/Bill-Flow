const db = require('./backend/db/conn');

async function check() {
  try {
    const sku = 'SKU-PROD-0004';
    const id = 'ac2b0fe5-456f-407d-9e59-54fbd421f2fd';
    
    const queries = [
      { name: 'invoice_items', q: `SELECT * FROM invoice_items WHERE sku = $1 OR product_id = $2` },
      { name: 'purchase_order_items', q: `SELECT * FROM purchase_order_items WHERE sku = $1` },
      { name: 'goods_receipt_items', q: `SELECT * FROM goods_receipt_items WHERE sku = $1 OR product_id = $2` },
      { name: 'quotations', q: `SELECT * FROM quotations WHERE items::text LIKE $3` },
      { name: 'ap_invoice_items', q: `SELECT * FROM ap_invoice_items WHERE product_id = $2` }
    ];

    for (const {name, q} of queries) {
      try {
        const res = await db.query(q, [sku, id, `%${id}%`]);
        console.log(`${name}: ${res.rowCount} rows`);
      } catch (err) {
        console.error(`Error on ${name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();

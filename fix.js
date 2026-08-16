const db = require('./backend/db/conn');
async function run() {
  try {
    await db.query(`ALTER TABLE blanket_agreements ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'`);
    console.log('Columns added successfully');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();

const db = require('./backend/db/conn');
async function run() {
  try {
    await db.query(`DROP TABLE IF EXISTS blanket_agreements CASCADE`);
    await db.query(`DROP TABLE IF EXISTS purchase_requests CASCADE`);
    console.log('Tables dropped');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();

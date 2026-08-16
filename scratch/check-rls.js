const db = require('../backend/db/conn');
async function run() {
  const c = await db.pool.connect();
  try {
    const { rows } = await c.query("SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'customers'");
    console.log('RLS Enabled:', rows[0].relrowsecurity);
    console.log('RLS Forced:', rows[0].relforcerowsecurity);
  } finally {
    c.release();
    process.exit(0);
  }
}
run();

const db = require('../backend/db/conn');

async function testRls() {
  const client = await db.pool.connect();
  try {
    console.log('Testing cross-tenant isolation...');

    // 1. Get two orgs
    const { rows: orgs } = await client.query('SELECT id, name FROM organizations LIMIT 2');
    if (orgs.length < 2) {
      console.log('Not enough organizations to test RLS. Found:', orgs.length);
      return;
    }
    const org1 = orgs[0];
    const org2 = orgs[1];
    
    console.log(`Org 1: ${org1.name} (${org1.id})`);
    console.log(`Org 2: ${org2.name} (${org2.id})`);

    // 2. Insert a customer for Org 1
    await client.query('BEGIN');
    await db.setOrgContext(client, org1.id);
    const testId = 'cust_test_' + Date.now();
    await client.query(`
      INSERT INTO customers (id, org_id, name)
      VALUES ($1, $2, 'RLS Test Customer')
    `, [testId, org1.id]);
    await client.query('COMMIT');
    console.log(`Inserted customer for Org 1`);

    // 3. Query as Org 1
    await client.query('BEGIN');
    await db.setOrgContext(client, org1.id);
    const res1 = await client.query('SELECT id, name FROM customers WHERE id = $1', [testId]);
    console.log(`Query as Org 1 found customer? ${res1.rows.length === 1 ? 'Yes (Pass)' : 'No (Fail)'}`);
    await client.query('COMMIT');

    // 4. Query as Org 2
    await client.query('BEGIN');
    await db.setOrgContext(client, org2.id);
    const res2 = await client.query('SELECT id, name FROM customers WHERE id = $1', [testId]);
    console.log(`Query as Org 2 found customer? ${res2.rows.length === 0 ? 'No (Pass)' : 'Yes (Fail)'}`);
    await client.query('COMMIT');

    // 5. Query without Org context (superadmin/bypassed logic, but here it should return nothing due to RLS, unless bypassrlt is enabled on the role)
    await client.query('BEGIN');
    // Don't set context!
    // But since RLS is FORCE ROW LEVEL SECURITY, and we are not postgres superuser (or maybe we are), let's see:
    const res3 = await client.query('SELECT id, name FROM customers WHERE id = $1', [testId]);
    console.log(`Query with no org context found customer? ${res3.rows.length === 0 ? 'No (Pass)' : 'Yes (Warning: Are we superuser?)'}`);
    await client.query('COMMIT');

    // Cleanup
    await client.query('BEGIN');
    await db.setOrgContext(client, org1.id);
    await client.query('DELETE FROM customers WHERE id = $1', [testId]);
    await client.query('COMMIT');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

testRls();

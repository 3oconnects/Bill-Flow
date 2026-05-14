require('dotenv').config();
const db = require('../backend/db/conn');

async function checkUsers() {
  try {
    const result = await db.query('SELECT name, email FROM users');
    console.log('Existing users:', result.rows);
  } catch (err) {
    console.error('Error checking users:', err);
  } finally {
    process.exit(0);
  }
}

checkUsers();

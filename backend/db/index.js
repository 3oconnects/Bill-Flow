// backend/db/index.js
const db = require('./conn');
const { initSchema } = require('./schema');
const authStmts = require('./statements/auth');
const salesStmts = require('./statements/sales');
const inventoryStmts = require('./statements/inventory');
const reportStmts = require('./statements/reports');

// Schema is now managed via migrations (node backend/db/migrate.js)
// We don't need to run initSchema on every startup.

const stmts = {
  ...authStmts,
  ...salesStmts,
  ...inventoryStmts,
  ...reportStmts
};

// Clean expired sessions periodically
setInterval(async () => {
  try {
    await stmts.cleanSessions.run();
  } catch (err) {
    console.error('Error cleaning sessions:', err);
  }
}, 60 * 60 * 1000);

module.exports = { db, stmts };

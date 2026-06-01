// backend/db/index.js
const db = require('./conn');
const { initSchema } = require('./schema');
const authStmts = require('./statements/auth');
const salesStmts = require('./statements/sales');
const inventoryStmts = require('./statements/inventory');
const reportStmts = require('./statements/reports');
const goodsReturnsStmts = require('./statements/goodsReturns');
const apStmts           = require('./statements/ap');

const stmts = {
  ...authStmts,
  ...salesStmts,
  ...inventoryStmts,
  ...reportStmts,
  ...goodsReturnsStmts,
  ...apStmts,
};

setInterval(async () => {
  try {
    await stmts.cleanSessions.run();
  } catch (err) {
    console.error('Error cleaning sessions:', err);
  }
}, 60 * 60 * 1000);

module.exports = { db, stmts };

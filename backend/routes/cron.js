// backend/routes/cron.js
'use strict';
const express = require('express');
const router = express.Router();
const cronService = require('../services/cronService');

// Auth middleware for cron routes
function cronAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.error('[Cron] CRON_SECRET is not set in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

router.use(cronAuth);

router.get('/recurring', async (req, res) => {
  try {
    const result = await cronService.processRecurringInvoices();
    res.json(result);
  } catch (err) {
    console.error('[Cron] Error processing recurring invoices:', err);
    res.status(500).json({ error: 'Failed to process recurring invoices' });
  }
});

router.get('/aging', async (req, res) => {
  try {
    const result = await cronService.markOverdueInvoices();
    res.json(result);
  } catch (err) {
    console.error('[Cron] Error marking overdue invoices:', err);
    res.status(500).json({ error: 'Failed to mark overdue invoices' });
  }
});

router.get('/refresh-views', async (req, res) => {
  try {
    const result = await cronService.refreshViews();
    res.json(result);
  } catch (err) {
    console.error('[Cron] Error refreshing materialized views:', err);
    res.status(500).json({ error: 'Failed to refresh views' });
  }
});

module.exports = router;

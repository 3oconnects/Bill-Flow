// backend/server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const routes = require('./routes');
const { sendError } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API Routes
app.use('/api', routes);

// 404 Handler
app.use('/api/*', (req, res) => {
  sendError(res, 'Route not found', 'NOT_FOUND', 404);
});

// Default to index.html for SPAs (if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// For traditional server use
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 BillFlow Pro Backend running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;

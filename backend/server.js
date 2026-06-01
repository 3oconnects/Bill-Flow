// backend/server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { sendError } = require('./utils/response');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api', routes);

app.use('/api/*', (req, res) => {
  sendError(res, 'Route not found', 'NOT_FOUND', 404);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found. Frontend runs on port 5174.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('BillFlow Pro Backend on http://localhost:' + PORT);
  });
}

module.exports = app;

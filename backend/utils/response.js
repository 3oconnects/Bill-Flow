// backend/utils/response.js
const { v4: uuid } = require('uuid');
const VERSION = '1.0.0';

const sendSuccess = (res, data, meta = {}) => {
  res.json({
    success: true,
    data,
    meta: {
      requestId: uuid(),
      timestamp: new Date().toISOString(),
      version: VERSION,
      ...meta
    }
  });
};

const sendError = (res, message, code = 'INTERNAL_ERROR', status = 500, details = []) => {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
      requestId: uuid()
    }
  });
};

module.exports = { sendSuccess, sendError };

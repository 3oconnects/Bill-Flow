// backend/utils/response.js
'use strict';
const { v4: uuid } = require('uuid');
const VERSION = '1.0.0';

function sendSuccess(res, data, meta) {
  meta = meta || {};
  res.json({
    success: true,
    data: data,
    meta: Object.assign({ requestId: uuid(), timestamp: new Date().toISOString(), version: VERSION }, meta),
  });
}

function sendError(res, message, code, status, details) {
  code    = code    || 'INTERNAL_ERROR';
  status  = status  || 500;
  details = details || [];
  res.status(status).json({
    success: false,
    error: { code: code, message: message, details: details, requestId: uuid() },
  });
}

module.exports = { sendSuccess, sendError };

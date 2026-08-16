// backend/utils/logger.js
// Structured logger — uses Winston when available, falls back to console
let winston = null;
try { winston = require('winston'); } catch {}

function makeWinstonLogger() {
  if (!winston) return null;
  return winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.colorize({ all: true })
    ),
    defaultMeta: { service: 'ozofibooks-api' },
    transports: [new winston.transports.Console()],
  });
}

const wlogger = makeWinstonLogger();

const logger = {
  info:  (msg, meta = {}) => wlogger ? wlogger.info(msg, meta)  : console.log('[INFO]',  msg, meta),
  warn:  (msg, meta = {}) => wlogger ? wlogger.warn(msg, meta)  : console.warn('[WARN]',  msg, meta),
  error: (msg, meta = {}) => wlogger ? wlogger.error(msg, meta) : console.error('[ERROR]', msg, meta),
  debug: (msg, meta = {}) => wlogger ? wlogger.debug(msg, meta) : (process.env.NODE_ENV !== 'production' && console.debug('[DEBUG]', msg, meta)),
};

module.exports = logger;

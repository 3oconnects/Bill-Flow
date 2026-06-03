// backend/workers/queues.js
// Guards queue creation behind REDIS_URL so the server runs fine in dev without Redis.

const REDIS_URL = process.env.REDIS_URL;
const REDIS_ENABLED = !!REDIS_URL;

// No-op stub — safe to call .add() on when Redis isn't configured
const noop = async () => {};
const makeStub = (name) => ({
  name,
  add: noop,
  process: noop,
  on: noop,
  close: noop,
  isStub: true,
});

let recurringQueue, emailQueue, mvRefreshQueue, reportQueue;

if (REDIS_ENABLED) {
  const Bull = require('bull');
  const queueOpts = {
    redis: REDIS_URL,
    defaultJobOptions: {
      attempts:         3,
      backoff:          { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail:     50,
    },
  };

  recurringQueue = new Bull('recurring-invoices', queueOpts);
  emailQueue     = new Bull('email-delivery',     queueOpts);
  mvRefreshQueue = new Bull('mv-refresh',         queueOpts);
  reportQueue    = new Bull('report-generation',  queueOpts);

  [recurringQueue, emailQueue, mvRefreshQueue, reportQueue].forEach(q => {
    q.on('error',   err => console.error(`[Queue:${q.name}] Error:`, err.message));
    q.on('failed',  (job, err) => console.error(`[Queue:${q.name}] Job ${job.id} failed:`, err.message));
    q.on('stalled', job => console.warn(`[Queue:${q.name}] Job ${job.id} stalled`));
  });

  console.log('[Queues] Bull queues connected to Redis:', REDIS_URL);
} else {
  console.warn('[Queues] REDIS_URL not set — queues running as no-ops (dev mode). Set REDIS_URL to enable background jobs.');
  recurringQueue = makeStub('recurring-invoices');
  emailQueue     = makeStub('email-delivery');
  mvRefreshQueue = makeStub('mv-refresh');
  reportQueue    = makeStub('report-generation');
}

module.exports = { recurringQueue, emailQueue, mvRefreshQueue, reportQueue, REDIS_ENABLED };


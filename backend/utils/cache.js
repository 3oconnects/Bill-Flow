// backend/utils/cache.js
// Redis cache helper — gracefully degrades to no-op when Redis unavailable
let redis = null;
let redisAvailable = false;

function getRedis() {
  if (redis) return redis;
  try {
    const Redis = require('redis');
    redis = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redis.on('error', (err) => {
      if (redisAvailable) {
        console.warn('[Cache] Redis disconnected:', err.message);
        redisAvailable = false;
      }
    });
    redis.on('connect', () => {
      redisAvailable = true;
      console.log('[Cache] Redis connected');
    });
    redis.connect().catch(err => {
      console.warn('[Cache] Redis not available — caching disabled:', err.message);
    });
  } catch {
    console.warn('[Cache] redis package not installed — caching disabled');
    redis = null;
  }
  return redis;
}

async function get(key) {
  try {
    const r = getRedis();
    if (!r || !redisAvailable) return null;
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function set(key, value, ttlSeconds = 300) {
  try {
    const r = getRedis();
    if (!r || !redisAvailable) return;
    await r.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch { /* non-critical */ }
}

async function del(key) {
  try {
    const r = getRedis();
    if (!r || !redisAvailable) return;
    await r.del(key);
  } catch { /* non-critical */ }
}

async function delPattern(pattern) {
  try {
    const r = getRedis();
    if (!r || !redisAvailable) return;
    const keys = await r.keys(pattern);
    if (keys.length) await r.del(keys);
  } catch { /* non-critical */ }
}

module.exports = { get, set, del, delPattern };

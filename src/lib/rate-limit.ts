// Simple in-memory rate limiter for upload endpoints
// For production with multiple workers, use Redis

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

const MAX = parseInt(process.env.RATE_LIMIT_MAX_UPLOADS ?? "20", 10);
const WINDOW_MS =
  parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60", 10) * 1000;

// Clean up expired records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  let record = store.get(ip);

  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, record);
  }

  if (record.count >= MAX) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return {
    allowed: true,
    remaining: MAX - record.count,
    resetAt: record.resetAt,
  };
}

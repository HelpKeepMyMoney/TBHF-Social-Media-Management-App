/**
 * Simple in-process rate limiter (per-user, per-minute).
 * For production at scale, replace with Redis-backed solution (e.g. Upstash).
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute

export function checkRateLimit(
  userId: string,
  limitPerMinute = Number(process.env.AI_RATE_LIMIT_RPM ?? 20),
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: limitPerMinute - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= limitPerMinute) {
    const resetIn = WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - entry.count,
    resetIn: WINDOW_MS - (now - entry.windowStart),
  };
}

// Periodically prune old entries to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
}, WINDOW_MS * 5);

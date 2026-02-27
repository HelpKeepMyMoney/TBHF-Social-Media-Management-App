/**
 * Rate limiter — per-user, per-minute.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory store otherwise (single-instance only).
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000; // 1 minute

// ─── In-memory (fallback) ────────────────────────────────────────────────────

function checkMemoryRateLimit(
  key: string,
  limitPerMinute: number,
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    memoryStore.set(key, { count: 1, windowStart: now });
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

// ─── Upstash Redis (distributed) ──────────────────────────────────────────────

async function checkUpstashRateLimit(
  key: string,
  limitPerMinute: number,
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({
    url:  process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.pexpire(windowKey, WINDOW_MS);
  }

  const allowed = count <= limitPerMinute;
  const remaining = Math.max(0, limitPerMinute - count);
  const resetIn = WINDOW_MS - (Date.now() % WINDOW_MS);

  return { allowed, remaining, resetIn };
}

// ─── Unified API ──────────────────────────────────────────────────────────────

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

export async function checkRateLimitAsync(
  key: string,
  limitPerMinute = Number(process.env.AI_RATE_LIMIT_RPM ?? 20),
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (hasUpstash) {
    return checkUpstashRateLimit(key, limitPerMinute);
  }
  return Promise.resolve(checkMemoryRateLimit(key, limitPerMinute));
}

/**
 * Synchronous rate limit check. Use for non-async contexts.
 * When using Upstash, prefer checkRateLimitAsync in API routes.
 */
export function checkRateLimit(
  key: string,
  limitPerMinute = Number(process.env.AI_RATE_LIMIT_RPM ?? 20),
): { allowed: boolean; remaining: number; resetIn: number } {
  if (hasUpstash) {
    // Upstash requires async — we can't block. For sync callers, use memory as fallback
    // or the caller should use checkRateLimitAsync. To minimize breaking changes,
    // we'll keep sync behavior but log that Redis isn't used in sync path.
    return checkMemoryRateLimit(key, limitPerMinute);
  }
  return checkMemoryRateLimit(key, limitPerMinute);
}

// Periodically prune old in-memory entries
setInterval(() => {
  const now = Date.now();
  Array.from(memoryStore.entries()).forEach(([k, entry]) => {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      memoryStore.delete(k);
    }
  });
}, WINDOW_MS * 5);

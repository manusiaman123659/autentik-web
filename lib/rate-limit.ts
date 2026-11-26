interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

const CLEANUP_INTERVAL_MS = 60_000;
export const MAX_RATE_LIMIT_ENTRIES = 10_000;

const store = new Map<string, RateLimitEntry>();

function pruneExpired(now: number): void {
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}

// Cleanup expired entries setiap 60 detik; unref agar tidak menahan exit proses Node/test.
const cleanupTimer = setInterval(() => {
  pruneExpired(Date.now());
}, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer === "object" && "unref" in cleanupTimer && typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

/** Reset internal in-memory store (hanya untuk unit test). */
export function resetRateLimitStore(): void {
  store.clear();
}

/**
 * Cek rate limit in-memory untuk key tertentu (fixed-window counter dengan batas ukuran Map).
 * @param key - Unique identifier (mis. IP, atau IP+endpoint)
 * @param limit - Maksimal request dalam window
 * @param windowMs - Durasi window dalam milidetik
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    if (store.size >= MAX_RATE_LIMIT_ENTRIES) {
      pruneExpired(now);
      if (store.size >= MAX_RATE_LIMIT_ENTRIES) {
        const oldestKey = store.keys().next().value;
        if (oldestKey !== undefined) store.delete(oldestKey);
      }
    }
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: Math.max(0, limit - entry.count) };
}

/**
 * Distributed rate limit via Upstash Redis REST bila UPSTASH_REDIS_REST_URL dan
 * UPSTASH_REDIS_REST_TOKEN tersedia; fallback aman ke in-memory checkRateLimit.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!restUrl || !restToken) {
    return checkRateLimit(key, limit, windowMs);
  }

  try {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const redisKey = `rl:${key}`;
    const response = await fetch(`${restUrl.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSeconds, "NX"],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      return checkRateLimit(key, limit, windowMs);
    }

    const payload = (await response.json()) as { result?: number }[];
    const count = Number(payload?.[0]?.result);
    if (!Number.isFinite(count) || count < 1) {
      return checkRateLimit(key, limit, windowMs);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
    };
  } catch {
    return checkRateLimit(key, limit, windowMs);
  }
}

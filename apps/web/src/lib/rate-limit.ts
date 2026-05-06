// Simple in-memory rate limiter using a sliding window counter.
// Suitable for single-instance deployments at this scale.

export class RateLimitExceededError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, WindowEntry>();

// Periodically prune stale entries to prevent unbounded memory growth
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // Remove entries whose window is well past (allow 2x window slack)
      if (now - entry.windowStart > 7_200_000 /* 2h */) {
        store.delete(key);
      }
    }
  },
  3_600_000, // run every hour
);

/**
 * Checks whether `key` has exceeded `max` requests within `windowMs` milliseconds.
 * Throws {@link RateLimitExceededError} if the limit is exceeded.
 * Uses a fixed window per `windowMs` interval.
 */
export function checkRateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    // Start a fresh window
    store.set(key, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= max) {
    throw new RateLimitExceededError(
      `Rate limit exceeded for key "${key}": ${max} requests per ${windowMs}ms`,
    );
  }

  existing.count += 1;
}

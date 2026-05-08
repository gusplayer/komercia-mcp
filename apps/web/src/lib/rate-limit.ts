import { getSql } from './db.js';

export class RateLimitExceededError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Postgres-backed sliding-window rate limiter. Survives across serverless
 * invocations (Vercel) and shared between web instances. Uses a single
 * `INSERT ... ON CONFLICT` to atomically increment within the current window
 * or start a new one.
 *
 * The query plan is fast enough (PK lookup) to add < 2ms to the login path.
 * Stale rows are pruned best-effort by `cleanupExpiredRateLimits()`.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<void> {
  const sql = getSql();
  const windowSeconds = Math.ceil(windowMs / 1000);

  const rows = await sql<{ count: number; expired: boolean }[]>`
    INSERT INTO rate_limits (key, count, window_start, expires_at)
    VALUES (
      ${key},
      1,
      now(),
      now() + (${windowSeconds} || ' seconds')::interval
    )
    ON CONFLICT (key) DO UPDATE
    SET
      count = CASE
        WHEN rate_limits.expires_at < now() THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.expires_at < now() THEN now()
        ELSE rate_limits.window_start
      END,
      expires_at = CASE
        WHEN rate_limits.expires_at < now()
          THEN now() + (${windowSeconds} || ' seconds')::interval
        ELSE rate_limits.expires_at
      END
    RETURNING count, (window_start = now()) AS expired
  `;

  const row = rows[0];
  if (row && row.count > max) {
    throw new RateLimitExceededError(
      `Rate limit exceeded for key "${key}": ${String(max)} requests per ${String(windowMs)}ms`,
    );
  }
}

/**
 * Best-effort cleanup. Safe to call from any boot path; errors are swallowed.
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    const sql = getSql();
    await sql`DELETE FROM rate_limits WHERE expires_at < now() - interval '1 hour'`;
  } catch {
    /* intentional: best-effort */
  }
}

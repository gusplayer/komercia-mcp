import crypto from 'node:crypto';

/**
 * Generates a cryptographically random CSRF token (64 hex chars).
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates that the cookie value and header value match (double-submit cookie pattern).
 * Both must be non-null, non-empty, and identical.
 */
export function validateCsrfToken(
  cookieValue: string | null | undefined,
  headerValue: string | null | undefined,
): boolean {
  if (!cookieValue || !headerValue) return false;
  if (cookieValue.length !== headerValue.length) return false;

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(cookieValue), Buffer.from(headerValue));
  } catch {
    return false;
  }
}

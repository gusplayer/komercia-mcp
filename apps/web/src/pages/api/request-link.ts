import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrfToken } from '../../lib/csrf.js';
import { getConfig } from '../../lib/env.js';
import { sendMagicLinkEmail } from '../../lib/email.js';
import { generateMagicLinkCode, storeMagicLinkCode } from '../../lib/magic-link.js';
import { checkRateLimit, RateLimitExceededError } from '../../lib/rate-limit.js';
import { MAGIC_LINK_EXPIRY_SECONDS } from '@komercia-mcp/shared';

const bodySchema = z.object({
  email: z.string().email(),
});

export const POST: APIRoute = async ({ request }) => {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parseResult = bodySchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { email } = parseResult.data;

  // Extract client IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Rate limit by IP (5 requests per hour)
  try {
    checkRateLimit(`ip:${ip}`, 5, 3_600_000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '3600',
        },
      });
    }
    throw err;
  }

  // Rate limit by email (3 requests per hour)
  try {
    checkRateLimit(`email:${email}`, 3, 3_600_000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '3600',
        },
      });
    }
    throw err;
  }

  // Validate CSRF token (double-submit cookie pattern)
  const csrfHeader = request.headers.get('X-CSRF-Token');
  const cookieHeader = request.headers.get('cookie') ?? '';
  const csrfCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('csrf_token='))
    ?.split('=')[1] ?? null;

  if (!validateCsrfToken(csrfCookie, csrfHeader)) {
    return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: validate email against Komercia API before issuing link

  const config = getConfig();

  try {
    const { raw, hash } = await generateMagicLinkCode();

    await storeMagicLinkCode({
      codeHash: hash,
      email,
      ipAddress: ip,
      expirySeconds: MAGIC_LINK_EXPIRY_SECONDS,
    });

    const magicLink = `${config.WEB_BASE_URL}/token?code=${raw}`;
    await sendMagicLinkEmail({ to: email, magicLink });
  } catch (err) {
    // Log internally but return generic success to prevent email enumeration
    console.error('[request-link] Error generating/sending magic link:', err);
  }

  // Always return ok=true — prevents email enumeration
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

import { jwtVerify } from 'jose';
import { z } from 'zod';

import { validateCsrfToken } from '../../../lib/csrf.js';
import { getConfig } from '../../../lib/env.js';
import { revokeSession } from '../../../lib/session.js';

import type { APIRoute } from 'astro';

export const prerender = false;

const bodySchema = z.object({
  token: z.string().min(1),
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/sessions/revoke
 *
 * Body: { token: <our-issued-jwt> }
 *
 * Verifies the JWT (so anyone with the token can revoke their own session,
 * matching the same trust model as Claude.ai using the token directly), then
 * marks `komercia_sessions.revoked_at = now()`. Subsequent tool calls will
 * receive 401 from the MCP server.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'token is required' }, 400);
  }

  // CSRF (double-submit cookie pattern, same as login).
  const csrfHeader = request.headers.get('X-CSRF-Token');
  const cookieHeader = request.headers.get('cookie') ?? '';
  const csrfCookie =
    cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('csrf_token='))?.split('=')[1] ?? null;
  if (!validateCsrfToken(csrfCookie, csrfHeader)) {
    return jsonResponse({ error: 'Invalid CSRF token' }, 403);
  }

  const config = getConfig();
  const secret = new TextEncoder().encode(config.jwtSecret);

  let jti: string;
  let email: string;
  try {
    const { payload } = await jwtVerify(parsed.data.token, secret);
    if (typeof payload.jti !== 'string') {
      return jsonResponse({ error: 'Token missing jti claim' }, 400);
    }
    if (typeof payload['email'] !== 'string') {
      return jsonResponse({ error: 'Token missing email claim' }, 400);
    }
    jti = payload.jti;
    email = payload['email'];
  } catch {
    return jsonResponse({ error: 'Invalid or expired token' }, 401);
  }

  const ok = await revokeSession(jti, email);
  return jsonResponse({ revoked: ok }, 200);
};

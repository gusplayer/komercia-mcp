import crypto from 'node:crypto';

import { KomerciaClient } from '@komercia-mcp/komercia-client';
import { JWT_EXPIRY_SECONDS } from '@komercia-mcp/shared';
import { SignJWT } from 'jose';
import { z } from 'zod';


import { validateCsrfToken } from '../../lib/csrf.js';
import { getSql } from '../../lib/db.js';
import { getConfig } from '../../lib/env.js';
import { checkRateLimit, RateLimitExceededError } from '../../lib/rate-limit.js';
import { createSession } from '../../lib/session.js';

import type { APIRoute } from 'astro';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  oauth_request_id: z.string().uuid().optional(),
});

interface OauthAuthRequestRow {
  request_id: string;
  consumed_at: Date | null;
  expires_at: Date;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Structured one-line log for ops. We deliberately log only the message —
 * not the stack or full error object — to avoid accidentally writing
 * tokens, headers, or env-var values into stdout.
 */
function logSafe(event: string, err: Error): void {
   
  console.error(JSON.stringify({ event, message: err.message, ts: new Date().toISOString() }));
}

interface NodeJwtPayload {
  id: number;
  email: string;
  iat: number;
  exp: number;
}

function decodeNodeJwt(token: string): NodeJwtPayload {
  const payloadB64 = token.split('.')[1];
  if (!payloadB64) throw new Error('Malformed Node JWT');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as Partial<NodeJwtPayload>;
  if (typeof payload.id !== 'number' || typeof payload.exp !== 'number') {
    throw new Error('Node JWT missing required claims');
  }
  return payload as NodeJwtPayload;
}

function isAuthError(err: Error): boolean {
  const m = err.message.toLowerCase();
  return m.includes('401') || m.includes('unauthorized') || m.includes('invalid') || m.includes('credentials');
}

export const POST: APIRoute = async ({ request }) => {
  // 1) Body validation
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'email and password are required' }, 400);
  }
  const { email, password, oauth_request_id: oauthRequestId } = parsed.data;

  // 2) Rate limit by IP and email — Postgres-backed so it survives across
  // Vercel serverless invocations.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    await checkRateLimit(`login_ip:${ip}`, 10, 60_000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return jsonResponse({ error: 'Too many login attempts. Please wait a minute and try again.' }, 429);
    }
    throw err;
  }
  // Per-email throttle resists targeted password spraying.
  const earlyEmail = parsed.data.email.toLowerCase().trim();
  if (earlyEmail) {
    try {
      await checkRateLimit(`login_email:${earlyEmail}`, 5, 60_000);
    } catch (err) {
      if (err instanceof RateLimitExceededError) {
        return jsonResponse({ error: 'Too many login attempts for this account. Please wait a minute and try again.' }, 429);
      }
      throw err;
    }
  }

  // 3) CSRF
  const csrfHeader = request.headers.get('X-CSRF-Token');
  const cookieHeader = request.headers.get('cookie') ?? '';
  const csrfCookie =
    cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('csrf_token='))?.split('=')[1] ?? null;
  if (!validateCsrfToken(csrfCookie, csrfHeader)) {
    return jsonResponse({ error: 'Invalid CSRF token' }, 403);
  }

  // 4) Auth client + parallel login (Node + Laravel)
  const config = getConfig();
  const authClient = KomerciaClient.createForAuth({
    nodeUrl: config.komerciaNodeUrl,
    laravelUrl: config.komerciaLaravelUrl,
    laravelClientId: config.komerciaLaravelClientId,
    laravelClientSecret: config.komerciaLaravelClientSecret,
  });

  const [nodeResult, laravelResult] = await Promise.allSettled([
    authClient.auth.loginNode(email, password),
    authClient.auth.loginLaravel(email, password),
  ]);

  // Both backends are required: Node for short-lived panel JWT, Laravel for long-lived token + storeId.
  if (nodeResult.status === 'rejected') {
    const err = nodeResult.reason as Error;
    if (isAuthError(err)) return jsonResponse({ error: 'Invalid email or password' }, 401);
    // We log only the message (not the full error / stack) to avoid leaking
    // env/config details into stdout. Astro server logs are visible to the
    // hosting platform operator only.
    logSafe('login.node_failed', err);
    return jsonResponse({ error: 'Komercia service unavailable. Try again later.' }, 503);
  }
  if (laravelResult.status === 'rejected') {
    const err = laravelResult.reason as Error;
    if (isAuthError(err)) return jsonResponse({ error: 'Invalid email or password' }, 401);
    logSafe('login.laravel_failed', err);
    return jsonResponse({ error: 'Komercia service unavailable. Try again later.' }, 503);
  }

  const nodeData = nodeResult.value;
  const laravelData = laravelResult.value;
  const nodeToken = nodeData.accessToken;
  const laravelToken = laravelData.access_token;
  const laravelRefresh = laravelData.refresh_token || undefined;

  // 5) Decode Node JWT to extract merchantId and node_token_expires_at.
  // The `id` claim on the NodeJS JWT is the merchantId (e.g. 32951), NOT the storeId.
  let merchantId: string;
  let nodeTokenExpiresAt: Date;
  try {
    const payload = decodeNodeJwt(nodeToken);
    merchantId = String(payload.id);
    nodeTokenExpiresAt = new Date(payload.exp * 1000);
  } catch (err) {
    logSafe('login.jwt_decode_failed', err as Error);
    return jsonResponse({ error: 'Unexpected response from Komercia.' }, 502);
  }

  // 6) Get the real storeId from Laravel: GET /api/admin/tienda → data.id (e.g. 1559).
  let storeId: string;
  let storeName: string;
  try {
    const tienda = await authClient.auth.getMyStore(laravelToken);
    storeId = String(tienda.id);
    storeName = tienda.nombre;
  } catch (err) {
    logSafe('login.store_lookup_failed', err as Error);
    return jsonResponse({ error: 'Could not identify your Komercia store. Please try again.' }, 502);
  }

  // 7) Persist session — credentials AND tokens encrypted at rest.
  const jti = crypto.randomUUID();
  try {
    const params: Parameters<typeof createSession>[0] = {
      jti,
      email,
      password,
      merchantId,
      storeId,
      nodeToken,
      nodeTokenExpiresAt,
      laravelToken,
    };
    if (laravelRefresh !== undefined) params.laravelRefresh = laravelRefresh;
    await createSession(params);
  } catch (err) {
    logSafe('login.session_persist_failed', err as Error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }

  // 8) Sign our own JWT (HS256, 6 months). Embed the pre-generated jti so it
  // matches the DB row.
  const secretKey = new TextEncoder().encode(config.jwtSecret);
  const token = await new SignJWT({
    store_id: storeId,
    email,
    scope: 'read' as const,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(merchantId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${String(JWT_EXPIRY_SECONDS)}s`)
    .sign(secretKey);

  // 9) If this login was initiated by an OAuth authorization request from a
  // remote MCP client (e.g. Claude.ai), mint a short-lived completion ticket
  // and tell the browser where to bounce next. The ticket is consumed by
  // the MCP server's /oauth/authorize/complete endpoint, which finishes
  // the OAuth dance and redirects back to the client's redirect_uri.
  if (oauthRequestId) {
    try {
      const sql = getSql();
      const rows = await sql<OauthAuthRequestRow[]>`
        SELECT request_id, consumed_at, expires_at
        FROM oauth_auth_requests
        WHERE request_id = ${oauthRequestId}
        LIMIT 1
      `;
      const row = rows[0];
      const now = new Date();
      if (!row) {
        logSafe('login.oauth_request_invalid', new Error('not_found'));
      } else if (row.consumed_at !== null) {
        logSafe('login.oauth_request_invalid', new Error('already_consumed'));
      } else if (row.expires_at.getTime() < now.getTime()) {
        logSafe('login.oauth_request_invalid', new Error('expired'));
      } else {
        const ticket = await new SignJWT({
          scope: 'oauth.complete',
          oauth_request_id: oauthRequestId,
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setAudience('urn:komercia-mcp:oauth-completion')
          .setJti(jti)
          .setIssuedAt()
          .setExpirationTime('120s')
          .sign(secretKey);
        const redirectTo = `${config.mcpServerUrl}/oauth/authorize/complete?ticket=${encodeURIComponent(ticket)}`;
        return jsonResponse(
          { token, store_id: storeId, store_name: storeName, redirect_to: redirectTo },
          200,
        );
      }
    } catch (err) {
      // Don't fail the login — the user logged in successfully; we just
      // cannot complete the OAuth handoff. Fall through to the normal
      // manual-token response.
      logSafe('login.oauth_request_lookup_failed', err as Error);
    }
  }

  return jsonResponse({ token, store_id: storeId, store_name: storeName }, 200);
};

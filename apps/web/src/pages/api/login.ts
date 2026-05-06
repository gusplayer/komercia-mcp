import type { APIRoute } from 'astro';
import { z } from 'zod';
import crypto from 'node:crypto';
import { SignJWT } from 'jose';
import { KomerciaClient } from '@komercia-mcp/komercia-client';
import { JWT_EXPIRY_SECONDS } from '@komercia-mcp/shared';
import type { NodeLoginResponse, LaravelTokenResponse } from '@komercia-mcp/komercia-client';
import { validateCsrfToken } from '../../lib/csrf.js';
import { getConfig } from '../../lib/env.js';
import { checkRateLimit, RateLimitExceededError } from '../../lib/rate-limit.js';
import { createSession } from '../../lib/session.js';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // --- Parse body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const parseResult = bodySchema.safeParse(body);
  if (!parseResult.success) {
    return jsonResponse({ error: 'email and password are required' }, 400);
  }

  const { email, password } = parseResult.data;

  // --- Rate limit by IP ---
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    checkRateLimit(`ip:${ip}`, 10, 60_000);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return jsonResponse({ error: 'Too many login attempts. Please wait a minute and try again.' }, 429);
    }
    throw err;
  }

  // --- Validate CSRF (double-submit cookie pattern) ---
  const csrfHeader = request.headers.get('X-CSRF-Token');
  const cookieHeader = request.headers.get('cookie') ?? '';
  const csrfCookie =
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('csrf_token='))
      ?.split('=')[1] ?? null;

  if (!validateCsrfToken(csrfCookie, csrfHeader)) {
    return jsonResponse({ error: 'Invalid CSRF token' }, 403);
  }

  // --- Call Komercia backends ---
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

  // Node login is required
  if (nodeResult.status === 'rejected') {
    const err = nodeResult.reason as Error;
    // Distinguish auth failure from network/service errors
    const message = err?.message?.toLowerCase() ?? '';
    const isAuthError =
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('invalid') ||
      message.includes('credentials');

    if (isAuthError) {
      return jsonResponse({ error: 'Invalid email or password' }, 401);
    }

    console.error('[login] Komercia Node login failed:', err?.message);
    return jsonResponse({ error: 'Komercia service unavailable. Try again later.' }, 503);
  }

  const nodeData = nodeResult.value as NodeLoginResponse;
  const nodeToken = nodeData.data.token;
  const storeId = String(nodeData.data.storeId);

  // Laravel login is secondary — log failure but proceed
  let laravelToken = '';
  let laravelRefresh: string | undefined;
  if (laravelResult.status === 'fulfilled') {
    const laravelData = laravelResult.value as LaravelTokenResponse;
    laravelToken = laravelData.access_token;
    laravelRefresh = laravelData.refresh_token ?? undefined;
  } else {
    console.warn('[login] Komercia Laravel login failed (non-fatal):', (laravelResult.reason as Error)?.message);
  }

  // merchantId: Komercia Node doesn't directly expose it in the login response —
  // use storeId as the merchant identifier until a dedicated field is available.
  const merchantId = storeId;

  // --- Generate jti first so we can correlate JWT <-> DB session ---
  const jti = crypto.randomUUID();

  // --- Persist session ---
  try {
    const sessionParams = {
      jti,
      email,
      merchantId,
      storeId,
      nodeToken,
      laravelToken,
      ...(laravelRefresh !== undefined ? { laravelRefresh } : {}),
    };
    await createSession(sessionParams);
  } catch (err) {
    console.error('[login] Failed to persist session:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }

  // --- Sign JWT embedding our pre-generated jti ---
  // We use jose directly rather than signMerchantToken because signMerchantToken
  // generates its own jti internally and we need the jti to match the DB session.
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
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .sign(secretKey);

  return jsonResponse({ token }, 200);
};

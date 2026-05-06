import type { APIRoute } from 'astro';
import { signMerchantToken } from '@komercia-mcp/shared';
import { getConfig } from '../../lib/env.js';
import {
  redeemMagicLinkCode,
  MagicLinkExpiredError,
  MagicLinkUsedError,
  MagicLinkNotFoundError,
  MagicLinkBlockedError,
} from '../../lib/magic-link.js';
import { checkRateLimit, RateLimitExceededError } from '../../lib/rate-limit.js';

// Valid magic link codes are exactly 64 lowercase hex characters
const HEX_CODE_REGEX = /^[0-9a-f]{64}$/;

export const GET: APIRoute = async ({ request, url }) => {
  const code = url.searchParams.get('code');

  if (!code || !HEX_CODE_REGEX.test(code)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing code parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit redemption attempts by IP to prevent brute-force
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    checkRateLimit(`redeem:ip:${ip}`, 10, 3_600_000);
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

  try {
    const { email, merchantId, storeId } = await redeemMagicLinkCode({ rawCode: code });
    const config = getConfig();

    const token = await signMerchantToken(
      {
        sub: merchantId ?? email,
        store_id: storeId ?? 'unknown',
        email,
        scope: 'read',
      },
      config.JWT_SECRET,
    );

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof MagicLinkExpiredError) {
      return new Response(JSON.stringify({ error: 'expired', message: 'This link has expired.' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (err instanceof MagicLinkUsedError) {
      return new Response(
        JSON.stringify({ error: 'used', message: 'This link has already been used.' }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (err instanceof MagicLinkBlockedError) {
      return new Response(
        JSON.stringify({ error: 'blocked', message: 'Too many attempts. This link is blocked.' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (err instanceof MagicLinkNotFoundError) {
      return new Response(JSON.stringify({ error: 'not_found', message: 'Link not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('[redeem] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'internal_error', message: 'Something went wrong.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

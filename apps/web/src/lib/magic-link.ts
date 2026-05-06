import crypto from 'node:crypto';
import { MAGIC_LINK_MAX_ATTEMPTS } from '@komercia-mcp/shared';
import { getSql } from './db.js';

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------

export class MagicLinkExpiredError extends Error {
  constructor(message = 'Magic link has expired') {
    super(message);
    this.name = 'MagicLinkExpiredError';
  }
}

export class MagicLinkUsedError extends Error {
  constructor(message = 'Magic link has already been used') {
    super(message);
    this.name = 'MagicLinkUsedError';
  }
}

export class MagicLinkNotFoundError extends Error {
  constructor(message = 'Magic link not found') {
    super(message);
    this.name = 'MagicLinkNotFoundError';
  }
}

export class MagicLinkBlockedError extends Error {
  constructor(message = 'Magic link has been blocked due to too many attempts') {
    super(message);
    this.name = 'MagicLinkBlockedError';
  }
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

export async function generateMagicLinkCode(): Promise<{ raw: string; hash: string }> {
  const raw = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export async function storeMagicLinkCode(params: {
  codeHash: string;
  email: string;
  ipAddress: string;
  expirySeconds: number;
}): Promise<void> {
  const db = getSql();
  const { codeHash, email, ipAddress, expirySeconds } = params;

  await db`
    INSERT INTO magic_link_codes (code_hash, email, ip_address, expires_at)
    VALUES (
      ${codeHash},
      ${email},
      ${ipAddress},
      now() + ${`${expirySeconds} seconds`}::interval
    )
  `;
}

export async function redeemMagicLinkCode(params: {
  rawCode: string;
}): Promise<{ email: string; merchantId: string | null; storeId: string | null }> {
  const db = getSql();
  const codeHash = crypto.createHash('sha256').update(params.rawCode).digest('hex');

  // Atomically increment attempts and fetch the row
  const rows = await db<
    Array<{
      id: string;
      email: string;
      merchant_id: string | null;
      store_id: string | null;
      expires_at: Date;
      used_at: Date | null;
      attempts: number;
    }>
  >`
    UPDATE magic_link_codes
    SET attempts = attempts + 1
    WHERE code_hash = ${codeHash}
    RETURNING id, email, merchant_id, store_id, expires_at, used_at, attempts
  `;

  if (rows.length === 0) {
    throw new MagicLinkNotFoundError();
  }

  const row = rows[0]!;

  if (row.attempts > MAGIC_LINK_MAX_ATTEMPTS) {
    throw new MagicLinkBlockedError();
  }

  if (row.used_at !== null) {
    throw new MagicLinkUsedError();
  }

  if (new Date() > new Date(row.expires_at)) {
    throw new MagicLinkExpiredError();
  }

  // Mark as used atomically — only succeeds once
  const updated = await db<Array<{ id: string }>>`
    UPDATE magic_link_codes
    SET used_at = now()
    WHERE id = ${row.id}
      AND used_at IS NULL
    RETURNING id
  `;

  if (updated.length === 0) {
    // Another request beat us to it (race condition)
    throw new MagicLinkUsedError();
  }

  return {
    email: row.email,
    merchantId: row.merchant_id,
    storeId: row.store_id,
  };
}

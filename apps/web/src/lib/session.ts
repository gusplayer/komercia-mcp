import crypto from 'node:crypto';
import { getSql } from './db.js';
import { getConfig } from './env.js';
import { JWT_EXPIRY_SECONDS } from '@komercia-mcp/shared';

export class SessionExpiredError extends Error {
  constructor(message = 'Session has expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class SessionNotFoundError extends Error {
  constructor(message = 'Session not found') {
    super(message);
    this.name = 'SessionNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Encryption helpers — AES-256-GCM
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const config = getConfig();
  const hex = config.komerciaSessionEncryptionKey;
  if (!hex || hex.length < 64) {
    throw new Error('KOMERCIA_SESSION_ENCRYPTION_KEY must be a 32-byte (64 hex chars) key');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Returns `iv:authTag:ciphertext` (all hex-encoded, colon-separated).
 */
function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypts a value produced by `encrypt`.
 */
function decrypt(stored: string): string {
  const key = getEncryptionKey();
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CreateSessionParams {
  jti: string;
  email: string;
  merchantId: string;
  storeId: string;
  nodeToken: string;
  laravelToken: string;
  laravelRefresh?: string;
  expirySeconds?: number;
}

/**
 * Persists a new session in komercia_sessions.
 * Tokens are encrypted at rest with AES-256-GCM.
 */
export async function createSession(params: CreateSessionParams): Promise<{ jti: string }> {
  const {
    jti,
    email,
    merchantId,
    storeId,
    nodeToken,
    laravelToken,
    laravelRefresh,
    expirySeconds = JWT_EXPIRY_SECONDS,
  } = params;

  const sql = getSql();

  const encryptedNode = encrypt(nodeToken);
  const encryptedLaravel = encrypt(laravelToken);
  const encryptedRefresh = laravelRefresh ? encrypt(laravelRefresh) : null;

  await sql`
    INSERT INTO komercia_sessions
      (jti, email, merchant_id, store_id, node_token, laravel_token, laravel_refresh, expires_at)
    VALUES (
      ${jti}::uuid,
      ${email},
      ${merchantId},
      ${storeId},
      ${encryptedNode},
      ${encryptedLaravel},
      ${encryptedRefresh},
      now() + (${expirySeconds} || ' seconds')::interval
    )
  `;

  return { jti };
}

export interface SessionData {
  email: string;
  merchantId: string;
  storeId: string;
  nodeToken: string;
  laravelToken: string;
  laravelRefresh?: string;
}

/**
 * Retrieves a session by jti. Returns null if not found or expired.
 * Tokens are decrypted before being returned.
 */
export async function getSession(jti: string): Promise<SessionData | null> {
  const sql = getSql();

  const rows = await sql<
    {
      email: string;
      merchant_id: string;
      store_id: string;
      node_token: string;
      laravel_token: string;
      laravel_refresh: string | null;
    }[]
  >`
    SELECT email, merchant_id, store_id, node_token, laravel_token, laravel_refresh
    FROM komercia_sessions
    WHERE jti = ${jti}::uuid
      AND expires_at > now()
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0]!;

  const base = {
    email: row.email,
    merchantId: row.merchant_id,
    storeId: row.store_id,
    nodeToken: decrypt(row.node_token),
    laravelToken: decrypt(row.laravel_token),
  };

  if (row.laravel_refresh) {
    return { ...base, laravelRefresh: decrypt(row.laravel_refresh) };
  }

  return base;
}

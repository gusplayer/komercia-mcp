import { createCryptoService, JWT_EXPIRY_SECONDS } from '@komercia-mcp/shared';

import { getSql } from './db.js';
import { getConfig } from './env.js';

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

let _crypto: ReturnType<typeof createCryptoService> | undefined;
function crypto() {
  if (!_crypto) {
    const { komerciaSessionEncryptionKey } = getConfig();
    if (!komerciaSessionEncryptionKey) {
      throw new Error('KOMERCIA_SESSION_ENCRYPTION_KEY is required to (en|de)crypt sessions');
    }
    _crypto = createCryptoService(komerciaSessionEncryptionKey);
  }
  return _crypto;
}

export interface CreateSessionParams {
  jti: string;
  email: string;
  password: string;
  merchantId: string;
  storeId: string;
  nodeToken: string;
  nodeTokenExpiresAt: Date;
  laravelToken: string;
  laravelRefresh?: string;
  expirySeconds?: number;
}

/**
 * Persists a new session in komercia_sessions.
 * Tokens AND merchant credentials are encrypted at rest with AES-256-GCM.
 *
 * Credentials are stored to support automatic Node-token re-login after the
 * Komercia Node JWT expires (2h). They are decrypted only inside the MCP
 * server when calling NodeTokenRefresher; never returned to the client.
 */
export async function createSession(params: CreateSessionParams): Promise<{ jti: string }> {
  const {
    jti,
    email,
    password,
    merchantId,
    storeId,
    nodeToken,
    nodeTokenExpiresAt,
    laravelToken,
    laravelRefresh,
    expirySeconds = JWT_EXPIRY_SECONDS,
  } = params;

  const c = crypto();
  const sql = getSql();

  await sql`
    INSERT INTO komercia_sessions (
      jti, email, merchant_id, store_id,
      email_encrypted, password_encrypted,
      node_token, node_token_expires_at,
      laravel_token, laravel_refresh,
      expires_at, schema_version
    ) VALUES (
      ${jti}::uuid, ${email}, ${merchantId}, ${storeId},
      ${c.encrypt(email)}, ${c.encrypt(password)},
      ${c.encrypt(nodeToken)}, ${nodeTokenExpiresAt.toISOString()}::timestamptz,
      ${c.encrypt(laravelToken)},
      ${laravelRefresh ? c.encrypt(laravelRefresh) : null},
      now() + (${expirySeconds} || ' seconds')::interval,
      2
    )
  `;

  return { jti };
}

export interface SessionData {
  email: string;
  merchantId: string;
  storeId: string;
  nodeToken: string;
  nodeTokenExpiresAt: Date;
  laravelToken: string;
  laravelRefresh?: string;
}

/**
 * Retrieves a session by jti. Returns null if not found, expired, or revoked.
 * Tokens are decrypted before being returned. Credentials (email/password)
 * are NOT exposed by this function — only the MCP server reads those for refresh.
 */
export async function getSession(jti: string): Promise<SessionData | null> {
  const c = crypto();
  const sql = getSql();

  const rows = await sql<
    {
      email: string;
      merchant_id: string;
      store_id: string;
      node_token: string;
      node_token_expires_at: Date | null;
      laravel_token: string;
      laravel_refresh: string | null;
    }[]
  >`
    SELECT email, merchant_id, store_id, node_token, node_token_expires_at, laravel_token, laravel_refresh
    FROM komercia_sessions
    WHERE jti = ${jti}::uuid
      AND expires_at > now()
      AND revoked_at IS NULL
  `;

  const row = rows[0];
  if (row === undefined) {
    return null;
  }

  const data: SessionData = {
    email: row.email,
    merchantId: row.merchant_id,
    storeId: row.store_id,
    nodeToken: c.decrypt(row.node_token),
    // Fall back to a far-past date if the column is null (legacy v1 rows).
    // The MCP refresher will treat this as "needs refresh now".
    nodeTokenExpiresAt: row.node_token_expires_at ?? new Date(0),
    laravelToken: c.decrypt(row.laravel_token),
  };

  if (row.laravel_refresh) {
    data.laravelRefresh = c.decrypt(row.laravel_refresh);
  }

  return data;
}

/**
 * Marks a session as revoked. After this, getSession returns null.
 */
export async function revokeSession(jti: string, email: string): Promise<boolean> {
  const sql = getSql();
  const result = await sql`
    UPDATE komercia_sessions
    SET revoked_at = now()
    WHERE jti = ${jti}::uuid
      AND email = ${email}
      AND revoked_at IS NULL
  `;
  return result.count > 0;
}

import postgres from 'postgres';

import { getConfig } from './env.js';

let _sql: ReturnType<typeof postgres> | undefined;

/**
 * Pool size: serverless (Vercel) opens one Postgres client per invocation, so
 * `max: 1` keeps pressure low on Neon's connection limit. On a long-running
 * Node process (Docker, `pnpm dev`) we use a small pool. Detected via the
 * Vercel-provided env var, with a fallback to NODE_ENV=production-like.
 */
function poolSize(): number {
  if (process.env['VERCEL'] === '1' || process.env['VERCEL_ENV']) return 1;
  return 10;
}

/**
 * SSL is decided from the connection string (`sslmode=require` etc.) so the
 * same code path serves local Docker Postgres (no TLS) and managed providers
 * like Neon (TLS required).
 */
function shouldUseSsl(databaseUrl: string): boolean | 'require' {
  if (/sslmode=require/i.test(databaseUrl)) return 'require';
  if (/\b(ssl|tls)=true\b/i.test(databaseUrl)) return 'require';
  return false;
}

export function getSql(): ReturnType<typeof postgres> {
  if (!_sql) {
    const config = getConfig();
    _sql = postgres(config.DATABASE_URL, {
      max: poolSize(),
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: shouldUseSsl(config.DATABASE_URL),
    });
  }
  return _sql;
}

/**
 * Idempotent schema migrations. Wrapped in a Postgres advisory lock so that
 * concurrent boot of `web` and `api` doesn't race on `CREATE INDEX`.
 *
 * Schema version 2 adds:
 *   - email_encrypted, password_encrypted (for automatic Node-token re-login)
 *   - node_token_expires_at (track 2h Komercia Node JWT expiry without decoding)
 *   - revoked_at, last_used_at (revocation + auditing)
 *
 * Schema version 3 adds:
 *   - rate_limits table (login throttling; works across serverless invocations)
 *
 * Schema version 4 adds:
 *   - oauth_clients, oauth_auth_requests, oauth_auth_codes, oauth_refresh_tokens
 *     (OAuth 2.1 + PKCE + Dynamic Client Registration)
 */
export async function runMigrations(): Promise<void> {
  const sql = getSql();

  await sql.begin(async (tx) => {
    // Serialize migrations across processes — same key in web and api.
    await tx`SELECT pg_advisory_xact_lock(${723845921}::bigint)`;

    await tx`
      CREATE TABLE IF NOT EXISTS komercia_sessions (
        jti                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email                 TEXT NOT NULL,
        merchant_id           TEXT NOT NULL,
        store_id              TEXT NOT NULL,
        node_token            TEXT NOT NULL,
        laravel_token         TEXT NOT NULL,
        laravel_refresh       TEXT,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at            TIMESTAMPTZ NOT NULL
      )
    `;

    // v2 columns — additive, idempotent.
    await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS email_encrypted TEXT`;
    await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS password_encrypted TEXT`;
    await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS node_token_expires_at TIMESTAMPTZ`;
    await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`;
    await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ`;
    await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS schema_version SMALLINT NOT NULL DEFAULT 2`;

    await tx`CREATE INDEX IF NOT EXISTS idx_komercia_sessions_email_active ON komercia_sessions(email) WHERE revoked_at IS NULL`;
    // Predicate restricted to immutable expressions (now() is VOLATILE).
    await tx`CREATE INDEX IF NOT EXISTS idx_komercia_sessions_active ON komercia_sessions(jti) WHERE revoked_at IS NULL`;

    // v3: rate_limits table for login throttling — survives across serverless
    // invocations. `key` is "<bucket>:<identifier>" e.g. "login_ip:1.2.3.4".
    await tx`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key            TEXT PRIMARY KEY,
        count          INTEGER NOT NULL,
        window_start   TIMESTAMPTZ NOT NULL,
        expires_at     TIMESTAMPTZ NOT NULL
      )
    `;
    await tx`CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at)`;

    // v4: OAuth 2.1 + PKCE + Dynamic Client Registration tables.
    await tx`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        client_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_name            TEXT NOT NULL,
        client_secret_hash     TEXT,
        redirect_uris          TEXT[] NOT NULL,
        grant_types            TEXT[] NOT NULL DEFAULT ARRAY['authorization_code','refresh_token'],
        response_types         TEXT[] NOT NULL DEFAULT ARRAY['code'],
        token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
        scope                  TEXT NOT NULL DEFAULT 'read',
        software_id            TEXT,
        software_version       TEXT,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_used_at           TIMESTAMPTZ
      )
    `;
    await tx`CREATE INDEX IF NOT EXISTS idx_oauth_clients_last_used ON oauth_clients(last_used_at)`;

    await tx`
      CREATE TABLE IF NOT EXISTS oauth_auth_requests (
        request_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id              UUID NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
        redirect_uri           TEXT NOT NULL,
        code_challenge         TEXT NOT NULL,
        code_challenge_method  TEXT NOT NULL CHECK (code_challenge_method = 'S256'),
        scope                  TEXT NOT NULL,
        state                  TEXT NOT NULL,
        resource               TEXT NOT NULL,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at             TIMESTAMPTZ NOT NULL,
        consumed_at            TIMESTAMPTZ
      )
    `;
    await tx`CREATE INDEX IF NOT EXISTS idx_oauth_auth_requests_expires ON oauth_auth_requests(expires_at)`;

    await tx`
      CREATE TABLE IF NOT EXISTS oauth_auth_codes (
        code                   TEXT PRIMARY KEY,
        client_id              UUID NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
        jti                    UUID NOT NULL REFERENCES komercia_sessions(jti) ON DELETE CASCADE,
        redirect_uri           TEXT NOT NULL,
        code_challenge         TEXT NOT NULL,
        code_challenge_method  TEXT NOT NULL,
        scope                  TEXT NOT NULL,
        resource               TEXT NOT NULL,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at             TIMESTAMPTZ NOT NULL,
        consumed_at            TIMESTAMPTZ
      )
    `;
    await tx`CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expires ON oauth_auth_codes(expires_at)`;
    await tx`CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_jti ON oauth_auth_codes(jti)`;

    await tx`
      CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
        token_hash             TEXT PRIMARY KEY,
        client_id              UUID NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
        jti                    UUID NOT NULL REFERENCES komercia_sessions(jti) ON DELETE CASCADE,
        scope                  TEXT NOT NULL,
        resource               TEXT NOT NULL,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at             TIMESTAMPTZ NOT NULL,
        rotated_at             TIMESTAMPTZ,
        revoked_at             TIMESTAMPTZ
      )
    `;
    await tx`CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_jti ON oauth_refresh_tokens(jti)`;
  });
}

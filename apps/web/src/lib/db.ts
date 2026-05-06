import postgres from 'postgres';
import { getConfig } from './env.js';

let _sql: ReturnType<typeof postgres> | undefined;

/**
 * Returns the singleton postgres tagged-template client.
 * Lazily initialized on first call.
 */
export function getSql(): ReturnType<typeof postgres> {
  if (!_sql) {
    const config = getConfig();
    _sql = postgres(config.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}

export async function runMigrations(): Promise<void> {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS komercia_sessions (
      jti           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT NOT NULL,
      merchant_id   TEXT NOT NULL,
      store_id      TEXT NOT NULL,
      node_token    TEXT NOT NULL,
      laravel_token TEXT NOT NULL,
      laravel_refresh TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at    TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_komercia_sessions_jti
    ON komercia_sessions(jti)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_komercia_sessions_email
    ON komercia_sessions(email)
  `;
}

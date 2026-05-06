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
    CREATE TABLE IF NOT EXISTS magic_link_codes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code_hash   TEXT NOT NULL UNIQUE,
      email       TEXT NOT NULL,
      merchant_id TEXT,
      store_id    TEXT,
      ip_address  TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at  TIMESTAMPTZ NOT NULL,
      used_at     TIMESTAMPTZ,
      attempts    INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_magic_link_codes_code_hash
    ON magic_link_codes(code_hash)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_magic_link_codes_email
    ON magic_link_codes(email)
  `;
}

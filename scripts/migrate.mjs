// Standalone migration runner — uses no app code, only `postgres` directly.
// Mirrors apps/web/src/lib/db.ts:runMigrations().
//
//   DATABASE_URL=postgresql://... node scripts/migrate.mjs

import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 2 });

await sql.begin(async (tx) => {
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

  await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS email_encrypted TEXT`;
  await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS password_encrypted TEXT`;
  await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS node_token_expires_at TIMESTAMPTZ`;
  await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`;
  await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ`;
  await tx`ALTER TABLE komercia_sessions ADD COLUMN IF NOT EXISTS schema_version SMALLINT NOT NULL DEFAULT 2`;

  await tx`CREATE INDEX IF NOT EXISTS idx_komercia_sessions_email_active ON komercia_sessions(email) WHERE revoked_at IS NULL`;
  await tx`CREATE INDEX IF NOT EXISTS idx_komercia_sessions_active ON komercia_sessions(jti) WHERE revoked_at IS NULL`;

  // v3: rate-limits table (login throttling, survives serverless cold starts).
  await tx`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key            TEXT PRIMARY KEY,
      count          INTEGER NOT NULL,
      window_start   TIMESTAMPTZ NOT NULL,
      expires_at     TIMESTAMPTZ NOT NULL
    )
  `;
  await tx`CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at)`;
});

const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'komercia_sessions'
  ORDER BY ordinal_position
`;

console.log('Schema komercia_sessions:');
for (const c of cols) {
  console.log(`  ${c.column_name.padEnd(24)} ${c.data_type.padEnd(28)} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
}

await sql.end();

import postgres from 'postgres';

import { config } from '../config/env.js';

let _sql: ReturnType<typeof postgres> | null = null;

/**
 * SSL is decided from the connection string (`sslmode=require` or `?ssl=true`)
 * rather than NODE_ENV, so a "production" build can still talk to a plain
 * local Postgres in Docker. Cloud DBs like Neon must include `sslmode=require`
 * in their URL.
 */
function shouldUseSsl(databaseUrl: string): boolean | 'require' {
  if (/sslmode=require/i.test(databaseUrl)) return 'require';
  if (/\b(ssl|tls)=true\b/i.test(databaseUrl)) return 'require';
  return false;
}

export function getSql(): ReturnType<typeof postgres> {
  _sql ??= postgres(config.databaseUrl, {
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: shouldUseSsl(config.databaseUrl),
  });
  return _sql;
}

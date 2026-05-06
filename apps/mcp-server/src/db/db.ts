import postgres from 'postgres';
import { config } from '../config/env.js';

let _sql: ReturnType<typeof postgres> | null = null;

export function getSql(): ReturnType<typeof postgres> {
  if (_sql === null) {
    _sql = postgres(config.databaseUrl, {
      max: 5,
      idle_timeout: 30,
      connect_timeout: 10,
      ssl: config.nodeEnv === 'production' ? 'require' : false,
    });
  }
  return _sql;
}

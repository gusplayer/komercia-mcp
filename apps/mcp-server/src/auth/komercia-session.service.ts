import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config/env.js';
import { getSql } from '../db/db.js';

export interface KomerciaSession {
  jti: string;
  storeId: string;
  nodeToken: string;
  laravelToken: string;
  laravelRefreshToken?: string;
}

interface KomerciaSessionRow {
  jti: string;
  store_id: string;
  node_token: string;
  laravel_token: string;
  laravel_refresh: string | null;
}

function decrypt(encrypted: string, key: Buffer): string {
  const parts = encrypted.split(':');
  const ivHex = parts[0] ?? '';
  const authTagHex = parts[1] ?? '';
  const ciphertextHex = parts[2] ?? '';
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * Reads Komercia backend tokens from the komercia_sessions Postgres table.
 * Sessions are created by the web app on merchant login; the MCP server only reads them.
 */
@Injectable()
export class KomerciaSessionService {
  private readonly logger = new Logger(KomerciaSessionService.name);

  async getSession(jti: string): Promise<KomerciaSession | null> {
    try {
      if (!config.databaseUrl) {
        this.logger.warn('DATABASE_URL is not set — skipping DB session lookup');
        return null;
      }

      const encryptionKeyHex = config.komerciaSessionEncryptionKey;
      if (!encryptionKeyHex) {
        this.logger.warn(
          'KOMERCIA_SESSION_ENCRYPTION_KEY is not set — cannot decrypt session tokens',
        );
        return null;
      }

      const sql = getSql();

      const rows = await sql<KomerciaSessionRow[]>`
        SELECT jti, store_id, node_token, laravel_token, laravel_refresh
        FROM komercia_sessions
        WHERE jti = ${jti}
          AND expires_at > now()
        LIMIT 1
      `;

      const row = rows[0];
      if (row === undefined) {
        return null;
      }

      const key = Buffer.from(encryptionKeyHex, 'hex');
      const nodeToken = decrypt(row.node_token, key);
      const laravelToken = decrypt(row.laravel_token, key);

      const session: KomerciaSession = {
        jti: row.jti,
        storeId: row.store_id,
        nodeToken,
        laravelToken,
      };

      if (row.laravel_refresh != null) {
        session.laravelRefreshToken = decrypt(row.laravel_refresh, key);
      }

      return session;
    } catch (err) {
      this.logger.error({ err }, 'Failed to retrieve session from DB — returning null');
      return null;
    }
  }

  async storeSession(_session: KomerciaSession): Promise<void> {
    throw new Error('Sessions are created by the web app, not the MCP server');
  }
}

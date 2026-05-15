import { createCryptoService  } from '@komercia-mcp/shared';
import { Injectable, Logger } from '@nestjs/common';

import { config } from '../config/env.js';
import { getSql } from '../db/db.js';

import type {CryptoService} from '@komercia-mcp/shared';

export interface KomerciaSession {
  jti: string;
  email: string;
  merchantId: string;
  storeId: string;
  nodeToken: string;
  nodeTokenExpiresAt: Date;
  laravelToken: string;
  laravelRefreshToken?: string;
}

interface KomerciaSessionRow {
  jti: string;
  email: string;
  merchant_id: string;
  store_id: string;
  email_encrypted: string | null;
  password_encrypted: string | null;
  node_token: string;
  node_token_expires_at: Date | null;
  laravel_token: string;
  laravel_refresh: string | null;
}

interface RawCredentials {
  email: string;
  password: string;
}

/**
 * Reads (and refreshes) Komercia backend tokens stored in `komercia_sessions`.
 *
 * - Sessions are CREATED by the web app on login.
 * - Sessions are READ on every MCP tool call.
 * - The Komercia Node JWT expires in 2h with no refresh endpoint, so we keep
 *   credentials encrypted alongside tokens. `getRawCredentials()` returns them
 *   to `NodeTokenRefresher`, which performs a re-login when needed.
 */
@Injectable()
export class KomerciaSessionService {
  private readonly logger = new Logger(KomerciaSessionService.name);
  private _crypto: CryptoService | undefined;

  private crypto(): CryptoService | null {
    if (this._crypto) return this._crypto;
    const key = config.komerciaSessionEncryptionKey;
    if (!key) {
      this.logger.warn('KOMERCIA_SESSION_ENCRYPTION_KEY not set — sessions will be unreadable');
      return null;
    }
    this._crypto = createCryptoService(key);
    return this._crypto;
  }

  private async getRow(jti: string): Promise<KomerciaSessionRow | null> {
    if (!config.databaseUrl) {
      this.logger.warn('DATABASE_URL not set — skipping DB session lookup');
      return null;
    }
    const sql = getSql();
    const rows = await sql<KomerciaSessionRow[]>`
      SELECT jti, email, merchant_id, store_id,
             email_encrypted, password_encrypted,
             node_token, node_token_expires_at,
             laravel_token, laravel_refresh
      FROM komercia_sessions
      WHERE jti = ${jti}::uuid
        AND expires_at > now()
        AND revoked_at IS NULL
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  /**
   * Lightweight lookup used by the OAuth token endpoint. Returns the merchant
   * identity claims for an active session WITHOUT decrypting Komercia tokens
   * — issuing our own bearer JWT needs nothing more.
   */
  async getMetadataByJti(
    jti: string,
  ): Promise<{ jti: string; sub: string; store_id: string; email: string } | null> {
    const row = await this.getRow(jti);
    if (!row) return null;
    return {
      jti: row.jti,
      sub: row.merchant_id,
      store_id: row.store_id,
      email: row.email,
    };
  }

  async getSession(jti: string): Promise<KomerciaSession | null> {
    try {
      const row = await this.getRow(jti);
      if (!row) return null;
      const c = this.crypto();
      if (!c) return null;

      const session: KomerciaSession = {
        jti: row.jti,
        email: row.email,
        merchantId: row.merchant_id,
        storeId: row.store_id,
        nodeToken: c.decrypt(row.node_token),
        nodeTokenExpiresAt: row.node_token_expires_at ?? new Date(0),
        laravelToken: c.decrypt(row.laravel_token),
      };
      if (row.laravel_refresh) {
        session.laravelRefreshToken = c.decrypt(row.laravel_refresh);
      }

      // Best-effort fire-and-forget audit trail.
      void this.touchLastUsed(jti);

      return session;
    } catch (err) {
      this.logger.error({ err }, 'Failed to retrieve session');
      return null;
    }
  }

  /**
   * Returns the encrypted credentials for the given session — used by
   * `NodeTokenRefresher` to re-login against Komercia when the Node JWT expires.
   * Returns null when the row has no encrypted credentials (legacy v1 sessions).
   */
  async getRawCredentials(jti: string): Promise<RawCredentials | null> {
    try {
      const row = await this.getRow(jti);
      if (!row?.email_encrypted || !row.password_encrypted) return null;
      const c = this.crypto();
      if (!c) return null;
      return {
        email: c.decrypt(row.email_encrypted),
        password: c.decrypt(row.password_encrypted),
      };
    } catch (err) {
      this.logger.error({ err }, 'Failed to retrieve raw credentials');
      return null;
    }
  }

  /**
   * Persists a freshly-rotated Node token + its expiry. Called by NodeTokenRefresher.
   */
  async updateNodeToken(jti: string, encryptedNodeToken: string, expiresAt: Date): Promise<void> {
    const sql = getSql();
    await sql`
      UPDATE komercia_sessions
      SET node_token = ${encryptedNodeToken},
          node_token_expires_at = ${expiresAt.toISOString()}::timestamptz
      WHERE jti = ${jti}::uuid
    `;
  }

  /**
   * Marks a session as revoked (logout / regenerate token).
   */
  async revoke(jti: string): Promise<boolean> {
    const sql = getSql();
    const r = await sql`
      UPDATE komercia_sessions
      SET revoked_at = now()
      WHERE jti = ${jti}::uuid AND revoked_at IS NULL
    `;
    return r.count > 0;
  }

  encrypt(plaintext: string): string {
    const c = this.crypto();
    if (!c) throw new Error('Crypto service unavailable');
    return c.encrypt(plaintext);
  }

  private async touchLastUsed(jti: string): Promise<void> {
    try {
      const sql = getSql();
      await sql`UPDATE komercia_sessions SET last_used_at = now() WHERE jti = ${jti}::uuid`;
    } catch {
      // intentional: audit-trail update is best-effort, never blocks tool calls.
    }
  }
}

import { KomerciaClient } from '@komercia-mcp/komercia-client';
import { Injectable, Logger } from '@nestjs/common';

import { KomerciaSessionService  } from './komercia-session.service.js';
import { config } from '../config/env.js';

import type {KomerciaSession} from './komercia-session.service.js';

const REFRESH_SKEW_MS = 5 * 60 * 1000; // refresh when < 5 min remains

interface NodeJwtPayload {
  id: number;
  exp: number;
  [k: string]: unknown;
}

function decodeNodeJwtExp(token: string): Date {
  const part = token.split('.')[1];
  if (!part) throw new Error('Malformed Node JWT');
  const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf-8')) as Partial<NodeJwtPayload>;
  if (typeof payload.exp !== 'number') throw new Error('Node JWT missing exp claim');
  return new Date(payload.exp * 1000);
}

/**
 * Refreshes Komercia Node access tokens (which live for 2h with no refresh endpoint).
 *
 * Strategy: lazy + single-flight.
 * - Lazy: each `ensureFresh(session)` call checks `nodeTokenExpiresAt` and refreshes only
 *   if the token is within `REFRESH_SKEW_MS` of expiry (or already expired).
 * - Single-flight: concurrent tool calls for the same `jti` share the same refresh promise,
 *   so we never burst N parallel logins to Komercia for the same session.
 *
 * The refresh re-logins by reading the (encrypted) email+password stored in
 * `komercia_sessions.email_encrypted` / `password_encrypted` on session creation.
 */
@Injectable()
export class NodeTokenRefresher {
  private readonly logger = new Logger(NodeTokenRefresher.name);
  private readonly inflight = new Map<string, Promise<{ nodeToken: string; expiresAt: Date }>>();

  constructor(private readonly sessions: KomerciaSessionService) {}

  /**
   * Returns a session whose `nodeToken` is guaranteed to be valid for at least
   * `REFRESH_SKEW_MS` from now. Mutates the input object's `nodeToken` and
   * `nodeTokenExpiresAt` fields and persists the new token to DB.
   *
   * On refresh failure (e.g. merchant changed password in Komercia), the session
   * is automatically revoked and an Error is thrown — the caller should map it
   * to the standard "Authentication required" tool response.
   */
  async ensureFresh(session: KomerciaSession): Promise<KomerciaSession> {
    if (session.nodeTokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS) {
      return session;
    }

    const existing = this.inflight.get(session.jti);
    if (existing) {
      const { nodeToken, expiresAt } = await existing;
      session.nodeToken = nodeToken;
      session.nodeTokenExpiresAt = expiresAt;
      return session;
    }

    const refreshPromise = this.doRefresh(session.jti).finally(() => {
      this.inflight.delete(session.jti);
    });
    this.inflight.set(session.jti, refreshPromise);

    const { nodeToken, expiresAt } = await refreshPromise;
    session.nodeToken = nodeToken;
    session.nodeTokenExpiresAt = expiresAt;
    return session;
  }

  private async doRefresh(jti: string): Promise<{ nodeToken: string; expiresAt: Date }> {
    const creds = await this.sessions.getRawCredentials(jti);
    if (!creds) {
      throw new Error(`Cannot refresh node token for jti=${jti}: no stored credentials`);
    }

    const authClient = KomerciaClient.createForAuth({
      nodeUrl: config.nodeUrl,
      laravelUrl: config.laravelUrl,
      laravelClientId: config.laravelClientId,
      laravelClientSecret: config.laravelClientSecret,
    });

    let accessToken: string;
    try {
      const result = await authClient.auth.loginNode(creds.email, creds.password);
      accessToken = result.accessToken;
    } catch (err) {
      // 401 here = merchant likely rotated their Komercia password. Auto-revoke
      // so subsequent tool calls return a clean "session revoked" message.
      const msg = (err as Error).message;
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        this.logger.warn(`Auto-revoking session ${jti}: Komercia rejected stored credentials`);
        await this.sessions.revoke(jti);
      }
      throw err;
    }

    const expiresAt = decodeNodeJwtExp(accessToken);
    const encrypted = this.sessions.encrypt(accessToken);
    await this.sessions.updateNodeToken(jti, encrypted, expiresAt);

    this.logger.log(`Refreshed node token for jti=${jti}, new expiry=${expiresAt.toISOString()}`);
    return { nodeToken: accessToken, expiresAt };
  }
}

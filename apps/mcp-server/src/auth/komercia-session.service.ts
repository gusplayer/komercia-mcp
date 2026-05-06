import { Injectable } from '@nestjs/common';

export interface KomerciaSession {
  jti: string;
  storeId: string;
  nodeToken: string;
  laravelToken: string;
  nodeTokenExpiresAt?: Date;
  laravelTokenExpiresAt?: Date;
}

/**
 * Manages Komercia backend tokens for each merchant session.
 * MVP: in-memory map keyed by jti.
 * TODO: replace with Postgres lookup using DATABASE_URL.
 */
@Injectable()
export class KomerciaSessionService {
  private readonly sessions = new Map<string, KomerciaSession>();

  async getSession(jti: string): Promise<KomerciaSession | null> {
    return this.sessions.get(jti) ?? null;
  }

  async storeSession(session: KomerciaSession): Promise<void> {
    this.sessions.set(session.jti, session);
  }

  async deleteSession(jti: string): Promise<void> {
    this.sessions.delete(jti);
  }
}

import { Injectable, Logger } from '@nestjs/common';

import { getSql } from '../db/db.js';

import type { DcrRequest } from './schemas.js';

export interface OAuthClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope: string;
  software_id: string | null;
  software_version: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

interface OAuthClientRow {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope: string;
  software_id: string | null;
  software_version: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

@Injectable()
export class OAuthClientService {
  private readonly logger = new Logger(OAuthClientService.name);

  async register(input: DcrRequest): Promise<OAuthClient> {
    const sql = getSql();

    const grantTypes = input.grant_types ?? ['authorization_code'];
    const responseTypes = input.response_types ?? ['code'];
    const tokenAuthMethod = input.token_endpoint_auth_method;
    const scope = input.scope ?? 'read';

    const rows = await sql<OAuthClientRow[]>`
      INSERT INTO oauth_clients (
        client_name,
        redirect_uris,
        grant_types,
        response_types,
        token_endpoint_auth_method,
        scope,
        software_id,
        software_version
      ) VALUES (
        ${input.client_name},
        ${input.redirect_uris}::text[],
        ${grantTypes}::text[],
        ${responseTypes}::text[],
        ${tokenAuthMethod},
        ${scope},
        ${input.software_id ?? null},
        ${input.software_version ?? null}
      )
      RETURNING client_id, client_name, redirect_uris, grant_types, response_types,
                token_endpoint_auth_method, scope, software_id, software_version,
                created_at, last_used_at
    `;

    const row = rows[0];
    if (!row) {
      throw new Error('failed to insert oauth_clients row');
    }

    this.logger.log(
      { client_id: row.client_id, client_name: row.client_name },
      'Registered OAuth client',
    );

    return row;
  }

  async findById(clientId: string): Promise<OAuthClient | null> {
    const sql = getSql();
    const rows = await sql<OAuthClientRow[]>`
      SELECT client_id, client_name, redirect_uris, grant_types, response_types,
             token_endpoint_auth_method, scope, software_id, software_version,
             created_at, last_used_at
      FROM oauth_clients
      WHERE client_id = ${clientId}::uuid
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  validateRedirectUri(client: OAuthClient, uri: string): boolean {
    // Exact match required per RFC 8252 §7.5 / OAuth 2.1 §1.4.4.
    return client.redirect_uris.includes(uri);
  }

  async touchLastUsed(clientId: string): Promise<void> {
    try {
      const sql = getSql();
      await sql`UPDATE oauth_clients SET last_used_at = now() WHERE client_id = ${clientId}::uuid`;
    } catch (err) {
      // Best-effort — audit-trail update must never block the token response.
      this.logger.warn({ err, clientId }, 'failed to update oauth_clients.last_used_at');
    }
  }
}

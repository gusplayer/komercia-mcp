import { randomBytes } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { config } from '../config/env.js';
import { getSql } from '../db/db.js';

export interface OAuthAuthRequest {
  request_id: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  scope: string;
  state: string;
  resource: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface CreateRequestInput {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  state: string;
  resource: string;
}

export interface CreateCodeInput {
  client_id: string;
  jti: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  resource: string;
}

export interface OAuthAuthCode {
  code: string;
  client_id: string;
  jti: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  scope: string;
  resource: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface RedeemCodeValidators {
  client_id: string;
  redirect_uri: string;
  resource?: string;
}

export class OAuthCodeError extends Error {
  constructor(
    public readonly code: 'invalid_grant' | 'invalid_target' | 'invalid_request',
    message: string,
  ) {
    super(message);
    this.name = 'OAuthCodeError';
  }
}

@Injectable()
export class OAuthCodeService {
  private readonly logger = new Logger(OAuthCodeService.name);

  async createRequest(input: CreateRequestInput): Promise<string> {
    const sql = getSql();
    const ttl = config.oauthAuthRequestTtlSeconds;
    const rows = await sql<{ request_id: string }[]>`
      INSERT INTO oauth_auth_requests (
        client_id, redirect_uri, code_challenge, code_challenge_method,
        scope, state, resource, expires_at
      ) VALUES (
        ${input.client_id}::uuid,
        ${input.redirect_uri},
        ${input.code_challenge},
        'S256',
        ${input.scope},
        ${input.state},
        ${input.resource},
        now() + (${ttl} || ' seconds')::interval
      )
      RETURNING request_id
    `;
    const row = rows[0];
    if (!row) throw new Error('failed to insert oauth_auth_requests row');
    return row.request_id;
  }

  async findRequest(requestId: string): Promise<OAuthAuthRequest | null> {
    const sql = getSql();
    const rows = await sql<OAuthAuthRequest[]>`
      SELECT request_id, client_id, redirect_uri, code_challenge,
             code_challenge_method, scope, state, resource,
             created_at, expires_at, consumed_at
      FROM oauth_auth_requests
      WHERE request_id = ${requestId}::uuid
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async createCode(input: CreateCodeInput): Promise<string> {
    const sql = getSql();
    const code = randomBytes(32).toString('base64url');
    const ttl = config.oauthAuthCodeTtlSeconds;

    await sql`
      INSERT INTO oauth_auth_codes (
        code, client_id, jti, redirect_uri,
        code_challenge, code_challenge_method, scope, resource, expires_at
      ) VALUES (
        ${code},
        ${input.client_id}::uuid,
        ${input.jti}::uuid,
        ${input.redirect_uri},
        ${input.code_challenge},
        'S256',
        ${input.scope},
        ${input.resource},
        now() + (${ttl} || ' seconds')::interval
      )
    `;
    return code;
  }

  /**
   * Atomic create-code + consume-request. Inserts the auth code and marks the
   * originating auth request as consumed in the same transaction so a single
   * completion ticket can never mint two codes.
   */
  async issueCodeForRequest(
    request: OAuthAuthRequest,
    jti: string,
  ): Promise<string> {
    const sql = getSql();
    const code = randomBytes(32).toString('base64url');
    const ttl = config.oauthAuthCodeTtlSeconds;

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO oauth_auth_codes (
          code, client_id, jti, redirect_uri,
          code_challenge, code_challenge_method, scope, resource, expires_at
        ) VALUES (
          ${code},
          ${request.client_id}::uuid,
          ${jti}::uuid,
          ${request.redirect_uri},
          ${request.code_challenge},
          'S256',
          ${request.scope},
          ${request.resource},
          now() + (${ttl} || ' seconds')::interval
        )
      `;
      await tx`
        UPDATE oauth_auth_requests
        SET consumed_at = now()
        WHERE request_id = ${request.request_id}::uuid
          AND consumed_at IS NULL
      `;
    });

    return code;
  }

  /**
   * Atomic redeem-code: SELECT FOR UPDATE, validate matchers, mark consumed,
   * return the row. Throws OAuthCodeError on any mismatch — caller maps to
   * the right OAuth error code.
   */
  async redeemCode(code: string, validators: RedeemCodeValidators): Promise<OAuthAuthCode> {
    const sql = getSql();

    return sql.begin(async (tx) => {
      const rows = await tx<OAuthAuthCode[]>`
        SELECT code, client_id, jti, redirect_uri, code_challenge,
               code_challenge_method, scope, resource,
               created_at, expires_at, consumed_at
        FROM oauth_auth_codes
        WHERE code = ${code}
        FOR UPDATE
      `;

      const row = rows[0];
      if (!row) {
        throw new OAuthCodeError('invalid_grant', 'code not found');
      }
      if (row.consumed_at !== null) {
        // Defense-in-depth: replay attempt. Anything else we could do here
        // (revoking the issued access token) is OK to add later.
        this.logger.warn({ code }, 'OAuth code replay attempt');
        throw new OAuthCodeError('invalid_grant', 'code already consumed');
      }
      if (row.expires_at.getTime() <= Date.now()) {
        throw new OAuthCodeError('invalid_grant', 'code expired');
      }
      if (row.client_id !== validators.client_id) {
        throw new OAuthCodeError('invalid_grant', 'client_id mismatch');
      }
      if (row.redirect_uri !== validators.redirect_uri) {
        throw new OAuthCodeError('invalid_grant', 'redirect_uri mismatch');
      }
      if (validators.resource !== undefined && row.resource !== validators.resource) {
        throw new OAuthCodeError('invalid_target', 'resource mismatch');
      }

      await tx`
        UPDATE oauth_auth_codes SET consumed_at = now() WHERE code = ${code}
      `;

      return row;
    });
  }
}

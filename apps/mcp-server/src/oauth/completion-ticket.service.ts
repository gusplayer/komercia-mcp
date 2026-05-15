import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

import { config } from '../config/env.js';

export const COMPLETION_TICKET_AUDIENCE = 'urn:komercia-mcp:oauth-completion';
export const COMPLETION_TICKET_SCOPE = 'oauth.complete';

export interface CompletionTicketClaims {
  oauth_request_id: string;
  jti: string;
}

export class CompletionTicketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompletionTicketError';
  }
}

/**
 * Short-lived HS256 JWT that binds a successful login (`jti`) to an OAuth
 * authorization request (`oauth_request_id`). The web app issues it after
 * authentication and the MCP server redeems it at `/oauth/authorize/complete`
 * to mint the authorization code. The ticket NEVER carries the redirect_uri
 * or state — those come from the persisted `oauth_auth_requests` row.
 */
@Injectable()
export class CompletionTicketService {
  private readonly secret = new TextEncoder().encode(config.jwtSecret);

  async sign(input: CompletionTicketClaims): Promise<string> {
    return new SignJWT({
      scope: COMPLETION_TICKET_SCOPE,
      oauth_request_id: input.oauth_request_id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(COMPLETION_TICKET_AUDIENCE)
      .setSubject(input.jti)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${String(config.oauthCompletionTicketTtlSeconds)}s`)
      .sign(this.secret);
  }

  async verify(token: string): Promise<CompletionTicketClaims> {
    let raw: Record<string, unknown>;

    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
        audience: COMPLETION_TICKET_AUDIENCE,
      });
      raw = payload;
    } catch (err) {
      if (err instanceof joseErrors.JWTExpired) {
        throw new CompletionTicketError('ticket expired');
      }
      if (
        err instanceof joseErrors.JWSSignatureVerificationFailed ||
        err instanceof joseErrors.JWSInvalid ||
        err instanceof joseErrors.JWTInvalid ||
        err instanceof joseErrors.JWTClaimValidationFailed
      ) {
        throw new CompletionTicketError('invalid ticket');
      }
      throw new CompletionTicketError('invalid ticket');
    }

    const scope = raw['scope'];
    const oauthRequestId = raw['oauth_request_id'];
    const sub = raw['sub'];
    const jti = raw['jti'];

    if (scope !== COMPLETION_TICKET_SCOPE) {
      throw new CompletionTicketError('invalid ticket scope');
    }
    if (typeof oauthRequestId !== 'string' || !isUuid(oauthRequestId)) {
      throw new CompletionTicketError('invalid oauth_request_id claim');
    }
    if (typeof sub !== 'string' || !isUuid(sub)) {
      throw new CompletionTicketError('invalid sub claim');
    }
    if (typeof jti !== 'string') {
      throw new CompletionTicketError('invalid jti claim');
    }

    return { oauth_request_id: oauthRequestId, jti: sub };
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

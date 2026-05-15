import { signMerchantToken } from '@komercia-mcp/shared';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';


import { OAuthClientService } from './oauth-client.service.js';
import { OAuthCodeError, OAuthCodeService } from './oauth-code.service.js';
import { OAuthErrorFilter, OAuthException } from './oauth-error.filter.js';
import { PkceService } from './pkce.service.js';
import { grantTypeSchema, tokenRequestSchema } from './schemas.js';
import { KomerciaSessionService } from '../auth/komercia-session.service.js';
import { config } from '../config/env.js';

import type { IncomingMessage, ServerResponse } from 'node:http';

interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: 'read';
}

/**
 * RFC 6749 §3.2 token endpoint. v1 supports only `authorization_code` —
 * `refresh_token` is intentionally rejected (we issue a long-lived access
 * token instead; a refresh story will come in v2).
 */
@Controller('oauth')
@UseFilters(OAuthErrorFilter)
export class OAuthTokenController {
  constructor(
    private readonly clients: OAuthClientService,
    private readonly codes: OAuthCodeService,
    private readonly pkce: PkceService,
    private readonly sessions: KomerciaSessionService,
    @InjectPinoLogger(OAuthTokenController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
    @Headers('content-type') contentType: string | undefined,
    @Body() body: unknown,
  ): Promise<TokenResponse> {
    const payload = parseBody(body, contentType);

    const grantCheck = grantTypeSchema.safeParse(payload);
    if (!grantCheck.success) {
      throw new OAuthException('invalid_request', 'missing grant_type');
    }
    if (grantCheck.data.grant_type === 'refresh_token') {
      throw new OAuthException(
        'unsupported_grant_type',
        'refresh_token grant is not supported in v1',
      );
    }
    if (grantCheck.data.grant_type !== 'authorization_code') {
      throw new OAuthException(
        'unsupported_grant_type',
        `grant_type "${grantCheck.data.grant_type}" is not supported`,
      );
    }

    const parsed = tokenRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new OAuthException(
        'invalid_request',
        first?.message ?? 'invalid token request',
      );
    }
    const input = parsed.data;

    const client = await this.clients.findById(input.client_id);
    if (!client) {
      res.setHeader('WWW-Authenticate', 'Basic realm="komercia-mcp", error="invalid_client"');
      throw new OAuthException('invalid_client', 'unknown client_id', HttpStatus.UNAUTHORIZED);
    }
    if (!this.clients.validateRedirectUri(client, input.redirect_uri)) {
      throw new OAuthException('invalid_grant', 'redirect_uri not registered for client');
    }

    let codeRow;
    try {
      const validators: Parameters<typeof this.codes.redeemCode>[1] = {
        client_id: input.client_id,
        redirect_uri: input.redirect_uri,
      };
      if (input.resource !== undefined) {
        validators.resource = stripTrailingSlash(input.resource);
      }
      codeRow = await this.codes.redeemCode(input.code, validators);
    } catch (err) {
      if (err instanceof OAuthCodeError) {
        throw new OAuthException(err.code, err.message);
      }
      throw err;
    }

    if (!this.pkce.verify(input.code_verifier, codeRow.code_challenge)) {
      throw new OAuthException('invalid_grant', 'PKCE verification failed');
    }

    const session = await this.sessions.getMetadataByJti(codeRow.jti);
    if (!session) {
      throw new OAuthException('invalid_grant', 'session no longer active');
    }

    const accessToken = await signMerchantToken({
      secret: config.jwtSecret,
      sub: session.sub,
      store_id: session.store_id,
      email: session.email,
      scope: 'read',
      jti: session.jti,
      iss: config.oauthIssuerUrl,
      aud: config.oauthIssuerUrl,
      expirySeconds: config.oauthAccessTokenTtlSeconds,
    });

    // Best-effort audit trail; never blocks token issuance.
    void this.clients.touchLastUsed(input.client_id);

    this.logger.info(
      { client_id: input.client_id, jti: session.jti },
      'OAuth access token issued',
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: config.oauthAccessTokenTtlSeconds,
      scope: 'read',
    };
  }
}

function parseBody(body: unknown, contentType: string | undefined): Record<string, unknown> {
  if (typeof body === 'string' && (contentType ?? '').toLowerCase().includes('x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(body).entries());
  }
  if (body !== null && typeof body === 'object') {
    return body as Record<string, unknown>;
  }
  return {};
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

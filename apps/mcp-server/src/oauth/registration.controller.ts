import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';


import { OAuthClientService } from './oauth-client.service.js';
import { OAuthErrorFilter, OAuthException } from './oauth-error.filter.js';
import { dcrRequestSchema } from './schemas.js';
import { config } from '../config/env.js';
import { getSql } from '../db/db.js';

import type { IncomingMessage } from 'node:http';

/**
 * RFC 7591 Dynamic Client Registration endpoint.
 *
 * Public (no auth) — that's the whole point of DCR for MCP. The IP rate-limit
 * is the only thing standing between us and someone filling `oauth_clients`
 * with junk; tune via `OAUTH_DCR_RATE_LIMIT_PER_IP`.
 */
@Controller('oauth')
@UseFilters(OAuthErrorFilter)
export class OAuthRegistrationController {
  constructor(
    private readonly clients: OAuthClientService,
    @InjectPinoLogger(OAuthRegistrationController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Req() req: IncomingMessage,
    @Body() body: unknown,
  ): Promise<Record<string, unknown>> {
    const ip = clientIp(req);
    await this.enforceRateLimit(ip);

    const parsed = dcrRequestSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const isRedirectIssue =
        first?.path[0] === 'redirect_uris' ||
        (first?.message ?? '').includes('redirect_uri');
      throw new OAuthException(
        isRedirectIssue ? 'invalid_redirect_uri' : 'invalid_client_metadata',
        first?.message ?? 'invalid registration payload',
        HttpStatus.BAD_REQUEST,
      );
    }

    const client = await this.clients.register(parsed.data);

    this.logger.info({ client_id: client.client_id, ip }, 'DCR success');

    return {
      client_id: client.client_id,
      client_id_issued_at: Math.floor(client.created_at.getTime() / 1000),
      redirect_uris: client.redirect_uris,
      client_name: client.client_name,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
      scope: client.scope,
    };
  }

  private async enforceRateLimit(ip: string): Promise<void> {
    const sql = getSql();
    const key = `dcr_ip:${ip}`;
    const max = config.oauthDcrRateLimitPerIp;
    const windowSeconds = 60;

    const rows = await sql<{ count: number }[]>`
      INSERT INTO rate_limits (key, count, window_start, expires_at)
      VALUES (
        ${key},
        1,
        now(),
        now() + (${windowSeconds} || ' seconds')::interval
      )
      ON CONFLICT (key) DO UPDATE
      SET
        count = CASE
          WHEN rate_limits.expires_at < now() THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.expires_at < now() THEN now()
          ELSE rate_limits.window_start
        END,
        expires_at = CASE
          WHEN rate_limits.expires_at < now()
            THEN now() + (${windowSeconds} || ' seconds')::interval
          ELSE rate_limits.expires_at
        END
      RETURNING count
    `;

    const row = rows[0];
    if (row && row.count > max) {
      throw new OAuthException(
        'too_many_requests',
        'DCR rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') {
    const first = fwd.split(',')[0]?.trim();
    if (first && first.length > 0) return first;
  } else if (Array.isArray(fwd) && fwd[0]) {
    const first = fwd[0].split(',')[0]?.trim();
    if (first && first.length > 0) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

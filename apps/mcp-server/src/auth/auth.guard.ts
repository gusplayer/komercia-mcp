import {
  TokenExpiredError,
  TokenInvalidError,
  TokenMalformedError,
  verifyMerchantToken,
} from '@komercia-mcp/shared';
import {


  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { config } from '../config/env.js';

import type { MerchantContext } from './merchant-context.js';
import type {CanActivate, ExecutionContext} from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';

type RequestWithMerchantContext = IncomingMessage & {
  merchantContext: MerchantContext;
};

/**
 * RFC 9728 `WWW-Authenticate` challenge. MCP clients (Claude.ai et al.) read
 * `resource_metadata` to discover the OAuth flow when they hit a 401.
 */
function buildAuthChallenge(error?: string, description?: string): string {
  const params: string[] = [
    `realm="komercia-mcp"`,
    `resource_metadata="${config.oauthIssuerUrl}/.well-known/oauth-protected-resource"`,
  ];
  if (typeof error === 'string' && error.length > 0) {
    params.push(`error="${error}"`);
  }
  if (typeof description === 'string' && description.length > 0) {
    params.push(`error_description="${escapeQuoted(description)}"`);
  }
  return `Bearer ${params.join(', ')}`;
}

function escapeQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectPinoLogger(AuthGuard.name)
    private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithMerchantContext>();
    const response = context.switchToHttp().getResponse<ServerResponse>();

    const authHeader = request.headers.authorization;

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      response.setHeader('WWW-Authenticate', buildAuthChallenge());
      throw new UnauthorizedException('missing bearer token');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyMerchantToken({
        token,
        secret: config.jwtSecret,
        expectedAudience: config.oauthIssuerUrl,
      });

      // Defensive runtime check for forward compatibility — when SCOPES grows
      // beyond 'read', this guard becomes meaningful again.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (payload.scope !== 'read') {
        response.setHeader(
          'WWW-Authenticate',
          buildAuthChallenge('insufficient_scope', 'token scope is not sufficient'),
        );
        throw new UnauthorizedException('insufficient token scope');
      }

      this.logger.info({ jti: payload.jti }, 'Token verified successfully');

      const merchantContext: MerchantContext = {
        merchantId: payload.sub,
        storeId: payload.store_id,
        jti: payload.jti,
      };

      request.merchantContext = merchantContext;

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      if (err instanceof TokenExpiredError) {
        response.setHeader(
          'WWW-Authenticate',
          buildAuthChallenge('invalid_token', 'token expired'),
        );
        throw new UnauthorizedException('token expired');
      }

      if (err instanceof TokenInvalidError || err instanceof TokenMalformedError) {
        response.setHeader(
          'WWW-Authenticate',
          buildAuthChallenge('invalid_token', 'token is invalid'),
        );
        throw new UnauthorizedException('invalid token');
      }

      this.logger.error({ err }, 'Unexpected error during token verification');
      response.setHeader(
        'WWW-Authenticate',
        buildAuthChallenge('invalid_token', 'token is invalid'),
      );
      throw new UnauthorizedException('invalid token');
    }
  }
}

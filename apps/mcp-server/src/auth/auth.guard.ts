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
import type { IncomingMessage } from 'node:http';

type RequestWithMerchantContext = IncomingMessage & {
  merchantContext: MerchantContext;
};

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

    const authHeader = request.headers.authorization;

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyMerchantToken(token, config.jwtSecret);

      // Defensive runtime check for forward compatibility — when SCOPES grows
      // beyond 'read', this guard becomes meaningful again.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (payload.scope !== 'read') {
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
        throw new UnauthorizedException('token expired');
      }

      if (err instanceof TokenInvalidError || err instanceof TokenMalformedError) {
        throw new UnauthorizedException('invalid token');
      }

      this.logger.error({ err }, 'Unexpected error during token verification');
      throw new UnauthorizedException('invalid token');
    }
  }
}

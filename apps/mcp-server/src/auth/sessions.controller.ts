import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';

import { AuthGuard } from './auth.guard.js';
import { KomerciaSessionService } from './komercia-session.service.js';

import type { MerchantContext } from './merchant-context.js';
import type { IncomingMessage } from 'node:http';

type AuthenticatedRequest = IncomingMessage & { merchantContext: MerchantContext };

/**
 * Self-service revocation: a merchant who controls a valid JWT can revoke
 * its own session. Useful for logout flows or when a token is suspected leaked.
 *
 * After revocation:
 *  - getSession() returns null → tool calls respond with "Authentication required".
 *  - The user must log in again at mcp.komercia.co to obtain a new token.
 *
 * NOTE: this only revokes OUR JWT. The underlying Komercia tokens are not
 * invalidated server-side (Komercia has no logout endpoint), but they become
 * unreachable because they live encrypted in the revoked row.
 */
@Controller('sessions')
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(private readonly sessions: KomerciaSessionService) {}

  @Post('revoke')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async revoke(@Req() req: AuthenticatedRequest): Promise<{ revoked: boolean }> {
    const { jti } = req.merchantContext;
    const revoked = await this.sessions.revoke(jti);
    this.logger.log({ jti, revoked }, 'Session revoke request');
    return { revoked };
  }
}

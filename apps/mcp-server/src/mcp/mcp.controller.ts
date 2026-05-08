import { Body, Controller, ForbiddenException, Get, Post, Req, Res, UseGuards } from '@nestjs/common';

import { McpService } from './mcp.service.js';
import { AuthGuard } from '../auth/auth.guard.js';

import type { MerchantContext } from '../auth/merchant-context.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

type AuthenticatedRequest = IncomingMessage & { merchantContext: MerchantContext };

/**
 * SSE transport endpoints.
 *
 * Both endpoints are guarded by AuthGuard (Bearer JWT). On `/messages` we also
 * cross-check that the request's JWT jti matches the merchantContext bound to
 * the SSE session at connect time — this prevents a stolen sessionId UUID from
 * being usable on its own.
 */
@Controller()
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('sse')
  @UseGuards(AuthGuard)
  async sse(
    @Req() req: AuthenticatedRequest,
    @Res() res: ServerResponse,
  ): Promise<void> {
    await this.mcpService.connectSSE(res, req.merchantContext);
  }

  @Post('messages')
  @UseGuards(AuthGuard)
  async messages(
    @Req() req: AuthenticatedRequest,
    @Res() res: ServerResponse,
    @Body() body: unknown,
  ): Promise<void> {
    const url = req.url ?? '';
    const qs = url.includes('?') ? url.split('?')[1] : '';
    const sessionId = qs?.split('&').find((p) => p.startsWith('sessionId='))?.split('=')[1];
    if (sessionId) {
      const sessionJti = this.mcpService.getSessionJti(sessionId);
      if (sessionJti !== undefined && sessionJti !== req.merchantContext.jti) {
        throw new ForbiddenException('sessionId does not belong to this token');
      }
    }
    await this.mcpService.handleMessage(req, res, body);
  }
}

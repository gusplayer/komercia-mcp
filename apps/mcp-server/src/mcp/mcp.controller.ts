import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthGuard } from '../auth/auth.guard.js';
import { McpService } from './mcp.service.js';
import type { MerchantContext } from '../auth/merchant-context.js';

type AuthenticatedRequest = IncomingMessage & { merchantContext: MerchantContext };

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
    @Req() req: IncomingMessage,
    @Res() res: ServerResponse,
  ): Promise<void> {
    await this.mcpService.handleMessage(req, res);
  }
}

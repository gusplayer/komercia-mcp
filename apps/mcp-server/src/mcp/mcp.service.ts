import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
  
  
} from '@modelcontextprotocol/sdk/types.js';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { ToolRegistry } from './tool.registry.js';
import { config } from '../config/env.js';

import type { MerchantContext } from '../auth/merchant-context.js';
import type {CallToolResult, ServerResult} from '@modelcontextprotocol/sdk/types.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SERVER_VERSION = '0.1.0';

function asServerResult(result: CallToolResult): ServerResult {
  return result;
}

interface SseSession {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- TODO: migrate transport
  transport: SSEServerTransport;
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- TODO: migrate to McpServer
  server: Server;
  merchantContext: MerchantContext;
}

@Injectable()
export class McpService implements OnModuleInit {
  private readonly sseSessions = new Map<string, SseSession>();

  constructor(
    @InjectPinoLogger(McpService.name)
    private readonly logger: PinoLogger,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    if (config.mcpTransport === 'stdio') {
      // Stdio mode: a single Server bound to a placeholder context (the local
      // shell user is implicitly the only merchant). Useful for Claude Desktop.
      const stdioContext: MerchantContext = {
        merchantId: 'stdio-merchant',
        storeId: 'stdio-store',
        jti: 'stdio-jti',
      };
      const server = this.buildServer(stdioContext);
      await server.connect(new StdioServerTransport());
      this.logger.info('MCP server connected via stdio transport');
    }
  }

  /**
   * Builds a Server instance whose tool handlers close over a specific
   * merchantContext. One server per HTTP/SSE connection, so each merchant
   * gets isolated tool execution with their own jti.
   */
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- TODO: migrate to McpServer
  private buildServer(merchantContext: MerchantContext): Server {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- TODO: migrate to McpServer
    const server = new Server(
      { name: 'komercia-mcp', version: SERVER_VERSION },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: this.toolRegistry.getAll().map((t) => t.definition),
    }));

    server.setRequestHandler(
      CallToolRequestSchema,
      async (request): Promise<ServerResult> => {
        const { name, arguments: args } = request.params;
        const tool = this.toolRegistry.find(name);
        if (tool === undefined) {
          return asServerResult({
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          });
        }
        try {
          const result = await tool.execute(args, merchantContext);
          return asServerResult(result);
        } catch (err) {
          this.logger.error({ err, toolName: name, jti: merchantContext.jti }, 'Tool execution error');
          return asServerResult({
            content: [{ type: 'text', text: 'An error occurred while executing the tool.' }],
            isError: true,
          });
        }
      },
    );

    return server;
  }

  async connectSSE(
    res: ServerResponse,
    merchantContext: MerchantContext,
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- TODO: migrate transport
  ): Promise<SSEServerTransport> {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- TODO: migrate transport
    const transport = new SSEServerTransport('/messages', res);
    const server = this.buildServer(merchantContext);

    this.sseSessions.set(transport.sessionId, { transport, server, merchantContext });

    transport.onclose = () => {
      this.logger.info(
        { sessionId: transport.sessionId, merchantId: merchantContext.merchantId },
        'SSE transport closed',
      );
      this.sseSessions.delete(transport.sessionId);
    };

    await server.connect(transport);

    this.logger.info(
      {
        sessionId: transport.sessionId,
        merchantId: merchantContext.merchantId,
        storeId: merchantContext.storeId,
      },
      'SSE transport connected',
    );
    return transport;
  }

  /**
   * Handles JSON-RPC messages posted by the client. The `parsedBody` arg lets
   * Nest's body parser do its job; the SDK transport will skip its own getRawBody
   * when a parsed body is provided.
   */
  /**
   * Returns the merchantContext.jti bound to the given SSE sessionId at
   * connect time, or undefined if no session is open. Used by McpController
   * to cross-check the JWT presented on POST /messages against the JWT used
   * to open the SSE — defense-in-depth so a leaked sessionId UUID is not by
   * itself enough to drive tool calls.
   */
  getSessionJti(sessionId: string): string | undefined {
    return this.sseSessions.get(sessionId)?.merchantContext.jti;
  }

  async handleMessage(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody: unknown,
  ): Promise<void> {
    const url = req.url ?? '';
    const qs = url.includes('?') ? url.split('?')[1] : '';
    const sessionId = qs?.split('&').find((p) => p.startsWith('sessionId='))?.split('=')[1];

    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing sessionId query parameter' }));
      return;
    }

    const session = this.sseSessions.get(sessionId);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    await session.transport.handlePostMessage(req, res, parsedBody);
  }
}

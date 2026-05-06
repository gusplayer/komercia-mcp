import { Injectable, OnModuleInit } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type ServerResult,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from '../config/env.js';
import { ToolRegistry } from './tool.registry.js';
import type { MerchantContext } from '../auth/merchant-context.js';

const SERVER_VERSION = '0.1.0';

function asServerResult(result: CallToolResult): ServerResult {
  return result as unknown as ServerResult;
}

@Injectable()
export class McpService implements OnModuleInit {
  private readonly server: Server;
  private readonly sseTransports = new Map<string, SSEServerTransport>();

  constructor(
    @InjectPinoLogger(McpService.name)
    private readonly logger: PinoLogger,
    private readonly toolRegistry: ToolRegistry,
  ) {
    this.server = new Server(
      { name: 'komercia-mcp', version: SERVER_VERSION },
      { capabilities: { tools: {} } },
    );
  }

  async onModuleInit(): Promise<void> {
    this.registerHandlers();

    if (config.mcpTransport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('MCP server connected via stdio transport');
    }
  }

  private registerHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.getAll().map((t) => t.definition);
      return { tools };
    });

    this.server.setRequestHandler(
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

        // For stdio transport, no HTTP context is available — use a placeholder merchant context.
        const merchantContext: MerchantContext = {
          merchantId: 'stdio-merchant',
          storeId: 'stdio-store',
          jti: 'stdio-jti',
        };

        try {
          const result = await tool.execute(args, merchantContext);
          return asServerResult(result);
        } catch (err) {
          this.logger.error({ err, toolName: name }, 'Tool execution error');
          return asServerResult({
            content: [
              {
                type: 'text',
                text: 'An error occurred while executing the tool.',
              },
            ],
            isError: true,
          });
        }
      },
    );
  }

  async connectSSE(
    res: ServerResponse,
    merchantContext: MerchantContext,
  ): Promise<SSEServerTransport> {
    const transport = new SSEServerTransport('/messages', res);

    this.sseTransports.set(transport.sessionId, transport);

    transport.onclose = () => {
      this.logger.info(
        {
          sessionId: transport.sessionId,
          merchantId: merchantContext.merchantId,
        },
        'SSE transport closed',
      );
      this.sseTransports.delete(transport.sessionId);
    };

    await this.server.connect(transport);

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

  async handleMessage(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '';
    const queryString = url.includes('?') ? url.split('?')[1] : '';
    const sessionId = queryString
      ?.split('&')
      .find((p) => p.startsWith('sessionId='))
      ?.split('=')[1];

    if (sessionId === undefined || sessionId === '') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing sessionId query parameter' }));
      return;
    }

    const transport = this.sseTransports.get(sessionId);

    if (transport === undefined) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    await transport.handlePostMessage(req, res);
  }
}

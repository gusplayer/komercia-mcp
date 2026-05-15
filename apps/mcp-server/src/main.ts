import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { config } from './config/env.js';

import type { IncomingMessage, ServerResponse } from 'node:http';

interface ExpressLikeRequest extends IncomingMessage {
  path?: string;
}

type NextFn = (err?: unknown) => void;

/**
 * Public OAuth discovery endpoints (RFC 8414, RFC 9728) and Dynamic Client
 * Registration (RFC 7591) MUST be reachable from any origin — they're how
 * MCP clients bootstrap the auth flow. Everything else stays gated by the
 * configured allowlist.
 */
function isPublicOAuthPath(req: ExpressLikeRequest): boolean {
  const url = req.url ?? '';
  const path = (req.path ?? url.split('?')[0]) ?? '';
  if (path.startsWith('/.well-known/')) return true;
  if (path === '/oauth/register' && (req.method === 'POST' || req.method === 'OPTIONS')) {
    return true;
  }
  return false;
}

function oauthCorsMiddleware(
  req: ExpressLikeRequest,
  res: ServerResponse,
  next: NextFn,
): void {
  if (!isPublicOAuthPath(req)) {
    next();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
}

async function bootstrap(): Promise<void> {
  if (config.mcpTransport === 'stdio') {
    // In stdio mode: create NestJS app context for DI but do NOT start HTTP server.
    // The MCP SDK StdioServerTransport (connected in McpService.onModuleInit) handles I/O.
    const app = await NestFactory.createApplicationContext(AppModule, {
      bufferLogs: true,
    });

    app.useLogger(app.get(Logger));
    await app.init();
  } else {
    // HTTP mode: full NestJS HTTP server on MCP_PORT.
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
    });

    app.useLogger(app.get(Logger));

    // OAuth discovery + DCR must be reachable cross-origin (Allow-Origin: *).
    // Registered BEFORE enableCors so the wildcard wins for these paths.
    app.use(oauthCorsMiddleware);

    if (config.mcpAllowedOrigins.length > 0) {
      app.enableCors({
        origin: config.mcpAllowedOrigins,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      });
    }

    await app.listen(config.mcpPort);

    const logger = app.get(Logger);
    logger.log(
      `MCP server listening on port ${String(config.mcpPort)} (HTTP/SSE transport)`,
    );
  }
}

void bootstrap().catch((err: unknown) => {

  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { config } from './config/env.js';

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

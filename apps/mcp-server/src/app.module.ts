import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import type { Options } from 'pino-http';
import { McpModule } from './mcp/mcp.module.js';
import { HealthController } from './health/health.controller.js';
import { McpErrorFilter } from './common/filters/mcp-error.filter.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';
import { config } from './config/env.js';

const pinoHttpOptions: Options = {
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  redact: {
    paths: ['req.headers.authorization'],
    censor: '[REDACTED]',
  },
  ...(config.nodeEnv !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
};

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: pinoHttpOptions,
    }),
    McpModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: McpErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
  ],
})
export class AppModule {}

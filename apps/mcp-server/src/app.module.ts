import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { McpErrorFilter } from './common/filters/mcp-error.filter.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';
import { config } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { McpModule } from './mcp/mcp.module.js';

import type { Options } from 'pino-http';

// Defense-in-depth redaction: even if a future logger.info() accidentally
// includes a token or password in its payload, these paths get scrubbed
// before the log line is emitted.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.email_encrypted',
  'req.body.password_encrypted',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.access_token',
  '*.refresh_token',
  '*.nodeToken',
  '*.laravelToken',
  '*.email_encrypted',
  '*.password_encrypted',
  '*.node_token',
  '*.laravel_token',
];

const pinoHttpOptions: Options = {
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
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
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS modules are decorator-driven empty classes
export class AppModule {}

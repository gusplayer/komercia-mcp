import {
  
  Catch,
  
  HttpException
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { REQUEST_ID_HEADER } from '../interceptors/request-id.interceptor.js';

import type {ArgumentsHost, ExceptionFilter} from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';

@Catch()
export class McpErrorFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(McpErrorFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(err: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<IncomingMessage>();
    const response = ctx.getResponse<ServerResponse>();

    const requestId = request.headers[REQUEST_ID_HEADER] ?? 'unknown';

    const statusCode =
      err instanceof HttpException ? err.getStatus() : 500;

    if (statusCode >= 500) {
      this.logger.error(
        { err: err instanceof Error ? err.message : String(err), requestId },
        'Unhandled error',
      );
    } else {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), requestId },
        'Request error',
      );
    }

    if (err instanceof HttpException) {
      const httpResponse = err.getResponse();
      response.writeHead(statusCode, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(httpResponse));
      return;
    }

    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        content: [
          {
            type: 'text',
            text: `Internal server error. Request ID: ${String(requestId)}`,
          },
        ],
      }),
    );
  }
}

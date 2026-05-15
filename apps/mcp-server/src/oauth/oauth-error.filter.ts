import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ServerResponse } from 'node:http';

/**
 * RFC 6749 §5.2-style error body. Thrown from any OAuth controller to surface
 * a properly-shaped `{ error, error_description }` JSON response.
 */
export class OAuthException extends HttpException {
  constructor(
    public readonly error: string,
    public readonly errorDescription: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    extraHeaders?: Record<string, string>,
  ) {
    super({ error, error_description: errorDescription }, status);
    if (extraHeaders) {
      this.extraHeaders = extraHeaders;
    }
  }

  public extraHeaders?: Record<string, string>;
}

/**
 * Reshapes any HttpException raised inside OAuth controllers into the
 * `{ error, error_description }` body required by RFC 6749 §5.2.
 *
 * Preserves headers attached to the response BEFORE the throw (e.g. the
 * `WWW-Authenticate` header set by the token endpoint on invalid_client).
 */
@Catch(HttpException)
export class OAuthErrorFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(OAuthErrorFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(err: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ServerResponse>();

    const status = err.getStatus();
    const responseBody: unknown = err.getResponse();

    let body: { error: string; error_description: string };

    if (err instanceof OAuthException) {
      body = { error: err.error, error_description: err.errorDescription };
      if (err.extraHeaders) {
        for (const [k, v] of Object.entries(err.extraHeaders)) {
          response.setHeader(k, v);
        }
      }
    } else if (
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'error' in responseBody &&
      'error_description' in responseBody
    ) {
      // Already-shaped payload (e.g. zod parse path that throws OAuthException
      // upstream).
      body = {
        error: String(responseBody.error),
        error_description: String(responseBody.error_description),
      };
    } else {
      // Last-resort mapping for generic exceptions thrown by Nest itself
      // (BadRequestException, etc.).
      const message =
        typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody
          ? String(responseBody.message)
          : err.message;
      const unauthorized: number = HttpStatus.UNAUTHORIZED;
      body = {
        error: status === unauthorized ? 'invalid_client' : 'invalid_request',
        error_description: message,
      };
    }

    this.logger.warn({ status, error: body.error }, 'OAuth error response');

    if (!response.headersSent) {
      response.setHeader('Content-Type', 'application/json');
    }
    response.statusCode = status;
    response.end(JSON.stringify(body));
  }
}

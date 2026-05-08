import {
  
  
  Injectable
  
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

import type {CallHandler, ExecutionContext, NestInterceptor} from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Observable } from 'rxjs';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<IncomingMessage>();
    const response = context.switchToHttp().getResponse<ServerResponse>();

    const existingId = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof existingId === 'string' && existingId.length > 0
        ? existingId
        : crypto.randomUUID();

    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle().pipe(
      tap(() => {
        if (!response.headersSent) {
          response.setHeader(REQUEST_ID_HEADER, requestId);
        }
      }),
    );
  }
}

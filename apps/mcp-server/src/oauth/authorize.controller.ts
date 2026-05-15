import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';


import { CompletionTicketError, CompletionTicketService } from './completion-ticket.service.js';
import { OAuthClientService } from './oauth-client.service.js';
import { OAuthCodeService } from './oauth-code.service.js';
import { authorizeQuerySchema, completeQuerySchema } from './schemas.js';
import { config } from '../config/env.js';
import { getSql } from '../db/db.js';

import type { ServerResponse } from 'node:http';

/**
 * The two-step `/oauth/authorize` flow.
 *
 *   GET  /oauth/authorize             — browser-initiated; redirects to the
 *                                       web app's /sign-in with an opaque
 *                                       `oauth_request` id.
 *   GET  /oauth/authorize/complete    — invoked by the web app after login;
 *                                       redeems a signed completion ticket
 *                                       and mints the authorization code.
 *
 * Validation that fails BEFORE we trust the redirect_uri must NEVER redirect
 * (open-redirect protection). Errors after redirect_uri is trusted go back
 * to the caller per RFC 6749 §4.1.2.1.
 */
@Controller('oauth')
export class OAuthAuthorizeController {
  constructor(
    private readonly clients: OAuthClientService,
    private readonly codes: OAuthCodeService,
    private readonly tickets: CompletionTicketService,
    @InjectPinoLogger(OAuthAuthorizeController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get('authorize')
  async authorize(
    @Query() query: Record<string, string>,
    @Res() res: ServerResponse,
  ): Promise<void> {
    const parsed = authorizeQuerySchema.safeParse(query);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      this.renderErrorHtml(res, 400, 'invalid_request', first?.message ?? 'malformed request');
      return;
    }

    const q = parsed.data;

    const client = await this.clients.findById(q.client_id);
    if (!client) {
      this.renderErrorHtml(res, 400, 'invalid_client', 'unknown client_id');
      return;
    }
    if (!this.clients.validateRedirectUri(client, q.redirect_uri)) {
      this.renderErrorHtml(
        res,
        400,
        'invalid_redirect_uri',
        'redirect_uri is not registered for this client',
      );
      return;
    }

    // From here on, redirecting back to redirect_uri is safe.
    const resource = stripTrailingSlash(q.resource);
    if (resource !== config.oauthIssuerUrl) {
      this.redirectWithError(
        res,
        q.redirect_uri,
        q.state,
        'invalid_target',
        'resource does not match this authorization server',
      );
      return;
    }

    const scope = (q.scope ?? 'read').trim();
    const scopeParts = scope.split(/\s+/).filter(Boolean);
    if (scopeParts.length === 0 || scopeParts.some((s) => s !== 'read')) {
      this.redirectWithError(
        res,
        q.redirect_uri,
        q.state,
        'invalid_scope',
        'only "read" scope is supported',
      );
      return;
    }

    const requestId = await this.codes.createRequest({
      client_id: q.client_id,
      redirect_uri: q.redirect_uri,
      code_challenge: q.code_challenge,
      scope: 'read',
      state: q.state,
      resource,
    });

    this.logger.info(
      { client_id: q.client_id, request_id: requestId },
      'OAuth authorization request created',
    );

    const target = `${config.webBaseUrl}/sign-in?oauth_request=${encodeURIComponent(requestId)}`;
    res.statusCode = 302;
    res.setHeader('Location', target);
    res.end();
  }

  @Get('authorize/complete')
  async complete(
    @Query() query: Record<string, string>,
    @Res() res: ServerResponse,
  ): Promise<void> {
    const parsed = completeQuerySchema.safeParse(query);
    if (!parsed.success) {
      this.renderErrorHtml(res, 400, 'invalid_request', 'missing ticket');
      return;
    }

    let claims: { oauth_request_id: string; jti: string };
    try {
      claims = await this.tickets.verify(parsed.data.ticket);
    } catch (err) {
      const message = err instanceof CompletionTicketError ? err.message : 'invalid ticket';
      this.renderErrorHtml(res, 400, 'invalid_request', message);
      return;
    }

    const request = await this.codes.findRequest(claims.oauth_request_id);
    if (!request) {
      this.renderErrorHtml(res, 400, 'invalid_request', 'unknown oauth_request');
      return;
    }
    if (request.consumed_at !== null) {
      this.renderErrorHtml(res, 400, 'invalid_request', 'oauth_request already consumed');
      return;
    }
    if (request.expires_at.getTime() <= Date.now()) {
      this.renderErrorHtml(res, 400, 'invalid_request', 'oauth_request expired');
      return;
    }

    // Verify the merchant session is still active.
    const sessionOk = await this.isSessionActive(claims.jti);
    if (!sessionOk) {
      this.renderErrorHtml(res, 400, 'invalid_request', 'session is not active');
      return;
    }

    const code = await this.codes.issueCodeForRequest(request, claims.jti);

    this.logger.info(
      { request_id: request.request_id, client_id: request.client_id },
      'OAuth authorization code issued',
    );

    const target = `${request.redirect_uri}${request.redirect_uri.includes('?') ? '&' : '?'}code=${encodeURIComponent(code)}&state=${encodeURIComponent(request.state)}`;
    res.statusCode = 302;
    res.setHeader('Location', target);
    res.end();
  }

  private async isSessionActive(jti: string): Promise<boolean> {
    const sql = getSql();
    const rows = await sql<{ ok: boolean }[]>`
      SELECT true AS ok
      FROM komercia_sessions
      WHERE jti = ${jti}::uuid
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `;
    return rows.length > 0;
  }

  private redirectWithError(
    res: ServerResponse,
    redirectUri: string,
    state: string,
    error: string,
    description: string,
  ): void {
    const sep = redirectUri.includes('?') ? '&' : '?';
    const target = `${redirectUri}${sep}error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(description)}&state=${encodeURIComponent(state)}`;
    res.statusCode = 302;
    res.setHeader('Location', target);
    res.end();
  }

  private renderErrorHtml(
    res: ServerResponse,
    status: number,
    code: string,
    description: string,
  ): void {
    const safeCode = escapeHtml(code);
    const safeDesc = escapeHtml(description);
    const body = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Authorization error</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:6rem auto;padding:0 1rem;color:#1f2937}h1{font-size:1.5rem;margin-bottom:0.5rem}code{background:#f3f4f6;padding:0.15rem 0.35rem;border-radius:4px}</style>
</head>
<body>
<h1>Authorization error</h1>
<p><code>${safeCode}</code></p>
<p>${safeDesc}</p>
</body></html>`;
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(body);
  }
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

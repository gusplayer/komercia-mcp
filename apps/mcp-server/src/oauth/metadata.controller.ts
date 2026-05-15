import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { config } from '../config/env.js';

const SERVICE_DOCUMENTATION = 'https://mcp.komercia.co';

/**
 * RFC 8414 (Authorization Server Metadata) and RFC 9728 (Protected Resource
 * Metadata) discovery documents. Both are publicly cacheable — CORS for them
 * is handled by the per-path middleware in `main.ts`.
 */
@Controller('.well-known')
export class OAuthMetadataController {
  @Get('oauth-authorization-server')
  @HttpCode(HttpStatus.OK)
  authorizationServer(): Record<string, unknown> {
    const issuer = config.oauthIssuerUrl;
    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      scopes_supported: ['read'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      service_documentation: SERVICE_DOCUMENTATION,
    };
  }

  @Get('oauth-protected-resource')
  @HttpCode(HttpStatus.OK)
  protectedResource(): Record<string, unknown> {
    const issuer = config.oauthIssuerUrl;
    return {
      resource: issuer,
      authorization_servers: [issuer],
      scopes_supported: ['read'],
      bearer_methods_supported: ['header'],
      resource_documentation: SERVICE_DOCUMENTATION,
    };
  }
}

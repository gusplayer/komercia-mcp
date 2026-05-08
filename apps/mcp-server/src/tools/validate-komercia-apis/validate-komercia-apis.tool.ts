import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { NodeTokenRefresher } from '../../auth/node-token-refresher.service.js';
import { config } from '../../config/env.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';

import type { MerchantContext } from '../../auth/merchant-context.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface BackendCheckResult {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'auth_error';
  responseTimeMs: number;
  httpStatus?: number;
}

@Injectable()
export class ValidateKomerciaApisTool implements ITool, OnModuleInit {
  private readonly logger = new Logger(ValidateKomerciaApisTool.name);
  readonly definition: Tool = {
    name: 'validate_komercia_apis',
    description:
      'Validates connectivity and authentication against all Komercia backend API endpoints. ' +
      'Use this tool to diagnose connection issues, confirm your credentials are valid, ' +
      'or verify the Komercia service is reachable before attempting data exports. ' +
      'Returns the status of each API endpoint checked. ' +
      'Example prompts: "Check if my Komercia connection is working", ' +
      '"Are the APIs reachable?", "Validate my store credentials".',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly sessionService: KomerciaSessionService,
    private readonly nodeTokenRefresher: NodeTokenRefresher,
  ) {}

  onModuleInit(): void {
    this.toolRegistry.register(this);
  }

  async execute(
    _args: unknown,
    merchantContext: MerchantContext,
  ): Promise<CallToolResult> {
    const session = await this.sessionService.getSession(merchantContext.jti);

    if (session === null) {
      return {
        content: [
          {
            type: 'text',
            text: 'Authentication required: your Komercia session has expired or was not found. Please log in again at mcp.komercia.co.',
          },
        ],
      };
    }

    try {
      await this.nodeTokenRefresher.ensureFresh(session);
    } catch (err) {
      // If refresh fails (e.g. session was auto-revoked), proceed with the
      // (likely stale) token — the Node check below will surface this as
      // auth_error in the report. We still log so ops can see the cause.
      this.logger.warn(
        { err: (err as Error).message, jti: merchantContext.jti },
        'Node token refresh failed during validate_komercia_apis; running with stale token',
      );
    }

    const checks = await Promise.allSettled([
      this.checkBackend(
        'NodeJS (api.komercia.app)',
        config.nodeUrl,
        `/api/v1/stores/info/${merchantContext.storeId}`,
        { 'KOMERCIA_PUBLIC_ROUTES_KEY': config.nodePublicKey },
      ),
      this.checkBackend(
        'Laravel (api2.komercia.co)',
        config.laravelUrl,
        `/api/admin/tiendas/${merchantContext.storeId}`,
        { Authorization: `Bearer ${session.laravelToken}` },
      ),
    ]);

    const results: BackendCheckResult[] = checks.map((result, i) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const names = ['NodeJS (api.komercia.app)', 'Laravel (api2.komercia.co)'];
      return {
        name: names[i] ?? `Backend ${String(i + 1)}`,
        url: i === 0 ? config.nodeUrl : config.laravelUrl,
        status: 'offline' as const,
        responseTimeMs: 0,
      };
    });

    const rows = results.map((r) => {
      const statusIcon = r.status === 'online' ? '✓ Online' : r.status === 'auth_error' ? '⚠ Auth Error' : '✗ Offline';
      return `| ${r.name} | ${statusIcon} | ${String(r.responseTimeMs)}ms |`;
    });

    const text = [
      '# Komercia API Health Check',
      '',
      '| Backend | Status | Response Time |',
      '|---------|--------|---------------|',
      ...rows,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async checkBackend(
    name: string,
    baseUrl: string,
    path: string,
    headers: Record<string, string>,
  ): Promise<BackendCheckResult> {
    const url = `${baseUrl}${path}`;
    const start = Date.now();

    try {
      const signal = AbortSignal.timeout(10_000);
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', ...headers },
        signal,
      });
      const responseTimeMs = Date.now() - start;

      if (response.status === 401 || response.status === 403) {
        return { name, url: baseUrl, status: 'auth_error', responseTimeMs, httpStatus: response.status };
      }

      // Any response (even 404) means the backend is reachable
      return {
        name,
        url: baseUrl,
        status: 'online',
        responseTimeMs,
        httpStatus: response.status,
      };
    } catch {
      const responseTimeMs = Date.now() - start;
      return { name, url: baseUrl, status: 'offline', responseTimeMs };
    }
  }
}

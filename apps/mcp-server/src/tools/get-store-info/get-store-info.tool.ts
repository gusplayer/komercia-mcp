import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { KomerciaClient } from '@komercia-mcp/komercia-client';
import type { Store } from '@komercia-mcp/shared';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';
import { KomerciaSessionService } from '../../auth/komercia-session.service.js';

export interface KomerciaStoresClient {
  get(storeId: string): Promise<Store>;
}

export interface KomerciaClientInterface {
  stores: KomerciaStoresClient;
}

@Injectable()
export class GetStoreInfoTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'get_store_info',
    description:
      "Returns basic information about the merchant's Komercia store, " +
      'including the store name, domain URL, current plan, registration email, ' +
      'creation date, and whether the store is currently active. ' +
      'Use this tool first to confirm you are connected to the right store before ' +
      'running any exports or data queries. ' +
      "Example prompts: \"What's the name of my store?\", \"Show me my store details\", " +
      '"Is my store active?", "What plan am I on?".',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  constructor(
    private readonly toolRegistry: ToolRegistry,
    @Optional()
    private readonly injectedClient: KomerciaClientInterface | null,
    @Optional()
    private readonly sessionService: KomerciaSessionService | null = null,
  ) {}

  onModuleInit(): void {
    this.toolRegistry.register(this);
  }

  async execute(
    _args: unknown,
    merchantContext: MerchantContext,
  ): Promise<CallToolResult> {
    try {
      // If an injected test client is provided, use it directly (test mode / DI override)
      if (this.injectedClient !== null) {
        const store = await this.injectedClient.stores.get(merchantContext.storeId);
        return { content: [{ type: 'text', text: formatStore(store) }] };
      }

      // Session-based flow (production) — requires sessionService to be wired up
      if (this.sessionService === null) {
        return {
          content: [
            {
              type: 'text',
              text: [
                '# Store Information (Mock)',
                '',
                `Store ID: ${merchantContext.storeId}`,
                'Name: My Komercia Store',
                'Domain: https://my-store.komercia.co',
                'Plan: Basic',
                'Email: owner@example.com',
                'Created: 2024-01-15',
                'Status: Active',
                '',
                '(Note: Komercia client is not configured. Showing placeholder data.)',
              ].join('\n'),
            },
          ],
        };
      }

      const session = await this.sessionService.getSession(merchantContext.jti);

      if (session === null) {
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication required: your Komercia session has expired or was not found. Please request a new magic link at web.komercia-exit.com.',
            },
          ],
        };
      }

      // Import config lazily so tests that don't reach this branch
      // don't require JWT_SECRET to be present in the environment.
      const { config } = await import('../../config/env.js');

      const client = new KomerciaClient({
        nodeUrl: config.nodeUrl,
        laravelUrl: config.laravelUrl,
        editorUrl: config.editorUrl,
        nodePublicKey: config.nodePublicKey,
        nodeToken: session.nodeToken,
        laravelToken: session.laravelToken,
        storeId: merchantContext.storeId,
      });

      const store = await client.stores.get(merchantContext.storeId);

      return {
        content: [
          {
            type: 'text',
            text: formatStore(store),
          },
        ],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to retrieve store information: ${message}`,
          },
        ],
      };
    }
  }
}

function formatStore(store: Store): string {
  const lines = [
    '# Store Information',
    '',
    `**Name:** ${store.name}`,
    `**Store ID:** ${store.id}`,
    `**Domain:** ${store.domain}`,
    `**Plan:** ${store.plan}`,
    `**Email:** ${store.email}`,
    `**Created:** ${store.created_at}`,
    `**Status:** ${store.active ? 'Active' : 'Inactive'}`,
  ];

  return lines.join('\n');
}

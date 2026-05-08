import { Injectable, OnModuleInit } from '@nestjs/common';

import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { NodeTokenRefresher } from '../../auth/node-token-refresher.service.js';
import { config } from '../../config/env.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';

import type { MerchantContext } from '../../auth/merchant-context.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

@Injectable()
export class ExportThemeConfigTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_theme_config',
    description:
      "Exports the merchant's Komercia store theme configuration. " +
      'Includes colors, fonts, layout settings, and any customizations applied to the storefront. ' +
      'Useful for backing up design settings, documenting the store appearance, or migrating the theme to another platform. ' +
      'Example prompts: "Export my store theme settings", ' +
      '"What colors and fonts does my store use?", ' +
      '"Back up my theme configuration".',
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
      const signal = AbortSignal.timeout(10_000);
      const response = await fetch(`${config.nodeUrl}/api/v1/templates/websites`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.nodeToken}`,
          'KOMERCIA_PUBLIC_ROUTES_KEY': config.nodePublicKey,
        },
        signal,
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: [
                '**Theme Configuration — Not Available via API**',
                '',
                `The Komercia theme endpoint returned HTTP ${String(response.status)}.`,
                'This endpoint is not stable in the current version of the Komercia API.',
                '',
                'To export your theme settings manually:',
                '1. Log in to your Komercia admin panel',
                '2. Navigate to **Design → Theme Settings**',
                '3. Use your browser developer tools to capture the current theme JSON',
                '',
                'Your store info (colors, fonts, template ID) is included in the `get_store_info` output.',
              ].join('\n'),
            },
          ],
        };
      }

      const data: unknown = await response.json();

      const formatted = JSON.stringify(data, null, 2);

      const output = [
        '**Theme Configuration Export**',
        '',
        'This JSON contains your active storefront theme settings including colors, fonts, layout configuration, and any design customizations.',
        '',
        '```json',
        formatted,
        '```',
        '',
        '_To restore these settings on a new platform, use your target platform\'s theme import feature or apply them manually._',
      ].join('\n');

      return { content: [{ type: 'text', text: output }] };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: 'text',
            text: `Unable to retrieve theme configuration at this time. Error: ${detail}`,
          },
        ],
      };
    }
  }
}

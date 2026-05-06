import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class ExportOrdersTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_orders',
    description:
      'Exports order history from the merchant\'s Komercia store. ' +
      'Supports CSV and JSON export formats. ' +
      'Optionally filter orders by a date range (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ). ' +
      'Returns all orders or those within the specified window, including items, totals, and status. ' +
      'Example prompts: "Export all my orders as CSV", ' +
      '"Show me orders from January 2024", ' +
      '"Export orders between 2024-01-01 and 2024-03-31 as JSON".',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['csv', 'json', 'shopify', 'woocommerce'],
          description: 'The export format.',
        },
        date_range: {
          type: 'object',
          description: 'Optional. Filter orders within a date range.',
          properties: {
            from: {
              type: 'string',
              description: 'Start date in ISO 8601 format.',
            },
            to: {
              type: 'string',
              description: 'End date in ISO 8601 format.',
            },
          },
          required: ['from', 'to'],
        },
      },
      required: ['format'],
    },
  };

  constructor(private readonly toolRegistry: ToolRegistry) {}

  onModuleInit(): void {
    this.toolRegistry.register(this);
  }

  async execute(
    _args: unknown,
    _merchantContext: MerchantContext,
  ): Promise<CallToolResult> {
    return {
      content: [{ type: 'text', text: 'TODO: not yet implemented' }],
    };
  }
}

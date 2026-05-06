import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class ExportInventoryMovementsTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_inventory_movements',
    description:
      'Exports inventory movement history from the merchant\'s Komercia store. ' +
      'Includes stock-in, stock-out, and manual adjustment events, with reasons and timestamps. ' +
      'Optionally filter by a specific product ID or date range. ' +
      'Useful for auditing stock changes, identifying shrinkage, or reconciling inventory. ' +
      'Example prompts: "Export all inventory movements", ' +
      '"Show stock history for product abc123", ' +
      '"What inventory changes happened in March 2024?".',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description:
            'Optional. Filter movements to a specific product by its ID.',
        },
        date_range: {
          type: 'object',
          description: 'Optional. Filter movements within a date range.',
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
      required: [],
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

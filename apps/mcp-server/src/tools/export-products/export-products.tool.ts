import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class ExportProductsTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_products',
    description:
      'Exports the full product catalog from the merchant\'s Komercia store. ' +
      'Supports multiple export formats: "csv" for spreadsheet use, "json" for developers, ' +
      '"shopify" for migrating to Shopify, and "woocommerce" for migrating to WooCommerce. ' +
      'Optionally filter by a specific category. Returns the exported data or a download link. ' +
      'Example prompts: "Export all my products as CSV", ' +
      '"Give me my product list in Shopify format", ' +
      '"Export products from category ID abc123 as JSON".',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['csv', 'json', 'shopify', 'woocommerce'],
          description:
            'The export format. Use "shopify" or "woocommerce" for platform migration.',
        },
        category_id: {
          type: 'string',
          description:
            'Optional. Filter products to a specific category by its ID.',
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

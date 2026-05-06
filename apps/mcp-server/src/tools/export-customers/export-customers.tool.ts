import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class ExportCustomersTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_customers',
    description:
      'Exports the customer list from the merchant\'s Komercia store. ' +
      'Returns customer names, emails, phone numbers, and optionally their shipping/billing addresses. ' +
      'Useful for CRM imports, email campaigns, or migrating to another platform. ' +
      'Example prompts: "Export my customer list", ' +
      '"Give me all customers with their addresses", ' +
      '"Export customers without address data".',
    inputSchema: {
      type: 'object',
      properties: {
        include_addresses: {
          type: 'boolean',
          description:
            'Optional. When true, includes all saved addresses for each customer. Defaults to false.',
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

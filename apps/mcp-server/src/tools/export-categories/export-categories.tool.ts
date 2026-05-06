import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class ExportCategoriesTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_categories',
    description:
      'Exports all product categories from the merchant\'s Komercia store. ' +
      'Returns category names, slugs, parent-child relationships, and active status. ' +
      'Useful for understanding the store structure, setting up navigation, or migrating to another platform. ' +
      'Example prompts: "Show me all my product categories", ' +
      '"Export my category hierarchy", ' +
      '"What categories does my store have?".',
    inputSchema: {
      type: 'object',
      properties: {},
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

import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class SuggestAlternativePlatformsTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'suggest_alternative_platforms',
    description:
      "Analyzes the merchant's Komercia store data and suggests alternative e-commerce platforms that may be a good fit. " +
      'Takes into account the store size, product catalog complexity, geographic market, ' +
      'and current features used (payment gateways, theme customizations, etc.) to recommend platforms such as ' +
      'Shopify, WooCommerce, Tiendanube, or others with a brief comparison. ' +
      'Example prompts: "What platform should I migrate to?", ' +
      '"Suggest alternatives to Komercia for my store", ' +
      '"Which e-commerce platform fits my needs?".',
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

import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

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

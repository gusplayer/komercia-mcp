import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class DownloadMediaArchiveTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'download_media_archive',
    description:
      "Generates and returns a download link for an archive of the merchant's Komercia store media files. " +
      'Includes all product images and other uploaded media assets. ' +
      'The archive is prepared as a ZIP file and a time-limited download URL is returned. ' +
      'Useful for backing up media or migrating images to another platform. ' +
      'Example prompts: "Download all my product images", ' +
      '"Give me a ZIP of my store media", ' +
      '"I need to back up my store images".',
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

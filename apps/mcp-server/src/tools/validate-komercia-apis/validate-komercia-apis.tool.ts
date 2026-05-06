import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class ValidateKomerciaApisTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'validate_komercia_apis',
    description:
      'Validates connectivity and authentication against all Komercia backend API endpoints. ' +
      'Use this tool to diagnose connection issues, confirm your credentials are valid, ' +
      'or verify the Komercia service is reachable before attempting data exports. ' +
      'Returns the status of each API endpoint checked. ' +
      'Example prompts: "Check if my Komercia connection is working", ' +
      '"Are the APIs reachable?", "Validate my store credentials".',
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

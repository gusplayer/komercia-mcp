import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

@Injectable()
export class ListPaymentGatewaysTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'list_payment_gateways',
    description:
      "Lists all payment gateways configured for the merchant's Komercia store. " +
      'Shows which payment methods are active (e.g., credit card, PSE, cash on delivery, PayU, Wompi), ' +
      'along with their configuration status. ' +
      'Useful for auditing payment options, troubleshooting checkout issues, or documenting the setup before migration. ' +
      'Example prompts: "What payment methods does my store accept?", ' +
      '"List my configured payment gateways", ' +
      '"Which payment processors are enabled?".',
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

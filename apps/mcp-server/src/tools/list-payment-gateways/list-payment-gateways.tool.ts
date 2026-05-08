import { Injectable, OnModuleInit } from '@nestjs/common';

import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { config } from '../../config/env.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';

import type { MerchantContext } from '../../auth/merchant-context.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface PaymentGateway {
  id?: string | number;
  name?: string;
  nombre?: string;
  enabled?: boolean;
  activo?: boolean;
  active?: boolean;
  [key: string]: unknown;
}

function resolveGatewayName(gateway: PaymentGateway): string {
  return String(gateway.name ?? gateway.nombre ?? gateway.id ?? 'Unknown Gateway');
}

function resolveGatewayEnabled(gateway: PaymentGateway): boolean {
  if (typeof gateway.enabled === 'boolean') return gateway.enabled;
  if (typeof gateway.activo === 'boolean') return gateway.activo;
  if (typeof gateway.active === 'boolean') return gateway.active;
  return false;
}

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

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly sessionService: KomerciaSessionService,
  ) {}

  onModuleInit(): void {
    this.toolRegistry.register(this);
  }

  async execute(
    _args: unknown,
    merchantContext: MerchantContext,
  ): Promise<CallToolResult> {
    const session = await this.sessionService.getSession(merchantContext.jti);

    if (session === null) {
      return {
        content: [
          {
            type: 'text',
            text: 'Authentication required: your Komercia session has expired or was not found. Please log in again at mcp.komercia.co.',
          },
        ],
      };
    }

    try {
      const signal = AbortSignal.timeout(10_000);
      const response = await fetch(`${config.laravelUrl}/api/admin/medios-pago`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.laravelToken}`,
        },
        signal,
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: 'Unable to retrieve payment gateways at this time. Please try again later.',
            },
          ],
        };
      }

      const data: unknown = await response.json();

      // Normalise: the response may be an array or { data: [] }
      let gateways: PaymentGateway[];
      if (Array.isArray(data)) {
        gateways = data as PaymentGateway[];
      } else if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        Array.isArray((data as Record<string, unknown>)['data'])
      ) {
        gateways = (data as { data: PaymentGateway[] }).data;
      } else {
        gateways = [];
      }

      if (gateways.length === 0) {
        return {
          content: [{ type: 'text', text: 'No payment gateways are configured for your store.' }],
        };
      }

      const enabled = gateways.filter((g) => resolveGatewayEnabled(g));
      const disabled = gateways.filter((g) => !resolveGatewayEnabled(g));

      const lines: string[] = [
        `**Payment Gateways — ${String(gateways.length)} configured**`,
        '',
      ];

      if (enabled.length > 0) {
        lines.push(`**Enabled (${String(enabled.length)})**`);
        for (const g of enabled) {
          lines.push(`  ✓ ${resolveGatewayName(g)}`);
        }
        lines.push('');
      }

      if (disabled.length > 0) {
        lines.push(`**Disabled (${String(disabled.length)})**`);
        for (const g of disabled) {
          lines.push(`  ✗ ${resolveGatewayName(g)}`);
        }
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: 'Unable to retrieve payment gateways at this time. Please try again later.',
          },
        ],
      };
    }
  }
}

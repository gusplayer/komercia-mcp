import { KomerciaClient } from '@komercia-mcp/komercia-client';
import { Injectable, OnModuleInit } from '@nestjs/common';


import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { NodeTokenRefresher } from '../../auth/node-token-refresher.service.js';
import { config } from '../../config/env.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';

import type { MerchantContext } from '../../auth/merchant-context.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface ExportCustomersArgs {
  currency?: string;
}

function isExportCustomersArgs(val: unknown): val is ExportCustomersArgs {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  if (obj['currency'] !== undefined && typeof obj['currency'] !== 'string') return false;
  return true;
}

@Injectable()
export class ExportCustomersTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_customers',
    description:
      'Exports the full customer list from the merchant\'s Komercia store as CSV. ' +
      'Returns customer names, IDs, contact details, purchase counts, and preferred payment method. ' +
      'Useful for CRM imports, email campaigns, or migrating to another platform. ' +
      'Example prompts: "Export my customer list", ' +
      '"Give me a CSV of all my clients", ' +
      '"Download my customer data".',
    inputSchema: {
      type: 'object',
      properties: {
        currency: {
          type: 'string',
          description: 'Optional. Currency code (e.g. COP, USD). Defaults to COP.',
        },
      },
      required: [],
    },
  };

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly sessionService: KomerciaSessionService,
    private readonly nodeTokenRefresher: NodeTokenRefresher,
  ) {}

  onModuleInit(): void {
    this.toolRegistry.register(this);
  }

  async execute(
    args: unknown,
    merchantContext: MerchantContext,
  ): Promise<CallToolResult> {
    if (!isExportCustomersArgs(args)) {
      return {
        content: [{ type: 'text', text: 'Invalid arguments.' }],
      };
    }

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
      await this.nodeTokenRefresher.ensureFresh(session);
      const client = new KomerciaClient({
        nodeUrl: config.nodeUrl,
        laravelUrl: config.laravelUrl,
        editorUrl: config.editorUrl,
        nodePublicKey: config.nodePublicKey,
        nodeToken: session.nodeToken,
        laravelToken: session.laravelToken,
        storeId: merchantContext.storeId,
      });

      const currency = (args).currency ?? 'COP';
      const csv = await client.customers.exportCsv(currency);

      const rowCount = csv.split('\n').length - 1;

      const output = [
        `**Customer Export — ${String(rowCount)} customers**`,
        '',
        'Columns: nombre, tipo_identificacion, identificacion, email, ciudad, telefono, cantidad_compras, compras_completadas, ultima_compra, usuario_uso_cupon, metodo_pago_preferido',
        '',
        '```csv',
        csv.trim(),
        '```',
      ].join('\n');

      return { content: [{ type: 'text', text: output }] };
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: 'Unable to export customers at this time. Please try again later.',
          },
        ],
      };
    }
  }
}

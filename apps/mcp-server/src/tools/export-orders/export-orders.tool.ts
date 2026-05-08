import { KomerciaClient } from '@komercia-mcp/komercia-client';
import { Injectable, OnModuleInit } from '@nestjs/common';


import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { NodeTokenRefresher } from '../../auth/node-token-refresher.service.js';
import { config } from '../../config/env.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';

import type { MerchantContext } from '../../auth/merchant-context.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface ExportOrdersArgs {
  currency?: string;
}

function isExportOrdersArgs(val: unknown): val is ExportOrdersArgs {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  if (obj['currency'] !== undefined && typeof obj['currency'] !== 'string') return false;
  return true;
}

@Injectable()
export class ExportOrdersTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_orders',
    description:
      'Exports the complete order history from the merchant\'s Komercia store as CSV. ' +
      'Returns all orders with customer info, totals, payment method, coupon, and delivery status. ' +
      'Useful for accounting, CRM imports, or migrating to another platform. ' +
      'Example prompts: "Export all my orders", ' +
      '"Give me a CSV of my sales history", ' +
      '"Download my order data".',
    inputSchema: {
      type: 'object',
      properties: {
        currency: {
          type: 'string',
          description: 'Optional. Currency code for totals (e.g. COP, USD). Defaults to COP.',
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
    if (!isExportOrdersArgs(args)) {
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
      const csv = await client.orders.exportCsv(currency);

      const rowCount = csv.split('\n').length - 1; // subtract header

      const output = [
        `**Orders Export — ${String(rowCount)} orders (${currency})**`,
        '',
        'Columns: nombre, tipo_identificacion, identificacion, email, ciudad, telefono, total, fecha_compra, metodo_pago, cupon, estado, estado_entrega',
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
            text: 'Unable to export orders at this time. Please try again later.',
          },
        ],
      };
    }
  }
}

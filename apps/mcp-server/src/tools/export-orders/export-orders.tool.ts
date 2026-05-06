import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { KomerciaClient, toOrder } from '@komercia-mcp/komercia-client';
import type { Order } from '@komercia-mcp/shared';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';
import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { config } from '../../config/env.js';

const MAX_ORDERS = 200;

interface DateRange {
  from: string;
  to: string;
}

interface ExportOrdersArgs {
  format: 'csv' | 'json';
  date_range?: DateRange;
}

function isExportOrdersArgs(val: unknown): val is ExportOrdersArgs {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  if (typeof obj['format'] !== 'string') return false;
  if (!['csv', 'json'].includes(obj['format'])) return false;
  if (obj['date_range'] !== undefined) {
    if (typeof obj['date_range'] !== 'object' || obj['date_range'] === null) return false;
    const dr = obj['date_range'] as Record<string, unknown>;
    if (typeof dr['from'] !== 'string' || typeof dr['to'] !== 'string') return false;
  }
  return true;
}

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: Array<string | number | boolean | null | undefined>): string {
  return fields.map(escapeCsvField).join(',');
}

function ordersToCsv(orders: Order[]): string {
  const header = toCsvRow([
    'order_id', 'status', 'total', 'currency', 'customer_id', 'items_count', 'created_at',
  ]);
  const rows = orders.map((o) =>
    toCsvRow([
      o.id,
      o.status,
      o.total,
      o.currency,
      o.customer_id ?? '',
      o.items.length,
      o.created_at,
    ]),
  );
  return [header, ...rows].join('\n');
}

@Injectable()
export class ExportOrdersTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_orders',
    description:
      'Exports order history from the merchant\'s Komercia store. ' +
      'Supports CSV and JSON export formats. ' +
      'Optionally filter orders by a date range (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ). ' +
      'Returns all orders or those within the specified window, including items, totals, and status. ' +
      'Example prompts: "Export all my orders as CSV", ' +
      '"Show me orders from January 2024", ' +
      '"Export orders between 2024-01-01 and 2024-03-31 as JSON".',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['csv', 'json'],
          description: 'The export format.',
        },
        date_range: {
          type: 'object',
          description: 'Optional. Filter orders within a date range.',
          properties: {
            from: {
              type: 'string',
              description: 'Start date in ISO 8601 format.',
            },
            to: {
              type: 'string',
              description: 'End date in ISO 8601 format.',
            },
          },
          required: ['from', 'to'],
        },
      },
      required: ['format'],
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
    args: unknown,
    merchantContext: MerchantContext,
  ): Promise<CallToolResult> {
    if (!isExportOrdersArgs(args)) {
      return {
        content: [{ type: 'text', text: 'Invalid arguments: "format" is required and must be csv or json.' }],
      };
    }

    const session = await this.sessionService.getSession(merchantContext.jti);

    if (session === null) {
      return {
        content: [
          {
            type: 'text',
            text: 'Authentication required: your Komercia session has expired or was not found. Please request a new magic link at web.komercia-exit.com.',
          },
        ],
      };
    }

    try {
      const client = new KomerciaClient({
        nodeUrl: config.nodeUrl,
        laravelUrl: config.laravelUrl,
        editorUrl: config.editorUrl,
        nodePublicKey: config.nodePublicKey,
        nodeToken: session.nodeToken,
        laravelToken: session.laravelToken,
        storeId: merchantContext.storeId,
      });

      const allOrders: Order[] = [];
      let page = 1;
      const perPage = 50;

      while (allOrders.length < MAX_ORDERS) {
        const response = await client.orders.list({ page, per_page: perPage });

        const items = response.orders.map(toOrder);

        const filtered =
          args.date_range !== undefined
            ? items.filter((o) => {
                const created = new Date(o.created_at).getTime();
                const from = new Date(args.date_range!.from).getTime();
                const to = new Date(args.date_range!.to).getTime();
                return created >= from && created <= to;
              })
            : items;

        allOrders.push(...filtered);

        if (response.orders.length < perPage) break;
        page++;
      }

      const capped = allOrders.slice(0, MAX_ORDERS);
      const total = capped.length;
      const cappedNote =
        allOrders.length >= MAX_ORDERS
          ? `\n\n_Results capped at ${MAX_ORDERS} orders. Use date_range to narrow the export._`
          : '';

      let output: string;

      if (args.format === 'json') {
        output =
          `**Orders Export (JSON) — ${total} orders**\n\n\`\`\`json\n` +
          JSON.stringify(capped, null, 2) +
          '\n```' +
          cappedNote;
      } else {
        const csv = ordersToCsv(capped);
        output =
          `**Orders Export (CSV) — ${total} orders**\n\nColumns: order_id, status, total, currency, customer_id, items_count, created_at\n\n\`\`\`csv\n${csv}\n\`\`\`` +
          cappedNote;
      }

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

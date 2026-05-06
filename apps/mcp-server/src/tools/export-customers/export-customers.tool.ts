import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { KomerciaClient, toCustomer } from '@komercia-mcp/komercia-client';
import type { Customer } from '@komercia-mcp/shared';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';
import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { config } from '../../config/env.js';

interface ExportCustomersArgs {
  include_addresses?: boolean;
}

function isExportCustomersArgs(val: unknown): val is ExportCustomersArgs {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  if (obj['include_addresses'] !== undefined && typeof obj['include_addresses'] !== 'boolean') return false;
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

function customersToCsv(customers: Customer[], includeAddresses: boolean): string {
  const baseHeader = ['id', 'name', 'email', 'phone', 'created_at'];
  const addressHeader = includeAddresses
    ? ['address_line1', 'address_line2', 'address_city', 'address_state', 'address_country', 'address_postal_code']
    : [];

  const header = toCsvRow([...baseHeader, ...addressHeader]);

  const rows: string[] = [];

  for (const c of customers) {
    if (includeAddresses && c.addresses.length > 0) {
      for (const addr of c.addresses) {
        rows.push(toCsvRow([
          c.id, c.name, c.email, c.phone ?? '', c.created_at,
          addr.line1, addr.line2 ?? '', addr.city, addr.state, addr.country, addr.postal_code,
        ]));
      }
    } else {
      rows.push(toCsvRow([c.id, c.name, c.email, c.phone ?? '', c.created_at]));
    }
  }

  return [header, ...rows].join('\n');
}

@Injectable()
export class ExportCustomersTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_customers',
    description:
      'Exports the customer list from the merchant\'s Komercia store. ' +
      'Returns customer names, emails, phone numbers, and optionally their shipping/billing addresses. ' +
      'Useful for CRM imports, email campaigns, or migrating to another platform. ' +
      'Example prompts: "Export my customer list", ' +
      '"Give me all customers with their addresses", ' +
      '"Export customers without address data".',
    inputSchema: {
      type: 'object',
      properties: {
        include_addresses: {
          type: 'boolean',
          description:
            'Optional. When true, includes all saved addresses for each customer. Defaults to false.',
        },
      },
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
    args: unknown,
    merchantContext: MerchantContext,
  ): Promise<CallToolResult> {
    if (!isExportCustomersArgs(args)) {
      return {
        content: [{ type: 'text', text: 'Invalid arguments: include_addresses must be a boolean if provided.' }],
      };
    }

    const includeAddresses = (args as ExportCustomersArgs).include_addresses === true;

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

      const allCustomers: Customer[] = [];
      let page = 1;
      const perPage = 50;

      while (true) {
        const response = await client.customers.list();

        allCustomers.push(...response.customers.map(toCustomer));

        if (response.customers.length < perPage) break;
        page++;
      }

      const total = allCustomers.length;
      const csv = customersToCsv(allCustomers, includeAddresses);

      const columnExplanation = includeAddresses
        ? 'Columns: id, name, email, phone, created_at, address_line1, address_line2, address_city, address_state, address_country, address_postal_code\n(Customers with multiple addresses appear on multiple rows)'
        : 'Columns: id, name, email, phone, created_at';

      const output =
        `**Customer Export — ${total} customers**\n\n${columnExplanation}\n\n\`\`\`csv\n${csv}\n\`\`\``;

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

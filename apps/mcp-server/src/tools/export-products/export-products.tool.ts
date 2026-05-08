import { KomerciaClient, toProduct } from '@komercia-mcp/komercia-client';
import { Injectable, OnModuleInit } from '@nestjs/common';

import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { NodeTokenRefresher } from '../../auth/node-token-refresher.service.js';
import { config } from '../../config/env.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';

import type { MerchantContext } from '../../auth/merchant-context.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import type { Product } from '@komercia-mcp/shared';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const DISPLAY_LIMIT = 50;
const JSON_TRUNCATE_LIMIT = 100;
// Komercia returns 500 when limit > total products in the store.
// Using a small page size avoids this for stores with few products.
const PAGE_SIZE = 5;

interface ExportProductsArgs {
  format: 'csv' | 'json' | 'shopify' | 'woocommerce';
  category_id?: string;
}

function isExportProductsArgs(val: unknown): val is ExportProductsArgs {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj['format'] === 'string' &&
    ['csv', 'json', 'shopify', 'woocommerce'].includes(obj['format'])
  );
}

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: (string | number | boolean | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',');
}

function productsToJson(products: Product[], total: number): string {
  const truncated = products.slice(0, JSON_TRUNCATE_LIMIT);
  const note =
    total > JSON_TRUNCATE_LIMIT
      ? `\n\n// Note: Showing ${String(JSON_TRUNCATE_LIMIT)} of ${String(total)} products. Use category_id to filter.`
      : '';
  return JSON.stringify(truncated, null, 2) + note;
}

function productsToCsv(products: Product[]): string {
  const header = toCsvRow(['id', 'name', 'sku', 'price', 'compare_at_price', 'stock', 'category_id', 'active', 'created_at', 'updated_at']);
  const rows = products.map((p) =>
    toCsvRow([p.id, p.name, p.sku, p.price, p.compare_at_price, p.stock, p.category_id, p.active, p.created_at, p.updated_at]),
  );
  return [header, ...rows].join('\n');
}

function productsToShopifyCsv(products: Product[]): string {
  const header = toCsvRow([
    'Handle', 'Title', 'Body HTML', 'Vendor', 'Type', 'Tags', 'Published',
    'Option1 Name', 'Option1 Value', 'Variant Price', 'Variant Inventory Qty',
  ]);
  const rows = products.map((p) => {
    const handle = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return toCsvRow([
      handle,
      p.name,
      '',
      'Komercia',
      '',
      '',
      p.active ? 'TRUE' : 'FALSE',
      'Title',
      'Default Title',
      p.price,
      p.stock,
    ]);
  });
  return [header, ...rows].join('\n');
}

function productsToWooCommerceCsv(products: Product[]): string {
  const header = toCsvRow([
    'ID', 'Type', 'SKU', 'Name', 'Regular price', 'Stock quantity', 'Categories',
  ]);
  const rows = products.map((p) =>
    toCsvRow([
      p.id,
      'simple',
      p.sku ?? '',
      p.name,
      p.price,
      p.stock,
      p.category_id ?? '',
    ]),
  );
  return [header, ...rows].join('\n');
}

@Injectable()
export class ExportProductsTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_products',
    description:
      'Exports the full product catalog from the merchant\'s Komercia store. ' +
      'Supports multiple export formats: "csv" for spreadsheet use, "json" for developers, ' +
      '"shopify" for migrating to Shopify, and "woocommerce" for migrating to WooCommerce. ' +
      'Optionally filter by a specific category. Returns the exported data or a download link. ' +
      'Example prompts: "Export all my products as CSV", ' +
      '"Give me my product list in Shopify format", ' +
      '"Export products from category ID abc123 as JSON".',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['csv', 'json', 'shopify', 'woocommerce'],
          description:
            'The export format. Use "shopify" or "woocommerce" for platform migration.',
        },
        category_id: {
          type: 'string',
          description:
            'Optional. Filter products to a specific category by its ID.',
        },
      },
      required: ['format'],
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
    if (!isExportProductsArgs(args)) {
      return {
        content: [{ type: 'text', text: 'Invalid arguments: "format" is required and must be one of csv, json, shopify, woocommerce.' }],
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

      // Paginate through all products
      const allProducts: Product[] = [];
      let page = 1;
      const perPage = PAGE_SIZE;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- pagination loop, exits via break
      while (true) {
        const response = await client.products.list({
          page,
          limit: perPage,
        });

        const items = response.products.map(toProduct);
        const filtered =
          args.category_id !== undefined
            ? items.filter((p) => p.category_id === args.category_id)
            : items;

        allProducts.push(...filtered);

        // Stop if this page had fewer items than requested (last page)
        if (items.length < perPage) break;

        page++;
      }

      const total = allProducts.length;
      const displayProducts = allProducts.slice(0, DISPLAY_LIMIT);
      const truncationNote =
        total > DISPLAY_LIMIT
          ? `\n\n_Showing ${String(DISPLAY_LIMIT)} of ${String(total)} products. Use category_id to filter or ask for a specific page._`
          : '';

      let output: string;
      let prefix = '';

      switch (args.format) {
        case 'json':
          output = productsToJson(displayProducts, total);
          prefix = `**Products Export (JSON) — ${String(total)} total**\n\n\`\`\`json\n`;
          output = prefix + output + '\n```' + truncationNote;
          break;

        case 'csv':
          output = productsToCsv(displayProducts);
          output = `**Products Export (CSV) — ${String(total)} total**\n\n\`\`\`csv\n${output}\n\`\`\`` + truncationNote;
          break;

        case 'shopify':
          output = productsToShopifyCsv(displayProducts);
          output = `**Products Export (Shopify CSV) — ${String(total)} total**\n\nImport this file at: Shopify Admin → Products → Import\n\n\`\`\`csv\n${output}\n\`\`\`` + truncationNote;
          break;

        case 'woocommerce':
          output = productsToWooCommerceCsv(displayProducts);
          output = `**Products Export (WooCommerce CSV) — ${String(total)} total**\n\nImport via: WooCommerce → Products → Import\n\n\`\`\`csv\n${output}\n\`\`\`` + truncationNote;
          break;
      }

      return { content: [{ type: 'text', text: output }] };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: 'text',
            text: `Unable to export products at this time. Error: ${detail}`,
          },
        ],
      };
    }
  }
}

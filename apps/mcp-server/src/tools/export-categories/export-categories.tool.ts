import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { KomerciaClient, toCategory } from '@komercia-mcp/komercia-client';
import type { Category } from '@komercia-mcp/shared';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';
import { KomerciaSessionService } from '../../auth/komercia-session.service.js';
import { config } from '../../config/env.js';

function buildCategoryTree(categories: Category[]): string {
  // Build parent -> children map
  const childrenMap = new Map<string | null, Category[]>();

  for (const cat of categories) {
    const key = cat.parent_id ?? null;
    const existing = childrenMap.get(key);
    if (existing !== undefined) {
      existing.push(cat);
    } else {
      childrenMap.set(key, [cat]);
    }
  }

  const lines: string[] = [];

  function renderNode(cat: Category, prefix: string, isLast: boolean): void {
    const connector = isLast ? '└── ' : '├── ';
    const status = cat.active ? '' : ' (inactive)';
    lines.push(`${prefix}${connector}${cat.name}${status}`);

    const children = childrenMap.get(cat.id) ?? [];
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    children.forEach((child, idx) => {
      renderNode(child, childPrefix, idx === children.length - 1);
    });
  }

  const roots = childrenMap.get(null) ?? [];
  roots.forEach((root, idx) => {
    renderNode(root, '', idx === roots.length - 1);
  });

  return lines.join('\n');
}

@Injectable()
export class ExportCategoriesTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'export_categories',
    description:
      'Exports all product categories from the merchant\'s Komercia store. ' +
      'Returns category names, slugs, parent-child relationships, and active status. ' +
      'Useful for understanding the store structure, setting up navigation, or migrating to another platform. ' +
      'Example prompts: "Show me all my product categories", ' +
      '"Export my category hierarchy", ' +
      '"What categories does my store have?".',
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

      const rawCategories = await client.categories.list();
      const categories: Category[] = rawCategories.map(toCategory);

      const total = categories.length;

      if (total === 0) {
        return {
          content: [{ type: 'text', text: 'No categories found in your store.' }],
        };
      }

      const tree = buildCategoryTree(categories);

      const output = [
        `**Category Hierarchy — ${total} categories**`,
        '',
        '```',
        tree,
        '```',
        '',
        '_Inactive categories are marked with (inactive)._',
      ].join('\n');

      return { content: [{ type: 'text', text: output }] };
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: 'Unable to export categories at this time. Please try again later.',
          },
        ],
      };
    }
  }
}

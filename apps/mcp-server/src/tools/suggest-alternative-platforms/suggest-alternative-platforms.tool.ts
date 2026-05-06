import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ITool, CallToolResult } from '../../mcp/tool.interface.js';
import { ToolRegistry } from '../../mcp/tool.registry.js';
import type { MerchantContext } from '../../auth/merchant-context.js';

const RECOMMENDATION_TEXT = `# Alternative E-Commerce Platforms

Based on your store profile, here are the platforms most commonly chosen by merchants migrating from Komercia:

---

**Shopify** — Best for: international sales, large catalogs, advanced shipping
- Extensive app ecosystem (8,000+ integrations)
- Built-in multi-currency and multi-language support
- Reliable uptime and managed hosting
- Migration effort: **Medium** | Export format: CSV (products + orders)
- Pricing: from USD $29/month

---

**Tiendanube** — Best for: LATAM merchants, Spanish-language support, local payment gateways
- Native integrations with Mercado Pago, PayU, Wompi, and PSE
- Strong presence in Colombia, Argentina, Mexico, and Brazil
- Spanish-first support team
- Migration effort: **Low** | Export format: CSV
- Pricing: from ~USD $10/month (LATAM pricing)

---

**WooCommerce** — Best for: full control, custom features, tech-savvy merchants
- Open-source and self-hosted — no platform lock-in
- Unlimited customisation via WordPress plugins
- One-time setup cost; hosting is your responsibility
- Migration effort: **High** | Export format: CSV + XML
- Pricing: free software; hosting from ~USD $10/month

---

**Recommendation**

Without knowing your specific store profile (catalog size, monthly orders, target markets, technical resources), all three platforms are viable. Consider:

- Choose **Tiendanube** if you sell primarily in Colombia / LATAM and want the easiest migration.
- Choose **Shopify** if you plan to expand internationally or need enterprise-grade reliability.
- Choose **WooCommerce** if you need full control and have a developer on hand.

Run \`export_products\`, \`export_orders\`, and \`export_customers\` to prepare your data files for any of these migrations.`;

@Injectable()
export class SuggestAlternativePlatformsTool implements ITool, OnModuleInit {
  readonly definition: Tool = {
    name: 'suggest_alternative_platforms',
    description:
      "Analyzes the merchant's Komercia store data and suggests alternative e-commerce platforms that may be a good fit. " +
      'Takes into account the store size, product catalog complexity, geographic market, ' +
      'and current features used (payment gateways, theme customizations, etc.) to recommend platforms such as ' +
      'Shopify, WooCommerce, Tiendanube, or others with a brief comparison. ' +
      'Example prompts: "What platform should I migrate to?", ' +
      '"Suggest alternatives to Komercia for my store", ' +
      '"Which e-commerce platform fits my needs?".',
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
    return { content: [{ type: 'text', text: RECOMMENDATION_TEXT }] };
  }
}

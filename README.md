# komercia-mcp

[![CI](https://github.com/gustavomoreno/komercia-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gustavomoreno/komercia-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 20](https://img.shields.io/badge/node-20_LTS-green)](https://nodejs.org)

**Export your Komercia store data using Claude.ai as your interface.**

Komercia is winding down. This tool lets you take your products, orders, customers, and media to Shopify, WooCommerce, Tiendanube, or plain CSV — no technical knowledge required. Just talk to Claude.

---

## How it works (for merchants)

1. **Get your token** — visit [web.komercia-exit.com](https://web.komercia-exit.com), enter your store email, and click the magic link in your inbox. Copy the token shown on screen.
2. **Connect to Claude** — in [Claude.ai](https://claude.ai), add the MCP server `mcp.komercia-exit.com` and paste your token when prompted.
3. **Ask for your data** — just tell Claude what you need:
   > _"Export all my products in Shopify format"_
   > _"Give me a CSV of orders from the last 6 months"_
   > _"Download all my store images as a ZIP"_

Your token is valid for 6 months and is read-only — it can never modify your store.

---

## For developers

### Prerequisites

- Node 20 LTS
- pnpm 9+

### Quick start

```bash
git clone https://github.com/gustavomoreno/komercia-mcp.git
cd komercia-mcp

cp .env.example .env
# Fill in your values in .env

pnpm install
pnpm build
pnpm dev
```

### Project structure

```
apps/
  mcp-server/   NestJS — MCP protocol server, validates tokens, calls Komercia APIs
  web/          Astro  — Magic link issuer and merchant-facing UI
  discovery/    CLI    — Maps the Komercia API surface for local development

packages/
  shared/          Shared types, JWT utilities, Zod schemas
  komercia-client/ Unified HTTP client for Komercia's 3 backend APIs
  eslint-config/   Shared ESLint flat config
```

### Common commands

```bash
pnpm dev          # Start all apps in development mode
pnpm test         # Run all unit and integration tests
pnpm lint         # Lint all packages
pnpm typecheck    # TypeScript check all packages
pnpm discover     # Run API discovery CLI
```

---

## Available tools

See [docs/tools-catalog.md](docs/tools-catalog.md) for the full list with examples.

| Tool | What it does |
|---|---|
| `get_store_info` | Basic store name, plan, URLs |
| `export_products` | CSV, JSON, Shopify or WooCommerce XML |
| `export_orders` | With optional date range |
| `export_customers` | With optional addresses |
| `export_categories` | Category tree |
| `export_inventory_movements` | Stock history |
| `export_theme_config` | Theme settings JSON |
| `list_payment_gateways` | Configured payment methods |
| `download_media_archive` | Temporary ZIP download URL |
| `suggest_alternative_platforms` | Shopify vs Tiendanube vs WooCommerce recommendation |
| `validate_komercia_apis` | Health check on available endpoints |

---

## Architecture

```
[Merchant browser]
      │
      ├──→  Astro Web (web.komercia-exit.com)
      │         POST /api/request-link  →  Resend magic link email
      │         GET  /api/redeem        →  Issue signed JWT (6 months, read-only)
      │
      └──→  Claude.ai
                └──→  NestJS MCP Server (mcp.komercia-exit.com)
                          │  Validates JWT, extracts merchant_id
                          └──→  KomerciaClient
                                    ├── Backend 1 (main API)
                                    ├── Backend 2
                                    └── Backend 3
```

Full diagram: [docs/architecture.md](docs/architecture.md)

---

## Security

Read-only by design. The issued JWT carries a `scope: read` claim enforced by the MCP server middleware. No write operations are exposed.

See [docs/security.md](docs/security.md) for the full threat model and [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

---

## Contributing

See [docs/contributing.md](docs/contributing.md).

This project uses [Conventional Commits](https://www.conventionalcommits.org/), [Changesets](https://github.com/changesets/changesets), and requires CI green before merging.

---

## License

MIT — © 2024 Gustavo Moreno

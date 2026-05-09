# Komercia MCP

[![CI](https://github.com/gusplayer/komercia-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gusplayer/komercia-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 20](https://img.shields.io/badge/node-20_LTS-green)](https://nodejs.org)

**Connect your Komercia store to Claude.ai and query all your store data through natural language.**

Komercia MCP is a [Model Context Protocol](https://modelcontextprotocol.io) server that gives Claude direct access to your store's products, orders, customers, inventory, and more — no code, no dashboards, just chat.

---

## What you can do

Ask Claude questions like:

- _"How many active products do I have and which categories have the most?"_
- _"Show me all orders from last month with their total revenue"_
- _"Export my full customer list as a CSV"_
- _"Which products have less than 5 units in stock?"_
- _"What payment methods does my store have configured?"_
- _"Export my product catalog in Shopify format"_
- _"Give me a summary of my store stats"_

---

## Quick start (merchants)

### Step 1 — Get your token

Visit [mcp.komercia.co](https://mcp.komercia.co), log in with your Komercia credentials, and copy the token shown on screen. It's valid for 6 months and is read-only.

### Step 2 — Connect your client (pick one)

All clients use the same token. Choose whichever you already use:

**Claude.ai** (recommended — no install needed)

In [Claude.ai](https://claude.ai), go to **Settings → Integrations** and add a new integration:

| Field | Value |
|---|---|
| Server URL | `https://api-mcp.komercia.co/sse` |
| Authentication | Paste your token |

**Claude Desktop**

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "komercia": {
      "command": "mcp-remote",
      "args": ["https://api-mcp.komercia.co/sse", "--header", "Authorization: Bearer YOUR_TOKEN"]
    }
  }
}
```

**Claude Code / Cursor**

```bash
claude mcp add --transport http komercia https://api-mcp.komercia.co \
  --header "Authorization: Bearer YOUR_TOKEN"
```

Full setup guide for all clients: [mcp.komercia.co/uso](https://mcp.komercia.co/uso)

---

## Available tools

| Tool | What it does |
|---|---|
| `get_store_info` | Store name, plan, domain, and general info |
| `export_products` | Full product catalog — CSV, JSON, Shopify, or WooCommerce format |
| `export_orders` | All orders with statuses, totals, and line items |
| `export_customers` | Customer list with contact info and purchase history |
| `export_categories` | Category hierarchy tree |
| `export_inventory_movements` | Stock movement history |
| `export_theme_config` | Current theme settings as JSON |
| `list_payment_gateways` | Configured payment methods |
| `download_media_archive` | Temporary ZIP link for all store media |
| `suggest_alternative_platforms` | Platform comparison and migration recommendations |
| `validate_komercia_apis` | Health check on Komercia API endpoints |

Full details: [docs/tools-catalog.md](docs/tools-catalog.md)

---

## For developers

### Prerequisites

- Node 20 LTS
- pnpm 9+
- Docker Desktop (for local Postgres)

### Quick start — local dev

```bash
git clone https://github.com/gusplayer/komercia-mcp.git
cd komercia-mcp

cp .env.example .env   # fill in your values

pnpm install

docker compose --profile deps up -d   # Postgres on port 5434
node scripts/migrate.mjs              # run DB migrations
pnpm dev                              # web on :4321, mcp-server on :3001
```

Verify both services are up:

```bash
curl http://localhost:4321/api/health
curl http://localhost:3001/health
```

Open `http://localhost:4321` and log in with your Komercia credentials.

### Smoke test

```bash
node scripts/smoke-test.mjs
```

Runs the full path: login → SSE handshake → `tools/list` → `tools/call export_categories`.

### Full Docker stack

```bash
docker compose --profile full up -d --build
```

Builds the mcp-server image, runs migrations, and brings up the full stack. Use `pnpm dev` for the web app.

### Project structure

```
apps/
  mcp-server/   NestJS — MCP protocol server (HTTP/SSE), AuthGuard,
                NodeTokenRefresher for the 2h Komercia Node JWT
  web/          Astro SSR — login UI, token issuance, session revocation
  discovery/    CLI — maps the Komercia API surface for local development

packages/
  shared/          Types, JWT utilities, AES-256-GCM crypto service
  komercia-client/ Unified HTTP client + AuthResource (Laravel + Node)
  eslint-config/   Shared ESLint flat config

scripts/
  migrate.mjs      Standalone DB migration runner
  smoke-test.mjs   End-to-end smoke test
```

### Common commands

```bash
pnpm dev          # All apps in dev mode
pnpm test         # Vitest across all packages
pnpm lint         # ESLint
pnpm -r typecheck # TypeScript check across the monorepo
pnpm discover     # API discovery CLI
```

---

## Architecture

```
[Merchant browser]
      │
      └──→  Astro Web (mcp.komercia.co)
                POST /api/login
                  ├─ Laravel /oauth/token  → access_token (100y)
                  ├─ Node    /api/v1/auth/stores/login → accessToken (2h)
                  └─ Laravel /api/admin/tienda  → real storeId
                Encrypts credentials + tokens (AES-256-GCM) → komercia_sessions
                Issues our own JWT (HS256, 6mo) → returns to merchant

[Claude.ai / Claude Desktop / Cursor]
      └──→  NestJS MCP Server (api-mcp.komercia.co/sse)
                AuthGuard verifies JWT → extracts jti
                KomerciaSessionService reads & decrypts session
                NodeTokenRefresher.ensureFresh() → re-logs Node when < 5min left
                  (single-flight per jti, auto-revokes on 401 = password rotated)
                KomerciaClient calls Komercia → returns data to Claude
```

Token expiry strategy:

| Token | TTL | Strategy |
|---|---|---|
| Laravel access token | 100 years | Never expires in practice |
| Node access token | 2 hours | Auto re-login using encrypted credentials |
| Our JWT | 6 months | Revocation via `revoked_at` column |

Full diagram: [docs/architecture.md](docs/architecture.md)

---

## Security

Read-only by design. The issued JWT carries `scope: read`, enforced by `AuthGuard` on every request. No write operations are exposed.

Komercia credentials are stored server-side encrypted with AES-256-GCM (32-byte key in `KOMERCIA_SESSION_ENCRYPTION_KEY`, separate from the database key). When a merchant rotates their password, the next token refresh fails with 401 and the session is auto-revoked with a clear error message.

Click **"Revoke this token"** on [mcp.komercia.co](https://mcp.komercia.co) at any time to instantly invalidate your integration.

See [docs/security.md](docs/security.md) for the full threat model.

---

## Contributing

See [docs/contributing.md](docs/contributing.md). Conventional Commits required, CI must be green.

---

## License

MIT — © 2025 Gustavo Moreno

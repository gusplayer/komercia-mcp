# komercia-mcp

[![CI](https://github.com/gustavomoreno/komercia-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gustavomoreno/komercia-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 20](https://img.shields.io/badge/node-20_LTS-green)](https://nodejs.org)

**Export your Komercia store data using Claude.ai as your interface.**

Komercia is winding down. This tool lets you take your products, orders, customers, and media to Shopify, WooCommerce, Tiendanube, or plain CSV — no technical knowledge required. Just talk to Claude.

---

## How it works (for merchants)

1. **Get your token** — visit [mcp.komercia.co](https://mcp.komercia.co), log in with your Komercia email and password, and copy the token shown on screen.
2. **Connect to Claude** — in [Claude.ai](https://claude.ai), go to **Settings → Integrations**, add the MCP server URL `https://api-mcp.komercia.co/sse`, and paste your token when prompted.
3. **Ask for your data** — just tell Claude what you need:
   > _"Export all my products in Shopify format"_
   > _"Give me a CSV of orders from the last 6 months"_
   > _"Download all my store images as a ZIP"_

Your token is valid for 6 months and is read-only. Click **"Revoke this token"** to invalidate it at any time.

---

## For developers

### Prerequisites

- Node 20 LTS
- pnpm 9+
- Docker Desktop (for local Postgres)

### Quick start — local dev

```bash
git clone https://github.com/gustavomoreno/komercia-mcp.git
cd komercia-mcp

# Copy the env template and fill in your values
cp .env.example .env

pnpm install

# 1) Bring up Postgres (port 5434) and run migrations
docker compose --profile deps up -d

# 2) Apply DB migrations
node scripts/migrate.mjs

# 3) Start both apps (web on 4321, mcp server on 3001)
pnpm dev
```

Verify:
```bash
curl http://localhost:4321/api/health   # web
curl http://localhost:3001/health        # mcp server
```

Then open `http://localhost:4321` and log in with your Komercia credentials.

### Smoke test (E2E)

The repo ships with `scripts/smoke-test.mjs` that goes through the full path: login → SSE handshake → `tools/list` → `tools/call export_categories`. Run with both servers up:
```bash
node scripts/smoke-test.mjs
```

### Full Docker stack

For parity with production:
```bash
docker compose --profile full up -d --build
```
Builds the mcp-server image, runs the migration job, and brings up the full stack on `localhost:3001` (api). The web app runs outside Docker — use `pnpm dev` for it.

### Project structure

```
apps/
  mcp-server/   NestJS — MCP protocol server (HTTP/SSE), AuthGuard,
                NodeTokenRefresher (single-flight) for the 2h Komercia Node JWT
  web/          Astro SSR — login UI, /api/login, /api/sessions/revoke
  discovery/    CLI — maps the Komercia API surface for local development

packages/
  shared/          Types, JWT utilities, AES-256-GCM crypto service
  komercia-client/ Unified HTTP client + AuthResource for Laravel + Node
  eslint-config/   Shared ESLint flat config

scripts/
  migrate.mjs      Standalone migration runner (no app code)
  smoke-test.mjs   End-to-end smoke test
```

### Common commands

```bash
pnpm dev          # All apps in dev mode
pnpm test         # Vitest across packages
pnpm lint         # ESLint
pnpm -r typecheck # TypeScript across the monorepo
pnpm discover     # API discovery CLI
```

---

## Available tools

See [docs/tools-catalog.md](docs/tools-catalog.md) for the full list.

| Tool | Backend | What it does |
|---|---|---|
| `validate_komercia_apis` | both | Health check on Komercia endpoints |
| `get_store_info` | both | Store name, plan, URLs |
| `export_products` | Node | CSV/JSON/Shopify/WooCommerce |
| `export_orders` | Node | CSV with all orders |
| `export_customers` | Node | CSV of customer list |
| `export_categories` | Node | Hierarchy tree |
| `export_inventory_movements` | — | Stock history (stub) |
| `export_theme_config` | Node | Theme settings JSON |
| `list_payment_gateways` | Laravel | Configured payment methods |
| `download_media_archive` | — | Temporary ZIP URL (stub) |
| `suggest_alternative_platforms` | none | Migration recommendation |

---

## Architecture

```
[Merchant browser]
      │
      └──→  Astro Web (mcp.komercia.co)
                POST /api/login
                  ├─ Laravel /oauth/token  → access_token (100y) + refresh_token
                  ├─ Node    /api/v1/auth/stores/login → accessToken (2h)
                  └─ Laravel /api/admin/tienda  → real storeId
                Encrypts credentials + tokens (AES-256-GCM) → komercia_sessions
                Issues our own JWT (HS256, 6mo) → returns to merchant

[Claude.ai]
      └──→  NestJS MCP Server (api-mcp.komercia.co/sse)
                AuthGuard verifies our JWT → extracts jti
                KomerciaSessionService reads & decrypts session
                NodeTokenRefresher.ensureFresh() → re-logs Node when < 5min left
                  (single-flight per jti, auto-revokes on 401 = password rotated)
                KomerciaClient calls Komercia → returns to Claude
```

Token expiry strategy:
- **Laravel access token**: 100 years (Passport `tokensExpireIn(addCenturies(1))`) — never expires in practice.
- **Node access token**: 2 hours, no refresh endpoint. We re-login automatically using encrypted credentials stored at session creation.
- **Our own JWT**: 6 months. Revocation via `revoked_at` column (Komercia has no logout endpoint).

Full diagram: [docs/architecture.md](docs/architecture.md)

---

## Security

Read-only by design. The issued JWT carries `scope: read` enforced by the MCP server `AuthGuard`. Komercia credentials are stored server-side encrypted with AES-256-GCM (32-byte key in `KOMERCIA_SESSION_ENCRYPTION_KEY`, separate from the database). No write operations are exposed.

When a merchant rotates their Komercia password, the next refresh attempt fails with 401 and the session is auto-revoked, surfacing a clear "log in again" message to the user.

See [docs/security.md](docs/security.md) for the threat model and [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

---

## Contributing

See [docs/contributing.md](docs/contributing.md). [Conventional Commits](https://www.conventionalcommits.org/), [Changesets](https://github.com/changesets/changesets), CI green required.

---

## License

MIT — © 2024 Gustavo Moreno

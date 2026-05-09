# Architecture

## Overview

Two deployed services behind two subdomains:

```
mcp.komercia.co      →  apps/web        (Astro SSR, Vercel)
api-mcp.komercia.co  →  apps/mcp-server (NestJS, Railway)
```

Both share a single Postgres database (Neon in production) via the `komercia_sessions` table. They never share in-memory state — the database is the only coupling point.

---

## Request flow

### 1. Merchant logs in (web)

```
Merchant browser
  │
  POST /api/login  {email, password}
  │
  ├─ POST https://api2.komercia.co/oauth/token
  │    grant_type=password, client_id=2, client_secret=***
  │    → {access_token (100y), refresh_token}
  │
  ├─ POST https://api.komercia.app/api/v1/auth/stores/login
  │    {email, password}
  │    → {accessToken}  (JWT, expires in 2h)
  │
  ├─ GET  https://api2.komercia.co/api/admin/tienda
  │    Authorization: Bearer <laravel_token>
  │    → {data: {id: storeId}}   ← real store ID
  │
  ├─ AES-256-GCM encrypt {laravelToken, nodeToken, email, password}
  │    key = KOMERCIA_SESSION_ENCRYPTION_KEY (32 bytes, env-only)
  │
  ├─ INSERT komercia_sessions (jti, encrypted_data, store_id, ...)
  │
  └─ Sign our own JWT (HS256, 6mo)
       payload: {sub: merchantId, storeId, jti, scope: "read"}
       → returned to merchant (displayed once, never stored server-side)
```

### 2. Merchant connects Claude.ai

The merchant adds `https://api-mcp.komercia.co/sse` to Claude.ai Integrations and pastes their JWT as the bearer token. Claude.ai opens a persistent SSE connection.

### 3. Claude calls a tool (mcp-server)

```
Claude.ai
  │
  POST /messages  Authorization: Bearer <merchant_jwt>
  │
  ├─ AuthGuard
  │    verify JWT signature (JWT_SECRET)
  │    check revoked_at IS NULL
  │    extract {storeId, jti, scope}
  │    → MerchantContext
  │
  ├─ KomerciaSessionService.getSession(jti)
  │    SELECT * FROM komercia_sessions WHERE jti = $1 AND revoked_at IS NULL
  │    AES-256-GCM decrypt → {laravelToken, nodeToken, email, password}
  │
  ├─ NodeTokenRefresher.ensureFresh(session)
  │    if node_token_expires_at < now + 5min:
  │      single-flight lock per jti (prevents stampede)
  │      POST /api/v1/auth/stores/login {email, password}
  │      on 401 → mark session revoked (password rotated)
  │      on success → UPDATE komercia_sessions SET node_token = $1, expires_at = $2
  │
  ├─ KomerciaClient(nodeToken, laravelToken, storeId)
  │    calls the appropriate Komercia backend endpoint
  │
  └─ returns Markdown text → Claude → merchant
```

---

## Token strategy

| Token | Issuer | Expiry | Refresh strategy |
|-------|--------|--------|-----------------|
| Laravel access token | Komercia Passport | 100 years | Never expires in practice |
| Node access token | Komercia Node JWT | 2 hours | Re-login with encrypted credentials when < 5 min left |
| Our merchant JWT | komercia-mcp (HS256) | 6 months | No refresh — merchant logs in again |

**Why we store credentials server-side:** The Komercia Node backend has no refresh endpoint. The only way to extend access beyond 2 hours is to re-authenticate with `email + password`. Credentials are encrypted with AES-256-GCM using a key stored only in the server environment — never in the database.

---

## Database schema

The web app and mcp-server share one Postgres schema (managed by `scripts/migrate.mjs`).

### `komercia_sessions`

| Column | Type | Description |
|--------|------|-------------|
| `jti` | `uuid PK` | JWT ID — links the issued JWT to this session row |
| `merchant_id` | `text` | Komercia merchant ID (from Node JWT payload) |
| `store_id` | `text` | Komercia store ID |
| `laravel_token_encrypted` | `text` | AES-256-GCM encrypted Laravel access token |
| `node_token_encrypted` | `text` | AES-256-GCM encrypted Node access token |
| `email_encrypted` | `text` | AES-256-GCM encrypted email (for Node re-login) |
| `password_encrypted` | `text` | AES-256-GCM encrypted password (for Node re-login) |
| `node_token_expires_at` | `timestamptz` | When the Node token expires (refreshed automatically) |
| `revoked_at` | `timestamptz \| null` | Set by explicit revoke or on 401 from Komercia Node |
| `last_used_at` | `timestamptz` | Updated on every tool call |
| `schema_version` | `int` | Encryption schema version (current: 3) |
| `created_at` | `timestamptz` | When the merchant logged in |

### `rate_limits`

Used by the web app's login rate limiter (10 attempts/min per IP, 5/min per email). Postgres-backed so it survives Vercel cold starts.

| Column | Type | Description |
|--------|------|-------------|
| `key` | `text PK` | `ip:<addr>` or `email:<addr>` |
| `count` | `int` | Attempts in the current window |
| `window_start` | `timestamptz` | When the current window started |

---

## Encryption

All sensitive fields in `komercia_sessions` are encrypted with **AES-256-GCM** before being written to Postgres:

- Key: `KOMERCIA_SESSION_ENCRYPTION_KEY` (32 bytes / 64 hex chars, environment variable — never stored in DB)
- Each field gets its own random 12-byte IV (prepended to the ciphertext)
- Auth tag (16 bytes) is appended after the ciphertext
- Wire format: `<iv:24hex><ciphertext:hex><tag:32hex>`

The implementation lives in `packages/shared/src/crypto.ts`.

---

## Production topology

```
Vercel (Serverless)
  └── apps/web  (Astro SSR, adapter: @astrojs/vercel)
        ├── POST /api/login
        ├── POST /api/sessions/revoke
        └── GET  /  (login UI)

Railway
  └── apps/mcp-server  (NestJS, Docker)
        ├── GET  /sse       (SSE MCP transport)
        ├── POST /messages  (MCP tool calls, AuthGuard)
        └── GET  /health

Neon (Postgres)
  └── komercia_sessions
  └── rate_limits
```

Both services connect to Neon over TLS (`sslmode=require` in `DATABASE_URL`).

---

## Local dev topology

```
Docker Compose --profile full
  ├── postgres:16-alpine  (localhost:5434)
  ├── db-init             (runs migrate.mjs once, then exits)
  └── komercia-mcp-api    (localhost:3001)

Vercel dev / pnpm dev
  └── apps/web            (localhost:4321)
       loaded via node --env-file=../../.env
```

The web app is not containerized for local dev — it runs via `pnpm dev` to keep hot-reload fast.

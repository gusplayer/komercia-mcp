# Security Model

## Threat model

This system stores Komercia merchant credentials server-side to work around the Komercia Node API's 2-hour token expiry (no refresh endpoint exists). That design decision creates specific risks that are mitigated as described below.

---

## Assets

| Asset | Sensitivity | Where stored |
|-------|-------------|--------------|
| Merchant Komercia password | Critical | AES-256-GCM encrypted in Postgres |
| Komercia access tokens | High | AES-256-GCM encrypted in Postgres |
| Encryption key (`KOMERCIA_SESSION_ENCRYPTION_KEY`) | Critical | Environment variable only, never in DB |
| JWT signing secret (`JWT_SECRET`) | High | Environment variable only |
| Issued merchant JWT | Medium | Returned once to merchant, never stored |

---

## Threats and mitigations

### T1 — Database compromise

**Threat:** Attacker exfiltrates the `komercia_sessions` table.

**Mitigation:** All sensitive columns are encrypted with AES-256-GCM. The encryption key (`KOMERCIA_SESSION_ENCRYPTION_KEY`) is stored only in the server environment — never in the database. Without the key, the ciphertext is useless.

**Residual risk:** If both the database dump and the server environment are compromised simultaneously, credentials are exposed.

---

### T2 — JWT forgery

**Threat:** Attacker forges a merchant JWT to impersonate another store.

**Mitigation:** JWTs are signed HS256 with `JWT_SECRET` (minimum 256-bit random key). The `AuthGuard` verifies the signature on every request. The `jti` is checked against `komercia_sessions` — a forged JWT with a non-existent `jti` is rejected at the database lookup step.

---

### T3 — Stolen JWT (bearer token)

**Threat:** Merchant's JWT is stolen (e.g. from clipboard, browser history, phishing).

**Mitigation:**
- Tokens are read-only (`scope: read`) — no write operations are exposed regardless.
- The merchant can revoke their token at any time via the web UI (`POST /api/sessions/revoke`) or via Claude ("revoke my token").
- The `revoked_at` column is checked on every request.
- Tokens expire in 6 months.

---

### T4 — Komercia password rotation

**Threat:** Merchant rotates their Komercia password. The stored credentials become invalid but the session remains open, leaking stale data or causing confusing errors.

**Mitigation:** `NodeTokenRefresher` catches `401` responses from the Komercia Node login endpoint and immediately sets `revoked_at = now()` on the session. Subsequent tool calls return a clear "log in again" message to the merchant.

---

### T5 — Login brute force

**Threat:** Attacker brute-forces the `/api/login` endpoint with Komercia credentials.

**Mitigation:** Rate limiting at `apps/web`:
- **Per IP**: 10 requests / minute
- **Per email**: 5 requests / minute

Both limits use Postgres (`rate_limits` table) so they survive Vercel cold starts and scale across multiple serverless instances.

---

### T6 — CSRF on session revocation

**Threat:** Attacker tricks merchant into revoking their own session via a malicious page.

**Mitigation:** The web app's `/api/sessions/revoke` endpoint requires a valid CSRF token (set as a `HttpOnly` cookie on login, submitted as a header on revoke). Cross-origin requests cannot read the cookie.

---

### T7 — MCP tool injection

**Threat:** Malicious tool response or crafted Komercia data causes Claude to execute unintended actions.

**Mitigation:** All tools are read-only. No tool can write to Komercia, send messages, or modify any state outside the session. The `scope: read` claim is enforced in `AuthGuard` before any tool reaches execution.

---

## What this system does NOT protect

- **Komercia's own backend APIs.** If Komercia's APIs return sensitive data to authenticated requests, that is the merchant's expected behavior. We only proxy what the merchant's own credentials authorize.
- **Komercia credential theft at the source.** If the merchant's Komercia account is compromised before they authenticate with this tool, there is nothing we can do.
- **Claude.ai platform.** Anthropic's security model governs what Claude does with data returned by the MCP server.

---

## Reporting vulnerabilities

See [SECURITY.md](../SECURITY.md) for the responsible disclosure process and contact details.

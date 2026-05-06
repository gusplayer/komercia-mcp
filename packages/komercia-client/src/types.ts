export interface KomerciaBackendConfig {
  timeoutMs?: number; // default 15_000
  maxRetries?: number; // default 3
}

export interface KomerciaClientConfig extends KomerciaBackendConfig {
  // Base URLs (from env vars, set once at server startup)
  nodeUrl: string; // KOMERCIA_NODE_URL
  laravelUrl: string; // KOMERCIA_LARAVEL_URL
  editorUrl: string; // KOMERCIA_EDITOR_URL

  // Auth tokens (per-merchant, from komercia_sessions table)
  nodeToken: string; // merchant's NodeJS Bearer token
  laravelToken: string; // merchant's Laravel access_token

  // Public key for non-auth requests
  nodePublicKey: string; // KOMERCIA_NODE_PUBLIC_KEY

  // Per-merchant store ID (from JWT payload), injected at construction time
  storeId?: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

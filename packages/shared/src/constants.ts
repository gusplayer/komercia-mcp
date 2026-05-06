export const SCOPES = ['read'] as const;
export type Scope = (typeof SCOPES)[number];

export const JWT_EXPIRY_SECONDS = 15_552_000;
export const MAGIC_LINK_EXPIRY_SECONDS = 900;
export const MAGIC_LINK_MAX_ATTEMPTS = 3;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 10;

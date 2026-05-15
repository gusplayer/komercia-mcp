import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  WEB_BASE_URL: z.string().url('WEB_BASE_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  KOMERCIA_NODE_URL: z.string().url().default('https://api.komercia.app'),
  KOMERCIA_LARAVEL_URL: z.string().url().default('https://api2.komercia.co'),
  KOMERCIA_LARAVEL_CLIENT_ID: z.string().default('2'),
  KOMERCIA_LARAVEL_CLIENT_SECRET: z.string().default(''),
  // 32-byte AES-256-GCM key, hex-encoded (64 chars). Required.
  KOMERCIA_SESSION_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'KOMERCIA_SESSION_ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  // Canonical OAuth issuer / resource server. Used to redirect Claude.ai back
  // to the MCP server's /oauth/authorize/complete endpoint after login.
  MCP_SERVER_URL: z
    .string()
    .url('MCP_SERVER_URL must be a valid URL')
    .default('https://api-mcp.komercia.co'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs.join(', ')}`)
      .join('\n');
    throw new Error(`Environment configuration is invalid:\n${messages}`);
  }

  return result.data;
}

// Lazy singleton — evaluated on first import during runtime
let _config: ReturnType<typeof loadEnv> | undefined;

export function getConfig() {
  _config ??= loadEnv();
  const raw = _config;
  return {
    // Raw env keys (backward compat)
    DATABASE_URL: raw.DATABASE_URL,
    JWT_SECRET: raw.JWT_SECRET,
    WEB_BASE_URL: raw.WEB_BASE_URL,
    NODE_ENV: raw.NODE_ENV,
    // Camel-case convenience accessors
    jwtSecret: raw.JWT_SECRET,
    komerciaNodeUrl: raw.KOMERCIA_NODE_URL,
    komerciaLaravelUrl: raw.KOMERCIA_LARAVEL_URL,
    komerciaLaravelClientId: raw.KOMERCIA_LARAVEL_CLIENT_ID,
    komerciaLaravelClientSecret: raw.KOMERCIA_LARAVEL_CLIENT_SECRET,
    komerciaSessionEncryptionKey: raw.KOMERCIA_SESSION_ENCRYPTION_KEY,
    mcpServerUrl: raw.MCP_SERVER_URL,
  };
}

export type Config = ReturnType<typeof getConfig>;

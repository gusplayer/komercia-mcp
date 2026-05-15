import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  MCP_PORT: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 3001))
    .pipe(z.number().int().positive()),
  MCP_TRANSPORT: z
    .enum(['stdio', 'http'])
    .optional()
    .transform((val) => val ?? 'stdio'),
  MCP_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((val) =>
      val !== undefined && val.trim().length > 0
        ? val.split(',').map((s) => s.trim())
        : [],
    ),
  RATE_LIMIT_MAX: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive()),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 60000))
    .pipe(z.number().int().positive()),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .transform((val) => val ?? 'development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // 32-byte AES-256-GCM key, hex-encoded (64 chars). Required: without it the
  // MCP server cannot decrypt sessions, which is its only purpose.
  KOMERCIA_SESSION_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'KOMERCIA_SESSION_ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  KOMERCIA_NODE_URL: z.string().default('https://api.komercia.app'),
  KOMERCIA_LARAVEL_URL: z.string().default('https://api2.komercia.co'),
  KOMERCIA_EDITOR_URL: z.string().default('https://editor.komercia.app'),
  KOMERCIA_NODE_PUBLIC_KEY: z.string().default('komercia-public-key'),
  KOMERCIA_LARAVEL_CLIENT_ID: z.string().default('2'),
  KOMERCIA_LARAVEL_CLIENT_SECRET: z.string().default(''),
});

// Railway injects PORT; MCP_PORT overrides it when set explicitly.
const parsed = envSchema.parse({
  ...process.env,
  MCP_PORT: process.env['MCP_PORT'] ?? process.env['PORT'],
});

export const config = {
  jwtSecret: parsed.JWT_SECRET,
  mcpPort: parsed.MCP_PORT,
  mcpTransport: parsed.MCP_TRANSPORT,
  mcpAllowedOrigins: parsed.MCP_ALLOWED_ORIGINS,
  rateLimitMax: parsed.RATE_LIMIT_MAX,
  rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
  nodeEnv: parsed.NODE_ENV,
  databaseUrl: parsed.DATABASE_URL,
  komerciaSessionEncryptionKey: parsed.KOMERCIA_SESSION_ENCRYPTION_KEY,
  nodeUrl: parsed.KOMERCIA_NODE_URL,
  laravelUrl: parsed.KOMERCIA_LARAVEL_URL,
  editorUrl: parsed.KOMERCIA_EDITOR_URL,
  nodePublicKey: parsed.KOMERCIA_NODE_PUBLIC_KEY,
  laravelClientId: parsed.KOMERCIA_LARAVEL_CLIENT_ID,
  laravelClientSecret: parsed.KOMERCIA_LARAVEL_CLIENT_SECRET,
} as const;

export type Config = typeof config;

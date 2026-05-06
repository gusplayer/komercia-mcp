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
});

const parsed = envSchema.parse(process.env);

export const config = {
  jwtSecret: parsed.JWT_SECRET,
  mcpPort: parsed.MCP_PORT,
  mcpTransport: parsed.MCP_TRANSPORT,
  mcpAllowedOrigins: parsed.MCP_ALLOWED_ORIGINS,
  rateLimitMax: parsed.RATE_LIMIT_MAX,
  rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
  nodeEnv: parsed.NODE_ENV,
} as const;

export type Config = typeof config;

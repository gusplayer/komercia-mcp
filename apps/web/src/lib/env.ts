import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  WEB_BASE_URL: z.string().url('WEB_BASE_URL must be a valid URL'),
  FROM_EMAIL: z.string().email('FROM_EMAIL must be a valid email').default('noreply@komercia-export.com'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Environment configuration is invalid:\n${messages}`);
  }

  return result.data;
}

// Lazy singleton — evaluated on first import during runtime
let _config: ReturnType<typeof loadEnv> | undefined;

export function getConfig() {
  if (!_config) {
    _config = loadEnv();
  }
  return _config;
}

export type Config = ReturnType<typeof loadEnv>;

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import type { EndpointConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// apps/discovery/src -> apps/discovery
const PACKAGE_ROOT = join(__dirname, '..');

const EndpointConfigSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST']),
  description: z.string().optional(),
  pathParams: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

const BackendSeedSchema = z.object({
  baseUrl: z.string(),
  auth: z.object({
    type: z.string(),
    loginEndpoint: z.string().nullable(),
  }),
  endpoints: z.array(EndpointConfigSchema),
});

const EndpointsFileSchema = z.object({
  _instructions: z.string().optional(),
  backends: z.object({
    backend1: BackendSeedSchema,
    backend2: BackendSeedSchema,
    backend3: BackendSeedSchema,
  }),
});

export interface BackendConfig {
  name: string;
  baseUrl: string;
  endpoints: EndpointConfig[];
  authType: string;
  loginEndpoint: string | null;
}

export interface DiscoveryConfig {
  backends: [BackendConfig, BackendConfig, BackendConfig];
}

/**
 * Resolves an env-var placeholder like ${KOMERCIA_BACKEND_1_URL} from process.env.
 * If the placeholder is a literal URL (starts with http), returns it as-is.
 */
function resolveEnvPlaceholder(value: string): string {
  const match = /^\$\{(\w+)\}$/.exec(value);
  if (match !== null) {
    const varName = match[1];
    if (varName === undefined) return value;
    return process.env[varName] ?? value;
  }
  return value;
}

export function loadConfig(): DiscoveryConfig {
  const seedPath = join(PACKAGE_ROOT, 'endpoints-to-test.json');
  const raw = readFileSync(seedPath, 'utf-8');
  const parsed = EndpointsFileSchema.parse(JSON.parse(raw));

  const makeBackend = (
    name: string,
    seed: z.infer<typeof BackendSeedSchema>,
  ): BackendConfig => ({
    name,
    baseUrl: resolveEnvPlaceholder(seed.baseUrl),
    endpoints: seed.endpoints.map((ep) => {
      const entry: EndpointConfig = { path: ep.path, method: ep.method };
      if (ep.description !== undefined) entry.description = ep.description;
      if (ep.pathParams !== undefined) entry.pathParams = ep.pathParams;
      if (ep.queryParams !== undefined) entry.queryParams = ep.queryParams;
      if (ep.body !== undefined) entry.body = ep.body;
      return entry;
    }),
    authType: seed.auth.type,
    loginEndpoint: seed.auth.loginEndpoint,
  });

  return {
    backends: [
      makeBackend('backend1', parsed.backends.backend1),
      makeBackend('backend2', parsed.backends.backend2),
      makeBackend('backend3', parsed.backends.backend3),
    ],
  };
}

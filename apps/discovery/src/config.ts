import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  auth: z.string().optional(),
  pathParams: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

const AuthConfigSchema = z.object({
  type: z.string(),
  loginEndpoint: z.string().nullable(),
  loginMethod: z.string().optional(),
  loginBody: z.record(z.string(), z.string()).optional(),
  tokenPath: z.string().optional(),
});

const BackendSeedSchema = z.object({
  name: z.string().optional(),
  baseUrl: z.string(),
  auth: AuthConfigSchema,
  pathParams: z.record(z.string(), z.string()).optional(),
  endpoints: z.array(EndpointConfigSchema),
});

const EndpointsFileSchema = z.object({
  _instructions: z.string().optional(),
  backends: z.record(z.string(), BackendSeedSchema),
});

export interface AuthConfig {
  type: string;
  loginEndpoint: string | null;
  loginMethod?: string;
  loginBody?: Record<string, string>;
  tokenPath?: string;
}

export interface BackendConfig {
  name: string;
  baseUrl: string;
  endpoints: EndpointConfig[];
  authType: string;
  loginEndpoint: string | null;
  authConfig: AuthConfig;
  pathParams?: Record<string, string>;
}

export interface DiscoveryConfig {
  backends: BackendConfig[];
}

/**
 * Resolves an env-var placeholder like ${KOMERCIA_BACKEND_1_URL} from process.env.
 * If the placeholder is a literal URL (starts with http), returns it as-is.
 * Also resolves placeholders embedded within a larger string (e.g. path segments).
 */
function resolveEnvPlaceholder(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, varName: string) => {
    return process.env[varName] ?? `\${${varName}}`;
  });
}

function resolveEnvRecord(record: Record<string, string>): Record<string, string>;
function resolveEnvRecord(record: undefined): undefined;
function resolveEnvRecord(record?: Record<string, string>): Record<string, string> | undefined;
function resolveEnvRecord(
  record?: Record<string, string>,
): Record<string, string> | undefined {
  if (record === undefined) return undefined;
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [k, resolveEnvPlaceholder(v)]),
  );
}

export function loadConfig(): DiscoveryConfig {
  const seedPath = join(PACKAGE_ROOT, 'endpoints-to-test.json');
  const raw = readFileSync(seedPath, 'utf-8');
  const parsed = EndpointsFileSchema.parse(JSON.parse(raw));

  const makeBackend = (
    key: string,
    seed: z.infer<typeof BackendSeedSchema>,
  ): BackendConfig => {
    const authConfig: AuthConfig = { type: seed.auth.type, loginEndpoint: seed.auth.loginEndpoint };
    if (seed.auth.loginMethod !== undefined) authConfig.loginMethod = seed.auth.loginMethod;
    const resolvedLoginBody = resolveEnvRecord(seed.auth.loginBody);
    if (resolvedLoginBody !== undefined) authConfig.loginBody = resolvedLoginBody;
    if (seed.auth.tokenPath !== undefined) authConfig.tokenPath = seed.auth.tokenPath;

    const resolvedPathParams = resolveEnvRecord(seed.pathParams);

    const backend: BackendConfig = {
      name: seed.name ?? key,
      baseUrl: resolveEnvPlaceholder(seed.baseUrl),
      endpoints: seed.endpoints.map((ep) => {
        const entry: EndpointConfig = { path: ep.path, method: ep.method };
        if (ep.description !== undefined) entry.description = ep.description;
        if (ep.pathParams !== undefined)
          entry.pathParams = resolveEnvRecord(ep.pathParams);
        if (ep.queryParams !== undefined)
          entry.queryParams = resolveEnvRecord(ep.queryParams);
        if (ep.body !== undefined) entry.body = ep.body;
        return entry;
      }),
      authType: seed.auth.type,
      loginEndpoint: seed.auth.loginEndpoint,
      authConfig,
    };
    if (resolvedPathParams !== undefined) backend.pathParams = resolvedPathParams;
    return backend;
  };

  const backends = Object.entries(parsed.backends).map(([key, seed]) =>
    makeBackend(key, seed),
  );

  return { backends };
}

#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadConfig } from '../config.js';
import { EndpointTester, getRawBody } from '../engine/endpoint-tester.js';
import { AuthManager } from '../engine/auth-manager.js';
import { inferSchema } from '../engine/schema-inferrer.js';
import { generateMarkdown } from '../reporters/markdown.reporter.js';
import { generateApiMap } from '../reporters/json.reporter.js';
import type { BackendReport, DiscoveryReport, EndpointResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths from monorepo root regardless of cwd
// apps/discovery/src/bin -> apps/discovery -> (monorepo root is 2 levels up from apps/discovery)
const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const REPORT_MD_PATH = join(MONOREPO_ROOT, 'docs', 'api-discovery-report.md');
const API_MAP_PATH = join(
  MONOREPO_ROOT,
  'packages',
  'komercia-client',
  'src',
  'generated',
  'api-map.json',
);

async function main(): Promise<void> {
  console.log('[discovery] Loading configuration...');
  const config = loadConfig();

  const tester = new EndpointTester();
  const authManager = new AuthManager();
  const generatedAt = new Date().toISOString();

  const backendReports: BackendReport[] = [];
  let totalTested = 0;
  let totalOk = 0;
  let totalFailed = 0;

  for (const backend of config.backends) {
    console.log(`\n[discovery] Testing ${backend.name} at ${backend.baseUrl}`);

    // Attempt to obtain auth token if loginEndpoint is configured
    const token = await authManager.getToken(backend.baseUrl, backend.authConfig);

    if (token !== undefined) {
      console.log(`  [auth] Obtained token for ${backend.name}`);
    }

    const testedAt = new Date().toISOString();
    const endpointResults: EndpointResult[] = [];

    for (const endpointConfig of backend.endpoints) {
      const result = await tester.test(backend.baseUrl, endpointConfig, token);

      // Run schema inference on successful responses
      if (result.ok) {
        const rawBody = getRawBody(result);
        if (rawBody !== undefined && rawBody.length > 0) {
          try {
            const parsed: unknown = JSON.parse(rawBody);
            const typeName = deriveTypeName(endpointConfig.path);
            result.responseSchema = await inferSchema(parsed, typeName);
          } catch {
            // Non-JSON body — skip schema inference
          }
        }
      }

      const statusLabel = result.ok ? `${result.statusCode} OK` : `${result.statusCode} FAIL`;
      console.log(
        `  [${result.method}] ${result.path} -> ${statusLabel} (${result.responseTimeMs}ms)`,
      );

      endpointResults.push(result);
      totalTested++;
      if (result.ok) {
        totalOk++;
      } else {
        totalFailed++;
      }
    }

    backendReports.push({
      name: backend.name,
      baseUrl: backend.baseUrl,
      testedAt,
      endpoints: endpointResults,
    });
  }

  const report: DiscoveryReport = {
    generatedAt,
    backends: backendReports,
  };

  // Write Markdown report
  mkdirSync(dirname(REPORT_MD_PATH), { recursive: true });
  writeFileSync(REPORT_MD_PATH, generateMarkdown(report), 'utf-8');
  console.log(`\n[discovery] Markdown report written to: ${REPORT_MD_PATH}`);

  // Write api-map.json
  mkdirSync(dirname(API_MAP_PATH), { recursive: true });
  writeFileSync(API_MAP_PATH, generateApiMap(report), 'utf-8');
  console.log(`[discovery] API map written to: ${API_MAP_PATH}`);

  // Summary
  console.log('\n--- Discovery Summary ---');
  console.log(`  Total endpoints tested : ${totalTested}`);
  console.log(`  Passed                 : ${totalOk}`);
  console.log(`  Failed                 : ${totalFailed}`);
  console.log('-------------------------\n');

  // Exit 0 even if some endpoints failed
  process.exit(0);
}

/**
 * Derives a PascalCase type name from an endpoint path.
 * e.g. /stores/{storeId}/products -> StoresProducts
 */
function deriveTypeName(path: string): string {
  const segments = path
    .split('/')
    .filter((s) => s.length > 0 && !s.startsWith('{'));

  if (segments.length === 0) return 'Response';

  return segments
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

main().catch((err: unknown) => {
  console.error('[discovery] Fatal error:', err);
  process.exit(1);
});

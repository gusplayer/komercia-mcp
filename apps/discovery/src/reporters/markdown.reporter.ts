import type { DiscoveryReport, BackendReport, EndpointResult } from '../types.js';

/**
 * Generates a human-readable Markdown report from a DiscoveryReport.
 */
export function generateMarkdown(report: DiscoveryReport): string {
  const lines: string[] = [
    '# Komercia API Discovery Report',
    `Generated: ${report.generatedAt}`,
    '',
  ];

  for (const backend of report.backends) {
    lines.push(...renderBackend(backend));
  }

  return lines.join('\n');
}

function renderBackend(backend: BackendReport): string[] {
  const lines: string[] = [
    `## ${backend.name} (${backend.baseUrl})`,
    `Tested at: ${backend.testedAt}`,
    '',
  ];

  if (backend.endpoints.length === 0) {
    lines.push('_No endpoints configured for this backend._', '');
    return lines;
  }

  for (const endpoint of backend.endpoints) {
    lines.push(...renderEndpoint(endpoint));
  }

  return lines;
}

function renderEndpoint(endpoint: EndpointResult): string[] {
  const statusLabel = endpoint.ok ? `${endpoint.statusCode} OK` : `${endpoint.statusCode}`;
  const lines: string[] = [
    `### ${endpoint.method} ${endpoint.path}`,
    `- Status: ${statusLabel}`,
    `- Response time: ${endpoint.responseTimeMs}ms`,
  ];

  if (endpoint.sampleResponseSize !== undefined) {
    lines.push(`- Response size: ${endpoint.sampleResponseSize} bytes`);
  }

  if (!endpoint.ok && endpoint.error !== undefined) {
    lines.push(`- Error: ${endpoint.error}`);
  }

  if (endpoint.responseSchema !== undefined) {
    lines.push('- Response schema:');
    lines.push('  ```typescript');
    for (const schemaLine of endpoint.responseSchema.split('\n')) {
      lines.push(`  ${schemaLine}`);
    }
    lines.push('  ```');
  }

  lines.push('');
  return lines;
}

import { fetch } from 'undici';

import type { EndpointConfig, EndpointResult } from '../types.js';

const TIMEOUT_MS = 15_000;

export class EndpointTester {
  /**
   * Probes a single endpoint and returns a structured result.
   * Never throws — all errors are captured in EndpointResult.error.
   */
  async test(
    baseUrl: string,
    endpoint: EndpointConfig,
    auth?: string,
  ): Promise<EndpointResult> {
    const resolvedPath = resolvePath(endpoint.path, endpoint.pathParams);
    const url = buildUrl(baseUrl, resolvedPath, endpoint.queryParams);

    const start = Date.now();

    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS);

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (auth !== undefined) {
        headers['Authorization'] = auth;
      }

      let bodyInit: string | undefined;
      if (endpoint.method === 'POST' && endpoint.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        bodyInit = JSON.stringify(endpoint.body);
      }

      const fetchInit: Parameters<typeof fetch>[1] = {
        method: endpoint.method,
        headers,
        signal,
      };
      if (bodyInit !== undefined) {
        fetchInit.body = bodyInit;
      }
      const response = await fetch(url, fetchInit);

      const responseTimeMs = Date.now() - start;
      const statusCode = response.status;
      const ok = response.ok;

      // Capture body for schema inference only on 2xx
      let rawBody: string | null = null;
      let sampleResponseSize: number | undefined;
      if (ok) {
        rawBody = await response.text();
        sampleResponseSize = Buffer.byteLength(rawBody, 'utf-8');
      }

      const result: EndpointResult = {
        path: resolvedPath,
        method: endpoint.method,
        statusCode,
        responseTimeMs,
        ok,
        ...(sampleResponseSize !== undefined ? { sampleResponseSize } : {}),
      };

      // Attach the raw body as a non-enumerable property for later schema inference
      if (rawBody !== null) {
        Object.defineProperty(result, '_rawBody', { value: rawBody, enumerable: false });
      }

      return result;
    } catch (err) {
      const responseTimeMs = Date.now() - start;
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      return {
        path: resolvedPath,
        method: endpoint.method,
        statusCode: 0,
        responseTimeMs,
        ok: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * Replaces path param placeholders like {storeId} with actual values.
 */
function resolvePath(path: string, pathParams?: Record<string, string>): string {
  if (pathParams === undefined) return path;
  let resolved = path;
  for (const [key, value] of Object.entries(pathParams)) {
    resolved = resolved.replace(`{${key}}`, encodeURIComponent(value));
  }
  return resolved;
}

function buildUrl(
  baseUrl: string,
  path: string,
  queryParams?: Record<string, string>,
): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${fullPath}`;

  if (queryParams === undefined || Object.keys(queryParams).length === 0) {
    return url;
  }

  const qs = new URLSearchParams(queryParams).toString();
  return `${url}?${qs}`;
}

/** Utility to read the raw body attached by EndpointTester.test() */
export function getRawBody(result: EndpointResult): string | undefined {
  return (result as unknown as Record<string, unknown>)['_rawBody'] as string | undefined;
}

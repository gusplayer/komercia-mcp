export interface EndpointConfig {
  path: string;
  method: 'GET' | 'POST';
  description?: string;
  pathParams?: Record<string, string>; // e.g. { storeId: 'test-store-123' }
  queryParams?: Record<string, string>;
  body?: unknown;
}

export interface EndpointResult {
  path: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ok: boolean;
  error?: string;
  responseSchema?: string; // TypeScript interface as string
  sampleResponseSize?: number; // bytes
}

export interface BackendReport {
  name: string;
  baseUrl: string;
  testedAt: string;
  endpoints: EndpointResult[];
}

export interface DiscoveryReport {
  generatedAt: string;
  backends: BackendReport[];
}

export interface KomerciaClientConfig {
  backend1Url: string; // KOMERCIA_BACKEND_1_URL
  backend2Url: string; // KOMERCIA_BACKEND_2_URL
  backend3Url: string; // KOMERCIA_BACKEND_3_URL
  internalApiKey?: string;
  timeoutMs?: number; // default 10_000
  maxRetries?: number; // default 3
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

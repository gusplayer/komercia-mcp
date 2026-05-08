import pRetry, { AbortError } from 'p-retry';

import {
  KomerciaApiError,
  KomerciaAuthError,
  KomerciaNotFoundError,
  KomerciaRateLimitError,
  KomerciaTimeoutError,
} from './errors.js';

/**
 * A fetch-compatible function signature that can be injected for testing.
 * Defaults to globalThis.fetch (Node 18+ / undici global).
 */
export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

interface RequestOptions {
  auth?: string;
  /** Optional API key sent as KOMERCIA_PUBLIC_ROUTES_KEY header */
  apiKeyHeader?: string;
}

interface HttpClientConfig {
  timeoutMs: number;
  maxRetries: number;
  /** Optional fetch implementation override — useful for testing. Defaults to globalThis.fetch */
  fetcher?: FetchFn;
}

export class HttpClient {
  private readonly fetcher: FetchFn;

  constructor(
    private readonly baseUrl: string,
    private readonly config: HttpClientConfig,
  ) {
    // Default to globalThis.fetch so MSW can intercept in tests,
    // and Node's built-in fetch (backed by undici) is used in production.
    this.fetcher = config.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * POST with URL-encoded form data — used for OAuth2 token endpoints (Laravel).
   */
  async postForm<T>(path: string, formData: URLSearchParams): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const attempt = async (): Promise<T> => {
      const signal = AbortSignal.timeout(this.config.timeoutMs);

      let response: Response;
      try {
        response = await this.fetcher(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: formData.toString(),
          signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'TimeoutError') {
          throw new AbortError(new KomerciaTimeoutError(path));
        }
        throw err;
      }

      this.throwOnError(response, path);

      return response.json() as Promise<T>;
    };

    return pRetry(attempt, {
      retries: this.config.maxRetries,
      factor: 2,
      minTimeout: 100,
      randomize: true,
      shouldRetry: (err) => {
        if (err instanceof KomerciaTimeoutError) return false;
        if (err instanceof KomerciaApiError && err.status >= 400 && err.status < 500) {
          return false;
        }
        return true;
      },
    });
  }

  /**
   * GET returning raw ArrayBuffer — used for binary export endpoints (Excel).
   */
  async getRaw(path: string, options?: RequestOptions): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}${path}`;

    const attempt = async (): Promise<ArrayBuffer> => {
      const signal = AbortSignal.timeout(this.config.timeoutMs);

      let response: Response;
      try {
        const headers: Record<string, string> = {
          Accept: '*/*',
        };
        if (options?.auth !== undefined) {
          headers['Authorization'] = `Bearer ${options.auth}`;
        }
        if (options?.apiKeyHeader !== undefined) {
          headers['KOMERCIA_PUBLIC_ROUTES_KEY'] = options.apiKeyHeader;
        }

        response = await this.fetcher(url, { method: 'GET', headers, signal });
      } catch (err) {
        if (err instanceof Error && err.name === 'TimeoutError') {
          throw new AbortError(new KomerciaTimeoutError(path));
        }
        throw err;
      }

      this.throwOnError(response, path);

      return response.arrayBuffer();
    };

    return pRetry(attempt, {
      retries: this.config.maxRetries,
      factor: 2,
      minTimeout: 100,
      randomize: true,
      shouldRetry: (err) => {
        if (err instanceof KomerciaTimeoutError) return false;
        if (err instanceof KomerciaApiError && err.status >= 400 && err.status < 500) {
          return false;
        }
        return true;
      },
    });
  }

  /**
   * GET returning raw text — used for CSV export endpoints.
   */
  async getText(path: string, options?: RequestOptions): Promise<string> {
    const url = `${this.baseUrl}${path}`;

    const attempt = async (): Promise<string> => {
      const signal = AbortSignal.timeout(this.config.timeoutMs);

      let response: Response;
      try {
        const headers: Record<string, string> = {
          Accept: 'text/csv,text/plain,*/*',
        };
        if (options?.auth !== undefined) {
          headers['Authorization'] = `Bearer ${options.auth}`;
        }
        if (options?.apiKeyHeader !== undefined) {
          headers['KOMERCIA_PUBLIC_ROUTES_KEY'] = options.apiKeyHeader;
        }

        response = await this.fetcher(url, { method: 'GET', headers, signal });
      } catch (err) {
        if (err instanceof Error && err.name === 'TimeoutError') {
          throw new AbortError(new KomerciaTimeoutError(path));
        }
        throw err;
      }

      this.throwOnError(response, path);

      return response.text();
    };

    return pRetry(attempt, {
      retries: this.config.maxRetries,
      factor: 2,
      minTimeout: 100,
      randomize: true,
      shouldRetry: (err) => {
        if (err instanceof KomerciaTimeoutError) return false;
        if (err instanceof KomerciaApiError && err.status >= 400 && err.status < 500) {
          return false;
        }
        return true;
      },
    });
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const attempt = async (): Promise<T> => {
      const signal = AbortSignal.timeout(this.config.timeoutMs);

      let response: Response;
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (options?.auth !== undefined) {
          headers['Authorization'] = options.auth;
        }
        if (options?.apiKeyHeader !== undefined) {
          headers['KOMERCIA_PUBLIC_ROUTES_KEY'] = options.apiKeyHeader;
        }

        const fetchInit: RequestInit = { method, headers, signal };
        if (body !== undefined) {
          fetchInit.body = JSON.stringify(body);
        }

        response = await this.fetcher(url, fetchInit);
      } catch (err) {
        // AbortSignal.timeout() fires a DOMException with name 'TimeoutError'
        if (err instanceof Error && err.name === 'TimeoutError') {
          // Wrap in AbortError so p-retry stops immediately (no retries on timeout)
          // Pass the KomerciaTimeoutError as the original so p-retry re-throws it
          throw new AbortError(new KomerciaTimeoutError(path));
        }
        // Network / connection error — retryable
        throw err;
      }

      this.throwOnError(response, path);

      return response.json() as Promise<T>;
    };

    return pRetry(attempt, {
      retries: this.config.maxRetries,
      factor: 2,
      minTimeout: 100,
      randomize: true,
      shouldRetry: (err) => {
        // Do not retry on KomerciaTimeoutError, KomerciaApiError 4xx
        if (err instanceof KomerciaTimeoutError) return false;
        if (err instanceof KomerciaApiError && err.status >= 400 && err.status < 500) {
          return false;
        }
        return true;
      },
    });
  }

  private throwOnError(response: Response, path: string): void {
    if (response.ok) return;

    const status = response.status;

    if (status === 404) {
      throw new KomerciaNotFoundError(path);
    }
    if (status === 401 || status === 403) {
      throw new KomerciaAuthError(path);
    }
    if (status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs =
        retryAfterHeader !== null ? parseInt(retryAfterHeader, 10) * 1000 : 60_000;
      throw new KomerciaRateLimitError(retryAfterMs, path);
    }

    const message = `HTTP ${String(status)} from ${path}`;
    if (status >= 400 && status < 500) {
      // Non-retryable 4xx — throw KomerciaApiError so p-retry stops
      throw new KomerciaApiError(status, path, message);
    }

    // 5xx — retryable, throw plain Error so p-retry will retry
    throw new Error(message);
  }
}

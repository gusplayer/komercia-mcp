export class KomerciaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    message: string,
  ) {
    super(message);
    this.name = 'KomerciaApiError';
  }
}

export class KomerciaNotFoundError extends KomerciaApiError {
  constructor(endpoint: string) {
    super(404, endpoint, `Not found: ${endpoint}`);
    this.name = 'KomerciaNotFoundError';
  }
}

export class KomerciaAuthError extends KomerciaApiError {
  constructor(endpoint: string) {
    super(401, endpoint, `Unauthorized: ${endpoint}`);
    this.name = 'KomerciaAuthError';
  }
}

export class KomerciaRateLimitError extends KomerciaApiError {
  constructor(
    public readonly retryAfterMs: number,
    endpoint: string,
  ) {
    super(429, endpoint, 'Rate limited');
    this.name = 'KomerciaRateLimitError';
  }
}

export class KomerciaTimeoutError extends Error {
  constructor(endpoint: string) {
    super(`Request timed out: ${endpoint}`);
    this.name = 'KomerciaTimeoutError';
  }
}

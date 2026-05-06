import { fetch } from 'undici';

export interface AuthConfig {
  type: string;
  loginEndpoint: string | null;
}

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Handles authentication for each backend.
 * Currently supports bearer token login via a POST to a loginEndpoint.
 */
export class AuthManager {
  /**
   * Obtains a bearer token for a backend.
   * Returns undefined if no loginEndpoint is configured or credentials are not provided.
   */
  async getToken(
    baseUrl: string,
    authConfig: AuthConfig,
    credentials?: Credentials,
  ): Promise<string | undefined> {
    if (authConfig.loginEndpoint === null || credentials === undefined) {
      return undefined;
    }

    const url = `${baseUrl.replace(/\/$/, '')}${authConfig.loginEndpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn(
          `[auth-manager] Login to ${url} failed with status ${response.status}`,
        );
        return undefined;
      }

      const body = (await response.json()) as Record<string, unknown>;

      // Support common token field names
      const token =
        body['token'] ??
        body['access_token'] ??
        body['accessToken'] ??
        body['jwt'];

      if (typeof token !== 'string') {
        console.warn(`[auth-manager] Could not extract token from login response at ${url}`);
        return undefined;
      }

      return `Bearer ${token}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[auth-manager] Login request to ${url} failed: ${message}`);
      return undefined;
    }
  }
}

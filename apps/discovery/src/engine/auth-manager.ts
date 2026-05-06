import { fetch } from 'undici';

export interface AuthConfig {
  type: string;
  loginEndpoint: string | null;
  loginMethod?: string;
  loginBody?: Record<string, string>;
  tokenPath?: string;
}

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Resolves a dot-separated path (e.g. "data.token") from a nested object.
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Handles authentication for each backend.
 * Supports:
 *   - bearer: JSON POST with email/password, token extracted via tokenPath
 *   - oauth2_password: form-data POST (application/x-www-form-urlencoded) for OAuth2 password grant
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
    if (authConfig.loginEndpoint === null) {
      return undefined;
    }

    const url = `${baseUrl.replace(/\/$/, '')}${authConfig.loginEndpoint}`;
    const authType = authConfig.type;

    try {
      let response: Awaited<ReturnType<typeof fetch>>;

      if (authType === 'oauth2_password') {
        // OAuth2 password grant: send as application/x-www-form-urlencoded
        const body = authConfig.loginBody ?? {};
        // Merge in credentials as fallback if not already in loginBody
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(body)) {
          params.append(key, value);
        }
        // If loginBody didn't include username/password fields and credentials were provided,
        // append them under the standard OAuth2 field names
        if (credentials !== undefined) {
          if (!params.has('username')) params.append('username', credentials.username);
          if (!params.has('password')) params.append('password', credentials.password);
        }

        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          signal: AbortSignal.timeout(10_000),
        });
      } else {
        // Default: bearer / JSON POST
        if (credentials === undefined && authConfig.loginBody === undefined) {
          return undefined;
        }

        const body: Record<string, string> = { ...(authConfig.loginBody ?? {}) };
        if (credentials !== undefined) {
          // Merge credentials into body using field names from loginBody if present,
          // otherwise fall back to standard email/password keys
          if (!('email' in body) && !('username' in body)) {
            body['email'] = credentials.username;
          }
          if (!('password' in body)) {
            body['password'] = credentials.password;
          }
        }

        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
      }

      if (!response.ok) {
        console.warn(
          `[auth-manager] Login to ${url} failed with status ${response.status}`,
        );
        return undefined;
      }

      const responseBody = (await response.json()) as Record<string, unknown>;

      // Resolve token via configured tokenPath or fall back to common field names
      let token: unknown;
      if (authConfig.tokenPath !== undefined) {
        token = resolvePath(responseBody, authConfig.tokenPath);
      } else {
        token =
          responseBody['token'] ??
          responseBody['access_token'] ??
          responseBody['accessToken'] ??
          responseBody['jwt'];
      }

      if (typeof token !== 'string') {
        console.warn(
          `[auth-manager] Could not extract token from login response at ${url}`,
        );
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

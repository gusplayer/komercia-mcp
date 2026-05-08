import type { HttpClient } from '../http.js';

// POST /api/v1/auth/stores/login response
// JWT payload: { id: number (= storeId), email: string, iat, exp }
export interface NodeLoginResponse {
  accessToken: string;
}

export interface LaravelTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResourceConfig {
  laravelClientId: string;
  laravelClientSecret: string;
}

// GET /api/admin/tienda response (Laravel) — only the fields we use.
export interface LaravelStoreInfo {
  id: number;
  nombre: string;
  subdominio?: string;
  [key: string]: unknown;
}

/**
 * AuthResource handles initial authentication against Komercia backends
 * and the post-login lookup of the real storeId.
 */
export class AuthResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly config: AuthResourceConfig,
  ) {}

  /**
   * Returns the merchant's authenticated store (Laravel side).
   * The `id` here is the canonical storeId used in NodeJS panel paths,
   * NOT the `id` claim of the Komercia Node JWT (that one is the merchantId).
   */
  async getMyStore(laravelToken: string): Promise<LaravelStoreInfo> {
    const response = await this.laravelHttp.get<{ data: LaravelStoreInfo }>(
      '/api/admin/tienda',
      { auth: `Bearer ${laravelToken}` },
    );
    return response.data;
  }

  /**
   * Authenticate against the NodeJS backend.
   * POST /api/v1/auth/stores/login → { accessToken: string }
   * The JWT payload carries { id: number } which is the store identifier.
   */
  async loginNode(email: string, password: string): Promise<NodeLoginResponse> {
    return this.nodeHttp.post<NodeLoginResponse>('/api/v1/auth/stores/login', {
      email,
      password,
    });
  }

  /**
   * Authenticate against the Laravel backend using OAuth2 password grant.
   * POST /oauth/token (form-data) → { access_token, refresh_token, ... }
   * Requires a valid client_secret; treated as optional in the login flow.
   */
  async loginLaravel(email: string, password: string): Promise<LaravelTokenResponse> {
    const formData = new URLSearchParams({
      grant_type: 'password',
      client_id: this.config.laravelClientId,
      client_secret: this.config.laravelClientSecret,
      username: email,
      password,
      scope: '',
    });

    return this.laravelHttp.postForm<LaravelTokenResponse>('/oauth/token', formData);
  }
}

import type { HttpClient } from '../http.js';

// TODO: verify response shape after discovery
export interface NodeLoginResponse {
  data: {
    token: string;
    storeId: number;
    [key: string]: unknown;
  };
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

/**
 * AuthResource handles initial authentication against Komercia backends.
 * Used during magic link redemption (web app onboarding flow) to collect
 * and store the merchant's Komercia tokens in komercia_sessions.
 */
export class AuthResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly config: AuthResourceConfig,
  ) {}

  /**
   * Authenticate against the NodeJS backend.
   * POST /api/v1/auth/stores/login
   * Returns a token and storeId to be stored in komercia_sessions.
   * TODO: verify response shape after discovery
   */
  async loginNode(email: string, password: string): Promise<NodeLoginResponse> {
    // TODO: verify response shape after discovery
    return this.nodeHttp.post<NodeLoginResponse>('/api/v1/auth/stores/login', {
      email,
      password,
    });
  }

  /**
   * Authenticate against the Laravel backend using OAuth2 password grant.
   * POST /oauth/token (form-data)
   * Returns access_token and refresh_token to be stored in komercia_sessions.
   * TODO: verify response shape after discovery
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

    // TODO: verify response shape after discovery
    return this.laravelHttp.postForm<LaravelTokenResponse>('/oauth/token', formData);
  }
}

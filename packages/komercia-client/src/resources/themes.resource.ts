import type { HttpClient } from '../http.js';

// TODO: verify response shape after discovery
export interface KomerciaTemplateSettings {
  template?: number | string;
  storeId?: number | string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

// TODO: verify response shape after discovery
export interface KomerciaWebsite {
  id: number | string;
  nombre?: string;
  dominio?: string;
  [key: string]: unknown;
}

export class ThemesResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly nodePublicKey: string,
  ) {}

  /**
   * Get template settings for a store.
   * NodeJS backend. GET /api/v1/templates/store-template-settings
   * Auth: API key header (KOMERCIA_PUBLIC_ROUTES_KEY)
   * TODO: verify response shape after discovery
   */
  async getTemplateSettings(storeId: string, templateNum: number | string): Promise<KomerciaTemplateSettings> {
    // TODO: verify response shape after discovery
    return this.nodeHttp.get<KomerciaTemplateSettings>(
      `/api/v1/templates/store-template-settings?template=${encodeURIComponent(String(templateNum))}&storeId=${encodeURIComponent(storeId)}`,
      { apiKeyHeader: this.nodePublicKey },
    );
  }

  /**
   * Get available websites/themes.
   * NodeJS backend. GET /api/v1/templates/websites
   * Auth: Bearer token
   * TODO: verify response shape after discovery
   */
  async getWebsites(): Promise<KomerciaWebsite[]> {
    // TODO: verify response shape after discovery
    const response = await this.nodeHttp.get<
      { data: KomerciaWebsite[] } | KomerciaWebsite[]
    >('/api/v1/templates/websites', { auth: `Bearer ${this.nodeToken}` });

    if (Array.isArray(response)) {
      return response;
    }
    if ('data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }
}

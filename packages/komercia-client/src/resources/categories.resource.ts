import type { HttpClient } from '../http.js';

// TODO: verify response shape after discovery
export interface KomerciaCategory {
  id: number | string;
  nombre?: string;
  slug?: string;
  padre_id?: number | string | null;
  activo?: boolean;
  subcategorias?: KomerciaCategory[];
  [key: string]: unknown;
}

export class CategoriesResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly laravelToken: string,
    private readonly storeId: string,
  ) {}

  /**
   * List categories and subcategories for a store.
   * Primary: NodeJS backend. GET /api/v1/panel/get-categorias-subcategories/{storeId}
   * Fallback: Laravel backend. GET /api/admin/categorias
   * TODO: verify response shape after discovery
   */
  async list(): Promise<KomerciaCategory[]> {
    try {
      // TODO: verify response shape after discovery
      const response = await this.nodeHttp.get<{ data: KomerciaCategory[] } | KomerciaCategory[]>(
        `/api/v1/panel/get-categorias-subcategories/${this.storeId}`,
        { auth: `Bearer ${this.nodeToken}` },
      );

      // Handle both array and wrapped responses
      if (Array.isArray(response)) {
        return response;
      }
      if ('data' in response && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      // Fallback to Laravel backend
      // TODO: verify response shape after discovery
      const response = await this.laravelHttp.get<{ data: KomerciaCategory[] } | KomerciaCategory[]>(
        '/api/admin/categorias',
        { auth: `Bearer ${this.laravelToken}` },
      );

      if (Array.isArray(response)) {
        return response;
      }
      if ('data' in response && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    }
  }
}

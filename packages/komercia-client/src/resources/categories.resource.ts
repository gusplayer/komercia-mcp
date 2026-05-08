import type { HttpClient } from '../http.js';

export interface KomerciaCategory {
  id: number | string;
  nombre?: string;
  slug?: string;
  padre_id?: number | string | null;
  activo?: boolean;
  subcategorias?: KomerciaCategory[];
  [key: string]: unknown;
}

// GET /api/v1/panel/get-categorias-subcategories/{storeId} response
interface NodeCategoriesResponse {
  categories: KomerciaCategory[];
  subcategories: KomerciaCategory[];
}

export class CategoriesResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly _laravelHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly _laravelToken: string,
    private readonly storeId: string,
  ) {}

  /**
   * List all categories (main + subcategories) for a store.
   * NodeJS backend. GET /api/v1/panel/get-categorias-subcategories/{storeId}
   * Response: { categories: [...], subcategories: [...] }
   * Returns a flat merged list so callers can build their own tree if needed.
   */
  async list(): Promise<KomerciaCategory[]> {
    const response = await this.nodeHttp.get<NodeCategoriesResponse>(
      `/api/v1/panel/get-categorias-subcategories/${this.storeId}`,
      { auth: `Bearer ${this.nodeToken}` },
    );
    return [...response.categories, ...response.subcategories];
  }
}

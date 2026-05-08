import type { HttpClient } from '../http.js';

export interface ProductFilterParams {
  page?: number;
  limit?: number;
  name?: string;
  categoryID?: string;
  freeShipping?: boolean;
  withVariants?: boolean;
}

// Komercia panel product shape (validated 2026-05 against tienda 1559).
// The `[key: string]: unknown` index keeps us forward-compatible: Komercia
// adds fields over time (e.g. SKU, variants) and we surface them via
// adapters.ts without breaking type checking.
export interface KomerciaProduct {
  id: number | string;
  nombre: string;
  precio: number;
  stock?: number;
  [key: string]: unknown;
}

// GET /api/v1/panel/filter-products/{storeId} response
interface NodeProductsResponse {
  data: KomerciaProduct[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

export interface ProductsPage {
  products: KomerciaProduct[];
  total: number;
  page: number;
  limit: number;
}

export class ProductsResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly laravelToken: string,
    private readonly storeId: string,
  ) {}

  /**
   * List products with optional filters.
   * NodeJS backend. GET /api/v1/panel/filter-products/{storeId}
   */
  async list(params?: ProductFilterParams): Promise<ProductsPage> {
    const query = buildProductQuery(params);
    const response = await this.nodeHttp.get<NodeProductsResponse>(
      `/api/v1/panel/filter-products/${this.storeId}${query}`,
      { auth: `Bearer ${this.nodeToken}` },
    );

    return {
      products: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
    };
  }

  /**
   * Export all products as raw Excel bytes.
   * Laravel backend. GET /api/admin/productos/exportar
   * Returns raw Excel bytes.
   */
  async exportRaw(): Promise<ArrayBuffer> {
    return this.laravelHttp.getRaw('/api/admin/productos/exportar', {
      auth: this.laravelToken,
    });
  }

  /**
   * Fetch all products by iterating pages from list().
   * Aggregates all pages until no more products are returned.
   */
  async exportPaged(params?: Omit<ProductFilterParams, 'page'>): Promise<KomerciaProduct[]> {
    const limit = params?.limit ?? 100;
    const allProducts: KomerciaProduct[] = [];
    let page = 1;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- pagination loop, exits via break
    while (true) {
      const result = await this.list({ ...params, page, limit });
      allProducts.push(...result.products);

      if (allProducts.length >= result.total || result.products.length === 0) {
        break;
      }

      page++;
    }

    return allProducts;
  }
}

function buildProductQuery(params?: ProductFilterParams): string {
  if (params === undefined) return '';
  const parts: string[] = [];
  if (params.page !== undefined) parts.push(`page=${String(params.page)}`);
  if (params.limit !== undefined) parts.push(`limit=${String(params.limit)}`);
  if (params.name !== undefined) parts.push(`name=${encodeURIComponent(params.name)}`);
  if (params.categoryID !== undefined) parts.push(`categoryID=${encodeURIComponent(params.categoryID)}`);
  if (params.freeShipping !== undefined) parts.push(`freeShipping=${String(params.freeShipping)}`);
  if (params.withVariants !== undefined) parts.push(`withVariants=${String(params.withVariants)}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

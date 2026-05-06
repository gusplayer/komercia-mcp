import type { HttpClient } from '../http.js';

export interface ProductFilterParams {
  page?: number;
  limit?: number;
  name?: string;
  categoryID?: string;
  freeShipping?: boolean;
  withVariants?: boolean;
}

// TODO: verify response shape after discovery
export interface KomerciaProduct {
  id: number | string;
  nombre: string;
  precio: number;
  stock?: number;
  [key: string]: unknown;
}

// TODO: verify response shape after discovery
interface NodeProductsResponse {
  data: {
    products: KomerciaProduct[];
    total: number;
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
    // TODO: verify response shape after discovery
    const response = await this.nodeHttp.get<NodeProductsResponse>(
      `/api/v1/panel/filter-products/${this.storeId}${query}`,
      { auth: `Bearer ${this.nodeToken}` },
    );

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;

    return {
      products: response.data.products,
      total: response.data.total,
      page,
      limit,
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
  if (params.page !== undefined) parts.push(`page=${params.page}`);
  if (params.limit !== undefined) parts.push(`limit=${params.limit}`);
  if (params.name !== undefined) parts.push(`name=${encodeURIComponent(params.name)}`);
  if (params.categoryID !== undefined) parts.push(`categoryID=${encodeURIComponent(params.categoryID)}`);
  if (params.freeShipping !== undefined) parts.push(`freeShipping=${params.freeShipping}`);
  if (params.withVariants !== undefined) parts.push(`withVariants=${params.withVariants}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

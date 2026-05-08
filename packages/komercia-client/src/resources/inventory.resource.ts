import type { HttpClient } from '../http.js';
import type { KomerciaProduct, ProductFilterParams } from './products.resource.js';

// NOTE: Komercia's Laravel backend does not expose an inventory movements log endpoint.
// Stock levels are derived from the products endpoint (which includes a stock field).
// No inventory movements history is available — this is a known API limitation.

// TODO: verify response shape after discovery
export interface KomerciaPromotion {
  id: number | string;
  nombre?: string;
  descuento?: number;
  activo?: boolean;
  [key: string]: unknown;
}

// TODO: verify response shape after discovery
export interface KomerciaSupplier {
  id: number | string;
  nombre?: string;
  email?: string;
  telefono?: string;
  [key: string]: unknown;
}

export interface StockLevelsPage {
  products: KomerciaProduct[];
  total: number;
  page: number;
  limit: number;
}

// TODO: verify response shape after discovery
interface NodeProductsResponse {
  data: {
    products: KomerciaProduct[];
    total: number;
  };
}

export class InventoryResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly laravelToken: string,
    private readonly storeId: string,
  ) {}

  /**
   * Get stock levels for products in the store.
   * NodeJS backend. GET /api/v1/panel/filter-products/{storeId}
   * The products response includes a "stock" field for each product.
   *
   * NOTE: No inventory movements log is available — this is a known API limitation.
   */
  async getStockLevels(params?: ProductFilterParams): Promise<StockLevelsPage> {
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
   * List active promotions.
   * Laravel backend. GET /api/admin/promociones
   * TODO: verify response shape after discovery
   */
  async getPromotions(): Promise<KomerciaPromotion[]> {
    // TODO: verify response shape after discovery
    const response = await this.laravelHttp.get<
      { data: KomerciaPromotion[] } | KomerciaPromotion[]
    >('/api/admin/promociones', { auth: `Bearer ${this.laravelToken}` });

    if (Array.isArray(response)) {
      return response;
    }
    if ('data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * List suppliers.
   * Laravel backend. GET /api/admin/proveedores
   * TODO: verify response shape after discovery
   */
  async getSuppliers(): Promise<KomerciaSupplier[]> {
    // TODO: verify response shape after discovery
    const response = await this.laravelHttp.get<
      { data: KomerciaSupplier[] } | KomerciaSupplier[]
    >('/api/admin/proveedores', { auth: `Bearer ${this.laravelToken}` });

    if (Array.isArray(response)) {
      return response;
    }
    if ('data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
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

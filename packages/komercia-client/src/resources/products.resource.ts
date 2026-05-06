import type { Product, PaginationParams } from '@komercia-mcp/shared';
import type { HttpClient } from '../http.js';
import type { ListResponse } from '../types.js';

export class ProductsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List products for a store.
   * Uses Backend 1. GET /stores/{storeId}/products
   * NOTE: actual endpoints TBD pending discovery — using these URLs as placeholders.
   */
  async list(storeId: string, params?: PaginationParams): Promise<ListResponse<Product>> {
    const query = buildQuery(params);
    return this.http.get<ListResponse<Product>>(`/stores/${storeId}/products${query}`);
  }

  /**
   * Retrieve a single product by ID.
   * Uses Backend 1. GET /stores/{storeId}/products/{productId}
   */
  async get(storeId: string, productId: string): Promise<Product> {
    return this.http.get<Product>(`/stores/${storeId}/products/${productId}`);
  }
}

function buildQuery(params?: PaginationParams): string {
  if (params === undefined) return '';
  const parts: string[] = [];
  if (params.page !== undefined) parts.push(`page=${params.page}`);
  if (params.per_page !== undefined) parts.push(`per_page=${params.per_page}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

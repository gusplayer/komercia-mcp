import type { Category, PaginationParams } from '@komercia-mcp/shared';
import type { HttpClient } from '../http.js';
import type { ListResponse } from '../types.js';

export class CategoriesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List categories for a store.
   * Uses Backend 1. GET /stores/{storeId}/categories
   * NOTE: actual endpoints TBD pending discovery — using these URLs as placeholders.
   */
  async list(storeId: string, params?: PaginationParams): Promise<ListResponse<Category>> {
    const query = buildQuery(params);
    return this.http.get<ListResponse<Category>>(`/stores/${storeId}/categories${query}`);
  }

  /**
   * Retrieve a single category by ID.
   * Uses Backend 1. GET /stores/{storeId}/categories/{categoryId}
   */
  async get(storeId: string, categoryId: string): Promise<Category> {
    return this.http.get<Category>(`/stores/${storeId}/categories/${categoryId}`);
  }
}

function buildQuery(params?: PaginationParams): string {
  if (params === undefined) return '';
  const parts: string[] = [];
  if (params.page !== undefined) parts.push(`page=${params.page}`);
  if (params.per_page !== undefined) parts.push(`per_page=${params.per_page}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

import type { Order, PaginationParams } from '@komercia-mcp/shared';
import type { HttpClient } from '../http.js';
import type { ListResponse } from '../types.js';

export class OrdersResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List orders for a store.
   * Uses Backend 2. GET /stores/{storeId}/orders
   * NOTE: actual endpoints TBD pending discovery — using these URLs as placeholders.
   */
  async list(storeId: string, params?: PaginationParams): Promise<ListResponse<Order>> {
    const query = buildQuery(params);
    return this.http.get<ListResponse<Order>>(`/stores/${storeId}/orders${query}`);
  }

  /**
   * Retrieve a single order by ID.
   * Uses Backend 2. GET /stores/{storeId}/orders/{orderId}
   */
  async get(storeId: string, orderId: string): Promise<Order> {
    return this.http.get<Order>(`/stores/${storeId}/orders/${orderId}`);
  }
}

function buildQuery(params?: PaginationParams): string {
  if (params === undefined) return '';
  const parts: string[] = [];
  if (params.page !== undefined) parts.push(`page=${params.page}`);
  if (params.per_page !== undefined) parts.push(`per_page=${params.per_page}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

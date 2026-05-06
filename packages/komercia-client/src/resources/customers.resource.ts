import type { Customer, PaginationParams } from '@komercia-mcp/shared';
import type { HttpClient } from '../http.js';
import type { ListResponse } from '../types.js';

export class CustomersResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List customers for a store.
   * Uses Backend 2. GET /stores/{storeId}/customers
   * NOTE: actual endpoints TBD pending discovery — using these URLs as placeholders.
   */
  async list(storeId: string, params?: PaginationParams): Promise<ListResponse<Customer>> {
    const query = buildQuery(params);
    return this.http.get<ListResponse<Customer>>(`/stores/${storeId}/customers${query}`);
  }

  /**
   * Retrieve a single customer by ID.
   * Uses Backend 2. GET /stores/{storeId}/customers/{customerId}
   */
  async get(storeId: string, customerId: string): Promise<Customer> {
    return this.http.get<Customer>(`/stores/${storeId}/customers/${customerId}`);
  }
}

function buildQuery(params?: PaginationParams): string {
  if (params === undefined) return '';
  const parts: string[] = [];
  if (params.page !== undefined) parts.push(`page=${params.page}`);
  if (params.per_page !== undefined) parts.push(`per_page=${params.per_page}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

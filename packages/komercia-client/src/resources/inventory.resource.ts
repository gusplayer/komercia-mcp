import type { InventoryMovement, PaginationParams } from '@komercia-mcp/shared';
import type { HttpClient } from '../http.js';
import type { ListResponse } from '../types.js';

export class InventoryResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List inventory movements for a store.
   * Uses Backend 3. GET /stores/{storeId}/inventory
   * NOTE: actual endpoints TBD pending discovery — using these URLs as placeholders.
   */
  async list(storeId: string, params?: PaginationParams): Promise<ListResponse<InventoryMovement>> {
    const query = buildQuery(params);
    return this.http.get<ListResponse<InventoryMovement>>(`/stores/${storeId}/inventory${query}`);
  }

  /**
   * Retrieve a single inventory movement by ID.
   * Uses Backend 3. GET /stores/{storeId}/inventory/{movementId}
   */
  async get(storeId: string, movementId: string): Promise<InventoryMovement> {
    return this.http.get<InventoryMovement>(`/stores/${storeId}/inventory/${movementId}`);
  }
}

function buildQuery(params?: PaginationParams): string {
  if (params === undefined) return '';
  const parts: string[] = [];
  if (params.page !== undefined) parts.push(`page=${params.page}`);
  if (params.per_page !== undefined) parts.push(`per_page=${params.per_page}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

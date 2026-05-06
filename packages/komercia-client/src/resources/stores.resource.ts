import type { Store } from '@komercia-mcp/shared';
import type { HttpClient } from '../http.js';

export class StoresResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieve a single store by ID.
   * Uses Backend 1. GET /stores/{storeId}
   * Throws KomerciaNotFoundError if the store does not exist.
   */
  async get(storeId: string): Promise<Store> {
    return this.http.get<Store>(`/stores/${storeId}`);
  }
}

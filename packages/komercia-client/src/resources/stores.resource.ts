import type { Store } from '@komercia-mcp/shared';
import type { HttpClient } from '../http.js';

export class StoresResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly nodePublicKey: string,
  ) {}

  /**
   * Retrieve store info by ID.
   * NodeJS backend. GET /api/v1/stores/info/{storeId}
   * Public endpoint — uses API key header instead of Bearer token.
   */
  async get(storeId: string): Promise<Store> {
    // TODO: verify response shape after discovery
    return this.nodeHttp.get<Store>(`/api/v1/stores/info/${storeId}`, {
      apiKeyHeader: this.nodePublicKey,
    });
  }
}

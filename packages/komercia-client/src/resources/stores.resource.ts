import type { HttpClient } from '../http.js';
import type { Store } from '@komercia-mcp/shared';

// Actual shape returned by GET /api/v1/stores/info/{storeId}.
// The endpoint wraps the store object in {success, message, data}.
interface ApiStoreInfoResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    nombre: string;
    subdominio: string;
    estado: number;           // 1 = active
    fechaExpiracion: string;  // "YYYY-MM-DD" plan expiry
    tiendasInfo: {
      dominio: string | null;
      emailTienda: string;
      moneda: string;
      telefono: string | null;
    } | null;
  } | null;
}

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
    const response = await this.nodeHttp.get<ApiStoreInfoResponse>(
      `/api/v1/stores/info/${storeId}`,
      { apiKeyHeader: this.nodePublicKey },
    );

    const data = response.data;
    if (!data) throw new Error(`Store ${storeId} not found`);

    const domain = data.tiendasInfo?.dominio ?? `${data.subdominio}.komercia.co`;

    return {
      id: String(data.id),
      name: data.nombre,
      domain,
      plan: data.fechaExpiracion
        ? `Active (expires ${data.fechaExpiracion})`
        : 'Unknown',
      email: data.tiendasInfo?.emailTienda ?? '',
      created_at: `${data.fechaExpiracion}T00:00:00.000Z`,
      active: data.estado === 1,
    };
  }
}

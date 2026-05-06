import type { HttpClient } from '../http.js';

// TODO: verify response shape after discovery
export interface KomerciaPaymentMethod {
  id: number | string;
  nombre?: string;
  activo?: boolean;
  [key: string]: unknown;
}

export class PaymentMethodsResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly laravelToken: string,
  ) {}

  /**
   * List payment methods configured for the merchant's account.
   * Laravel backend. GET /api/admin/medios-pago
   * Auth: Bearer token
   * TODO: verify response shape after discovery
   */
  async list(): Promise<KomerciaPaymentMethod[]> {
    // TODO: verify response shape after discovery
    const response = await this.laravelHttp.get<
      { data: KomerciaPaymentMethod[] } | KomerciaPaymentMethod[]
    >('/api/admin/medios-pago', { auth: `Bearer ${this.laravelToken}` });

    if (Array.isArray(response)) {
      return response;
    }
    if ('data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * List public payment methods available for a store (no auth required).
   * NodeJS backend. GET /api/v1/stores/payment-methods/public/{storeId}
   * Auth: none
   * TODO: verify response shape after discovery
   */
  async listPublic(storeId: string): Promise<KomerciaPaymentMethod[]> {
    // TODO: verify response shape after discovery
    const response = await this.nodeHttp.get<
      { data: KomerciaPaymentMethod[] } | KomerciaPaymentMethod[]
    >(`/api/v1/stores/payment-methods/public/${storeId}`);

    if (Array.isArray(response)) {
      return response;
    }
    if ('data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }
}

import type { HttpClient } from '../http.js';

// TODO: verify response shape after discovery
export interface KomerciaCustomer {
  id: number | string;
  nombre?: string;
  email?: string;
  tipo_identificacion?: string;
  identificacion?: string;
  ciudad?: string;
  telefono?: string;
  cantidad_compras?: number;
  [key: string]: unknown;
}

// TODO: verify response shape after discovery
interface LaravelCustomersResponse {
  data: KomerciaCustomer[];
  total: number;
  current_page: number;
  per_page: number;
}

export interface CustomersPage {
  customers: KomerciaCustomer[];
  total: number;
  page: number;
  per_page: number;
}

export interface CustomerFilterParams {
  type?: string; // e.g. "customer_name"
  value?: string;
  page?: number;
}

export class CustomersResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly laravelToken: string,
    private readonly storeId: string,
  ) {}

  /**
   * List all customers.
   * Laravel backend. GET /api/admin/clientes/listado
   */
  async list(): Promise<CustomersPage> {
    // TODO: verify response shape after discovery
    const response = await this.laravelHttp.get<LaravelCustomersResponse>(
      '/api/admin/clientes/listado',
      { auth: `Bearer ${this.laravelToken}` },
    );

    return {
      customers: response.data,
      total: response.total,
      page: response.current_page,
      per_page: response.per_page,
    };
  }

  /**
   * Filter customers by a given field.
   * Laravel backend. GET /api/admin/clientes/filters
   */
  async filter(params: CustomerFilterParams): Promise<CustomersPage> {
    const parts: string[] = [];
    if (params.type !== undefined) parts.push(`type=${encodeURIComponent(params.type)}`);
    if (params.value !== undefined) parts.push(`value=${encodeURIComponent(params.value)}`);
    if (params.page !== undefined) parts.push(`page=${params.page}`);
    const query = parts.length > 0 ? `?${parts.join('&')}` : '';

    // TODO: verify response shape after discovery
    const response = await this.laravelHttp.get<LaravelCustomersResponse>(
      `/api/admin/clientes/filters${query}`,
      { auth: `Bearer ${this.laravelToken}` },
    );

    return {
      customers: response.data,
      total: response.total,
      page: response.current_page,
      per_page: response.per_page,
    };
  }

  /**
   * Export customers as CSV text.
   * NodeJS backend. GET /api/v1/panel/export-clients/{storeId}
   * Returns CSV text with columns: nombre, tipo_identificacion, identificacion, email, ciudad, telefono, cantidad_compras, etc.
   */
  async exportCsv(currency = 'COP'): Promise<string> {
    return this.nodeHttp.getText(
      `/api/v1/panel/export-clients/${this.storeId}?currency=${encodeURIComponent(currency)}`,
      { auth: `Bearer ${this.nodeToken}` },
    );
  }

  /**
   * Export customers as Excel binary.
   * Laravel backend. GET /api/admin/clientes/export
   * Returns Excel bytes.
   */
  async exportExcel(): Promise<ArrayBuffer> {
    return this.laravelHttp.getRaw('/api/admin/clientes/export', {
      auth: this.laravelToken,
    });
  }
}

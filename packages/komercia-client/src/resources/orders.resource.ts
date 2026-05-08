import type { HttpClient } from '../http.js';

// TODO: verify response shape after discovery
export interface KomerciaOrder {
  id: number | string;
  estado?: string;
  total?: number;
  [key: string]: unknown;
}

// TODO: verify response shape after discovery
interface LaravelOrdersResponse {
  data: KomerciaOrder[];
  total: number;
  current_page: number;
  per_page: number;
}

export interface OrdersPage {
  orders: KomerciaOrder[];
  total: number;
  page: number;
  per_page: number;
}

export interface OrderPaginationParams {
  page?: number;
  per_page?: number;
}

export interface OrderDateFilterParams {
  start: string; // ISO date string e.g. "2024-01-01"
  end: string;   // ISO date string e.g. "2024-12-31"
  page?: number;
}

export class OrdersResource {
  constructor(
    private readonly nodeHttp: HttpClient,
    private readonly laravelHttp: HttpClient,
    private readonly nodeToken: string,
    private readonly laravelToken: string,
    private readonly storeId: string,
  ) {}

  /**
   * List paginated orders.
   * Laravel backend. GET /api/admin/ventas/ordenes/paginacion
   */
  async list(params?: OrderPaginationParams): Promise<OrdersPage> {
    const query = buildPaginationQuery(params);
    // TODO: verify response shape after discovery
    const response = await this.laravelHttp.get<LaravelOrdersResponse>(
      `/api/admin/ventas/ordenes/paginacion${query}`,
      { auth: `Bearer ${this.laravelToken}` },
    );

    return {
      orders: response.data,
      total: response.total,
      page: response.current_page,
      per_page: response.per_page,
    };
  }

  /**
   * Filter orders by date range.
   * Laravel backend. GET /api/admin/ventas/ordenes/filters
   */
  async filterByDate(params: OrderDateFilterParams): Promise<OrdersPage> {
    const parts: string[] = [`type=date`, `start=${encodeURIComponent(params.start)}`, `end=${encodeURIComponent(params.end)}`];
    if (params.page !== undefined) parts.push(`page=${String(params.page)}`);
    const query = `?${parts.join('&')}`;

    // TODO: verify response shape after discovery
    const response = await this.laravelHttp.get<LaravelOrdersResponse>(
      `/api/admin/ventas/ordenes/filters${query}`,
      { auth: `Bearer ${this.laravelToken}` },
    );

    return {
      orders: response.data,
      total: response.total,
      page: response.current_page,
      per_page: response.per_page,
    };
  }

  /**
   * Export orders as CSV text.
   * NodeJS backend. GET /api/v1/panel/export-sales/{storeId}
   * Returns CSV text.
   */
  async exportCsv(currency = 'COP'): Promise<string> {
    return this.nodeHttp.getText(
      `/api/v1/panel/export-sales/${this.storeId}?currency=${encodeURIComponent(currency)}`,
      { auth: `Bearer ${this.nodeToken}` },
    );
  }

  /**
   * Export orders as Excel binary.
   * Laravel backend. GET /api/admin/ventas/exportar/{storeId}
   * Returns Excel bytes.
   */
  async exportExcel(): Promise<ArrayBuffer> {
    return this.laravelHttp.getRaw(`/api/admin/ventas/exportar/${this.storeId}`, {
      auth: this.laravelToken,
    });
  }
}

function buildPaginationQuery(params?: OrderPaginationParams): string {
  if (params === undefined) return '';
  const parts: string[] = [];
  if (params.page !== undefined) parts.push(`page=${String(params.page)}`);
  if (params.per_page !== undefined) parts.push(`per_page=${String(params.per_page)}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

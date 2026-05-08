import { HttpClient } from './http.js';
import { AuthResource } from './resources/auth.resource.js';
import { CategoriesResource } from './resources/categories.resource.js';
import { CustomersResource } from './resources/customers.resource.js';
import { InventoryResource } from './resources/inventory.resource.js';
import { OrdersResource } from './resources/orders.resource.js';
import { PaymentMethodsResource } from './resources/payment-methods.resource.js';
import { ProductsResource } from './resources/products.resource.js';
import { StoresResource } from './resources/stores.resource.js';
import { ThemesResource } from './resources/themes.resource.js';

import type { KomerciaClientConfig } from './types.js';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;

export interface AuthOnlyConfig {
  nodeUrl: string;
  laravelUrl: string;
  laravelClientId: string;
  laravelClientSecret: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class KomerciaClient {
  readonly stores: StoresResource;
  readonly products: ProductsResource;
  readonly orders: OrdersResource;
  readonly customers: CustomersResource;
  readonly categories: CategoriesResource;
  readonly inventory: InventoryResource;
  readonly themes: ThemesResource;
  readonly paymentMethods: PaymentMethodsResource;

  /**
   * Static factory for the web app login flow.
   * Only exposes auth — no merchant tokens required at this stage.
   */
  static createForAuth(config: AuthOnlyConfig): { auth: AuthResource } {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const httpConfig = { timeoutMs, maxRetries };

    const nodeHttp = new HttpClient(config.nodeUrl, httpConfig);
    const laravelHttp = new HttpClient(config.laravelUrl, httpConfig);

    return {
      auth: new AuthResource(nodeHttp, laravelHttp, {
        laravelClientId: config.laravelClientId,
        laravelClientSecret: config.laravelClientSecret,
      }),
    };
  }

  constructor(config: KomerciaClientConfig) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

    const httpConfig = { timeoutMs, maxRetries };

    // One HttpClient per backend
    const nodeHttp = new HttpClient(config.nodeUrl, httpConfig);
    const laravelHttp = new HttpClient(config.laravelUrl, httpConfig);

    const storeId = config.storeId ?? '';

    this.stores = new StoresResource(nodeHttp, config.nodePublicKey);

    this.products = new ProductsResource(
      nodeHttp,
      laravelHttp,
      config.nodeToken,
      config.laravelToken,
      storeId,
    );

    this.orders = new OrdersResource(
      nodeHttp,
      laravelHttp,
      config.nodeToken,
      config.laravelToken,
      storeId,
    );

    this.customers = new CustomersResource(
      nodeHttp,
      laravelHttp,
      config.nodeToken,
      config.laravelToken,
      storeId,
    );

    this.categories = new CategoriesResource(
      nodeHttp,
      laravelHttp,
      config.nodeToken,
      config.laravelToken,
      storeId,
    );

    this.inventory = new InventoryResource(
      nodeHttp,
      laravelHttp,
      config.nodeToken,
      config.laravelToken,
      storeId,
    );

    this.themes = new ThemesResource(nodeHttp, config.nodeToken, config.nodePublicKey);

    this.paymentMethods = new PaymentMethodsResource(
      nodeHttp,
      laravelHttp,
      config.nodeToken,
      config.laravelToken,
    );
  }
}

import { HttpClient } from './http.js';
import { StoresResource } from './resources/stores.resource.js';
import { ProductsResource } from './resources/products.resource.js';
import { OrdersResource } from './resources/orders.resource.js';
import { CustomersResource } from './resources/customers.resource.js';
import { CategoriesResource } from './resources/categories.resource.js';
import { InventoryResource } from './resources/inventory.resource.js';
import { ThemesResource } from './resources/themes.resource.js';
import { PaymentMethodsResource } from './resources/payment-methods.resource.js';
import { AuthResource } from './resources/auth.resource.js';
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
   * Static factory for the web app onboarding flow (magic link redemption).
   * Only exposes auth — no merchant tokens required yet at this stage.
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

    // storeId is carried on the per-merchant session — resources receive it so they
    // can embed it in paths without callers having to pass it on every method call.
    // For resources that don't need a storeId in the path, we pass an empty string.
    // Note: storeId must be provided by the caller via config if needed per resource.
    // Resources that require storeId accept it in constructor (from config.nodeToken context).
    // We derive storeId from the token context at the MCP layer; here we use a placeholder
    // approach — the storeId is expected to be passed via a separate config field if needed.
    // For now, resources that need storeId receive an empty string and the MCP layer
    // should instantiate KomerciaClient with an extended config or pass storeId per call.
    //
    // DESIGN NOTE: storeId is not in KomerciaClientConfig because it comes from the JWT,
    // not from env vars. The MCP auth guard should extract it and pass it here.
    // This will be resolved in a future refactor once the MCP layer is wired up.
    const storeId = (config as KomerciaClientConfig & { storeId?: string }).storeId ?? '';

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

import { HttpClient } from './http.js';
import { StoresResource } from './resources/stores.resource.js';
import { ProductsResource } from './resources/products.resource.js';
import { OrdersResource } from './resources/orders.resource.js';
import { CustomersResource } from './resources/customers.resource.js';
import { CategoriesResource } from './resources/categories.resource.js';
import { InventoryResource } from './resources/inventory.resource.js';
import type { KomerciaClientConfig } from './types.js';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;

export class KomerciaClient {
  readonly stores: StoresResource;
  readonly products: ProductsResource;
  readonly orders: OrdersResource;
  readonly customers: CustomersResource;
  readonly categories: CategoriesResource;
  readonly inventory: InventoryResource;

  constructor(config: KomerciaClientConfig) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

    const httpConfig = { timeoutMs, maxRetries };

    // Create one HttpClient per backend — resources are assigned to the appropriate backend
    const backend1 = new HttpClient(config.backend1Url, httpConfig);
    const backend2 = new HttpClient(config.backend2Url, httpConfig);
    const backend3 = new HttpClient(config.backend3Url, httpConfig);

    // Backend 1: stores, products, categories
    this.stores = new StoresResource(backend1);
    this.products = new ProductsResource(backend1);
    this.categories = new CategoriesResource(backend1);

    // Backend 2: orders, customers
    this.orders = new OrdersResource(backend2);
    this.customers = new CustomersResource(backend2);

    // Backend 3: inventory
    this.inventory = new InventoryResource(backend3);
  }
}

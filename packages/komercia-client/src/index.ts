export { KomerciaClient } from './client.js';
export type { AuthOnlyConfig } from './client.js';
export { HttpClient } from './http.js';
export type { FetchFn } from './http.js';
export {
  KomerciaApiError,
  KomerciaNotFoundError,
  KomerciaAuthError,
  KomerciaRateLimitError,
  KomerciaTimeoutError,
} from './errors.js';
export type { KomerciaClientConfig, KomerciaBackendConfig, ListResponse } from './types.js';

// Resources
export { StoresResource } from './resources/stores.resource.js';
export { ProductsResource } from './resources/products.resource.js';
export type { ProductFilterParams, KomerciaProduct, ProductsPage } from './resources/products.resource.js';
export { OrdersResource } from './resources/orders.resource.js';
export type {
  KomerciaOrder,
  OrdersPage,
  OrderPaginationParams,
  OrderDateFilterParams,
} from './resources/orders.resource.js';
export { CustomersResource } from './resources/customers.resource.js';
export type {
  KomerciaCustomer,
  CustomersPage,
  CustomerFilterParams,
} from './resources/customers.resource.js';
export { CategoriesResource } from './resources/categories.resource.js';
export type { KomerciaCategory } from './resources/categories.resource.js';
export { InventoryResource } from './resources/inventory.resource.js';
export type {
  KomerciaPromotion,
  KomerciaSupplier,
  StockLevelsPage,
} from './resources/inventory.resource.js';
export { ThemesResource } from './resources/themes.resource.js';
export type {
  KomerciaTemplateSettings,
  KomerciaWebsite,
} from './resources/themes.resource.js';
export { PaymentMethodsResource } from './resources/payment-methods.resource.js';
export type { KomerciaPaymentMethod } from './resources/payment-methods.resource.js';
export { AuthResource } from './resources/auth.resource.js';
export type {
  NodeLoginResponse,
  LaravelTokenResponse,
  AuthResourceConfig,
} from './resources/auth.resource.js';

export { toProduct, toOrder, toCustomer, toCategory } from './adapters.js';

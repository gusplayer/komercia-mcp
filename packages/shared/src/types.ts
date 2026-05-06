import type { Scope } from './constants.js';

export type { Scope };

export interface MerchantJWTPayload {
  sub: string;
  store_id: string;
  email: string;
  scope: Scope;
  jti: string;
  iat: number;
  exp: number;
}

export interface Store {
  id: string;
  name: string;
  domain: string;
  plan: string;
  email: string;
  created_at: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  category_id: string | null;
  images: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  customer_id: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  addresses: Address[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  active: boolean;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string | null;
  created_at: string;
}

export type ExportFormat = 'csv' | 'json' | 'shopify' | 'woocommerce';

export interface DateRange {
  from: string;
  to: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

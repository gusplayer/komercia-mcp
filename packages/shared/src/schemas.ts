import { z } from 'zod';

import { SCOPES } from './constants.js';

export const StoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  plan: z.string(),
  email: z.string().email(),
  created_at: z.string().datetime(),
  active: z.boolean(),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  price: z.number(),
  compare_at_price: z.number().nullable(),
  stock: z.number().int(),
  category_id: z.string().nullable(),
  images: z.array(z.string()),
  active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const OrderItemSchema = z.object({
  product_id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  quantity: z.number().int().positive(),
  unit_price: z.number(),
});

export const OrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  total: z.number(),
  currency: z.string(),
  customer_id: z.string().nullable(),
  items: z.array(OrderItemSchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postal_code: z.string(),
});

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  addresses: z.array(AddressSchema),
  created_at: z.string().datetime(),
});

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parent_id: z.string().nullable(),
  active: z.boolean(),
});

export const InventoryMovementSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int(),
  reason: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const DateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().optional(),
});

export const MerchantJWTPayloadSchema = z.object({
  sub: z.string(),
  store_id: z.string(),
  email: z.string().email(),
  scope: z.enum(SCOPES),
  jti: z.string().uuid(),
  iat: z.number().int(),
  exp: z.number().int(),
});

export type Store = z.infer<typeof StoreSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type MerchantJWTPayload = z.infer<typeof MerchantJWTPayloadSchema>;

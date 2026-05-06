import { describe, it, expect } from 'vitest';
import {
  StoreSchema,
  ProductSchema,
  OrderSchema,
  CustomerSchema,
  CategorySchema,
  InventoryMovementSchema,
  DateRangeSchema,
  PaginationParamsSchema,
  MerchantJWTPayloadSchema,
} from '../schemas.js';

describe('StoreSchema', () => {
  const valid = {
    id: 'store-1',
    name: 'My Store',
    domain: 'mystore.com',
    plan: 'pro',
    email: 'owner@mystore.com',
    created_at: '2024-01-01T00:00:00Z',
    active: true,
  };

  it('accepts a valid store object', () => {
    expect(StoreSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { name: _name, ...withoutName } = valid;
    expect(StoreSchema.safeParse(withoutName).success).toBe(false);
  });
});

describe('ProductSchema', () => {
  const valid = {
    id: 'prod-1',
    name: 'Widget',
    sku: 'WGT-001',
    price: 29.99,
    compare_at_price: null,
    stock: 100,
    category_id: null,
    images: ['https://example.com/img.jpg'],
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
  };

  it('accepts a valid product object', () => {
    expect(ProductSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { price: _price, ...withoutPrice } = valid;
    expect(ProductSchema.safeParse(withoutPrice).success).toBe(false);
  });
});

describe('OrderSchema', () => {
  const valid = {
    id: 'order-1',
    status: 'completed',
    total: 59.98,
    currency: 'COP',
    customer_id: 'cust-1',
    items: [
      {
        product_id: 'prod-1',
        name: 'Widget',
        sku: 'WGT-001',
        quantity: 2,
        unit_price: 29.99,
      },
    ],
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
  };

  it('accepts a valid order object', () => {
    expect(OrderSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { status: _status, ...withoutStatus } = valid;
    expect(OrderSchema.safeParse(withoutStatus).success).toBe(false);
  });
});

describe('CustomerSchema', () => {
  const valid = {
    id: 'cust-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    addresses: [
      {
        line1: '123 Main St',
        line2: null,
        city: 'Bogotá',
        state: 'Cundinamarca',
        country: 'CO',
        postal_code: '110111',
      },
    ],
    created_at: '2024-01-15T00:00:00Z',
  };

  it('accepts a valid customer object', () => {
    expect(CustomerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { email: _email, ...withoutEmail } = valid;
    expect(CustomerSchema.safeParse(withoutEmail).success).toBe(false);
  });
});

describe('CategorySchema', () => {
  const valid = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    parent_id: null,
    active: true,
  };

  it('accepts a valid category object', () => {
    expect(CategorySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { slug: _slug, ...withoutSlug } = valid;
    expect(CategorySchema.safeParse(withoutSlug).success).toBe(false);
  });
});

describe('InventoryMovementSchema', () => {
  const valid = {
    id: 'mov-1',
    product_id: 'prod-1',
    type: 'in' as const,
    quantity: 50,
    reason: 'Restocked',
    created_at: '2024-04-01T00:00:00Z',
  };

  it('accepts a valid inventory movement', () => {
    expect(InventoryMovementSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid type value', () => {
    expect(InventoryMovementSchema.safeParse({ ...valid, type: 'transfer' }).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { product_id: _product_id, ...withoutProductId } = valid;
    expect(InventoryMovementSchema.safeParse(withoutProductId).success).toBe(false);
  });
});

describe('DateRangeSchema', () => {
  it('accepts valid ISO 8601 datetime strings', () => {
    expect(
      DateRangeSchema.safeParse({ from: '2024-01-01T00:00:00Z', to: '2024-12-31T23:59:59Z' }).success,
    ).toBe(true);
  });

  it('rejects non-ISO-8601 date strings', () => {
    expect(DateRangeSchema.safeParse({ from: '2024-01-01', to: '2024-12-31' }).success).toBe(false);
  });

  it('rejects free-form strings', () => {
    expect(DateRangeSchema.safeParse({ from: 'yesterday', to: 'today' }).success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(DateRangeSchema.safeParse({ from: '2024-01-01T00:00:00Z' }).success).toBe(false);
  });
});

describe('PaginationParamsSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(PaginationParamsSchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid pagination params', () => {
    expect(PaginationParamsSchema.safeParse({ page: 2, per_page: 25 }).success).toBe(true);
  });

  it('rejects non-integer page values', () => {
    expect(PaginationParamsSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });
});

describe('MerchantJWTPayloadSchema', () => {
  const valid = {
    sub: 'merchant-1',
    store_id: 'store-1',
    email: 'merchant@example.com',
    scope: 'read' as const,
    jti: '550e8400-e29b-41d4-a716-446655440000',
    iat: 1700000000,
    exp: 1715552000,
  };

  it('accepts a valid JWT payload', () => {
    expect(MerchantJWTPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid scope', () => {
    expect(MerchantJWTPayloadSchema.safeParse({ ...valid, scope: 'write' }).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { jti: _jti, ...withoutJti } = valid;
    expect(MerchantJWTPayloadSchema.safeParse(withoutJti).success).toBe(false);
  });
});

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { KomerciaClient } from '../client.js';
import type { Store, Product } from '@komercia-mcp/shared';
import type { ListResponse } from '../types.js';

const BACKEND_1 = 'http://backend1.test';
const BACKEND_2 = 'http://backend2.test';
const BACKEND_3 = 'http://backend3.test';

const MOCK_STORE: Store = {
  id: 'store-abc',
  name: 'Test Store',
  domain: 'test-store.komercia.co',
  plan: 'pro',
  email: 'owner@test-store.com',
  created_at: '2024-01-01T00:00:00Z',
  active: true,
};

const MOCK_PRODUCT: Product = {
  id: 'prod-001',
  name: 'Widget A',
  sku: 'WGT-A',
  price: 19.99,
  compare_at_price: null,
  stock: 50,
  category_id: 'cat-001',
  images: ['https://example.com/img.jpg'],
  active: true,
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-02-01T00:00:00Z',
};

const MOCK_PRODUCTS_LIST: ListResponse<Product> = {
  data: [MOCK_PRODUCT],
  total: 1,
  page: 1,
  per_page: 20,
};

const server = setupServer(
  http.get(`${BACKEND_1}/stores/:storeId`, ({ params }) => {
    if (params['storeId'] === 'store-abc') {
      return HttpResponse.json(MOCK_STORE);
    }
    return new HttpResponse(null, { status: 404 });
  }),
  http.get(`${BACKEND_1}/stores/:storeId/products`, () => {
    return HttpResponse.json(MOCK_PRODUCTS_LIST);
  }),
  http.get(`${BACKEND_1}/stores/:storeId/products/:productId`, ({ params }) => {
    if (params['productId'] === 'prod-001') {
      return HttpResponse.json(MOCK_PRODUCT);
    }
    return new HttpResponse(null, { status: 404 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient(): KomerciaClient {
  return new KomerciaClient({
    backend1Url: BACKEND_1,
    backend2Url: BACKEND_2,
    backend3Url: BACKEND_3,
    timeoutMs: 5_000,
    maxRetries: 1,
  });
}

describe('KomerciaClient', () => {
  describe('stores.get()', () => {
    it('returns a typed Store object', async () => {
      const client = makeClient();
      const store = await client.stores.get('store-abc');

      expect(store.id).toBe('store-abc');
      expect(store.name).toBe('Test Store');
      expect(store.active).toBe(true);
    });

    it('throws KomerciaNotFoundError for unknown store ID', async () => {
      const { KomerciaNotFoundError } = await import('../errors.js');
      const client = makeClient();

      await expect(client.stores.get('does-not-exist')).rejects.toThrow(KomerciaNotFoundError);
    });
  });

  describe('products.list()', () => {
    it('returns a typed ListResponse<Product>', async () => {
      const client = makeClient();
      const result = await client.products.list('store-abc');

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('prod-001');
    });

    it('passes pagination params as query string', async () => {
      let capturedUrl: string | null = null;

      server.use(
        http.get(`${BACKEND_1}/stores/store-abc/products`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(MOCK_PRODUCTS_LIST);
        }),
      );

      const client = makeClient();
      await client.products.list('store-abc', { page: 2, per_page: 10 });

      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('per_page=10');
    });
  });

  describe('products.get()', () => {
    it('returns a typed Product object', async () => {
      const client = makeClient();
      const product = await client.products.get('store-abc', 'prod-001');

      expect(product.id).toBe('prod-001');
      expect(product.name).toBe('Widget A');
      expect(product.price).toBe(19.99);
    });
  });
});

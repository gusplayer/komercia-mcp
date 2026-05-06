import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { KomerciaClient } from '../client.js';

const NODE_URL = 'http://node.test';
const LARAVEL_URL = 'http://laravel.test';
const EDITOR_URL = 'http://editor.test';
const NODE_TOKEN = 'node-bearer-token';
const LARAVEL_TOKEN = 'laravel-access-token';
const NODE_PUBLIC_KEY = 'test-public-key';
const STORE_ID = 'store-123';

// TODO: verify response shape after discovery
const MOCK_STORE = {
  id: STORE_ID,
  name: 'Test Store',
  domain: 'test-store.komercia.co',
};

// TODO: verify response shape after discovery
const MOCK_PRODUCTS_RESPONSE = {
  data: {
    products: [
      {
        id: 1,
        nombre: 'Widget A',
        precio: 19990,
        stock: 50,
      },
    ],
    total: 1,
  },
};

const server = setupServer(
  // stores.get — public endpoint with API key header
  http.get(`${NODE_URL}/api/v1/stores/info/:storeId`, ({ params }) => {
    if (params['storeId'] === STORE_ID) {
      return HttpResponse.json(MOCK_STORE);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // products.list — NodeJS panel endpoint
  http.get(`${NODE_URL}/api/v1/panel/filter-products/:storeId`, () => {
    return HttpResponse.json(MOCK_PRODUCTS_RESPONSE);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient(): KomerciaClient {
  return new KomerciaClient({
    nodeUrl: NODE_URL,
    laravelUrl: LARAVEL_URL,
    editorUrl: EDITOR_URL,
    nodeToken: NODE_TOKEN,
    laravelToken: LARAVEL_TOKEN,
    nodePublicKey: NODE_PUBLIC_KEY,
    timeoutMs: 5_000,
    maxRetries: 1,
    // storeId injected for resources that embed it in paths
    storeId: STORE_ID,
  } as Parameters<typeof KomerciaClient.prototype.constructor>[0] & { storeId: string });
}

describe('KomerciaClient', () => {
  describe('stores.get()', () => {
    it('returns a store object using the API key header', async () => {
      const client = makeClient();
      const store = await client.stores.get(STORE_ID);

      expect(store).toMatchObject({ id: STORE_ID, name: 'Test Store' });
    });

    it('throws KomerciaNotFoundError for unknown store ID', async () => {
      const { KomerciaNotFoundError } = await import('../errors.js');
      const client = makeClient();

      await expect(client.stores.get('does-not-exist')).rejects.toThrow(KomerciaNotFoundError);
    });
  });

  describe('products.list()', () => {
    it('returns a ProductsPage with products array', async () => {
      const client = makeClient();
      const result = await client.products.list();

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.products).toHaveLength(1);
      expect(result.products[0]?.id).toBe(1);
    });

    it('passes pagination params as query string', async () => {
      let capturedUrl: string | null = null;

      server.use(
        http.get(`${NODE_URL}/api/v1/panel/filter-products/${STORE_ID}`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(MOCK_PRODUCTS_RESPONSE);
        }),
      );

      const client = makeClient();
      await client.products.list({ page: 2, limit: 10 });

      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('limit=10');
    });
  });

  describe('KomerciaClient.createForAuth()', () => {
    it('returns an auth resource without requiring merchant tokens', async () => {
      let capturedBody: URLSearchParams | null = null;

      server.use(
        http.post(`${LARAVEL_URL}/oauth/token`, async ({ request }) => {
          const text = await request.text();
          capturedBody = new URLSearchParams(text);
          return HttpResponse.json({
            access_token: 'at',
            refresh_token: 'rt',
            token_type: 'Bearer',
            expires_in: 3600,
          });
        }),
      );

      const { auth } = KomerciaClient.createForAuth({
        nodeUrl: NODE_URL,
        laravelUrl: LARAVEL_URL,
        laravelClientId: 'client-id',
        laravelClientSecret: 'client-secret',
        timeoutMs: 5_000,
        maxRetries: 1,
      });

      const tokens = await auth.loginLaravel('owner@example.com', 'pass123');

      expect(tokens.access_token).toBe('at');
      expect(tokens.refresh_token).toBe('rt');
      expect(capturedBody?.get('grant_type')).toBe('password');
      expect(capturedBody?.get('username')).toBe('owner@example.com');
    });
  });
});

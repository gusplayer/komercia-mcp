import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { HttpClient } from '../http.js';
import { KomerciaTimeoutError, KomerciaNotFoundError, KomerciaApiError } from '../errors.js';

const BASE_URL = 'http://test-backend.local';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HttpClient', () => {
  describe('retry behaviour', () => {
    it('retries on 503 up to maxRetries times', async () => {
      let callCount = 0;

      server.use(
        http.get(`${BASE_URL}/test`, () => {
          callCount++;
          if (callCount <= 2) {
            return new HttpResponse(null, { status: 503 });
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      const client = new HttpClient(BASE_URL, { timeoutMs: 5_000, maxRetries: 3 });
      const result = await client.get<{ ok: boolean }>('/test');

      expect(result.ok).toBe(true);
      // First attempt + 2 retries = 3 calls total
      expect(callCount).toBe(3);
    });

    it('does not retry on 404', async () => {
      let callCount = 0;

      server.use(
        http.get(`${BASE_URL}/missing`, () => {
          callCount++;
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const client = new HttpClient(BASE_URL, { timeoutMs: 5_000, maxRetries: 3 });

      await expect(client.get('/missing')).rejects.toThrow(KomerciaNotFoundError);
      expect(callCount).toBe(1);
    });

    it('throws KomerciaApiError with correct status on 4xx', async () => {
      server.use(
        http.get(`${BASE_URL}/forbidden`, () => new HttpResponse(null, { status: 400 })),
      );

      const client = new HttpClient(BASE_URL, { timeoutMs: 5_000, maxRetries: 3 });

      const err = await client.get('/forbidden').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(KomerciaApiError);
      expect((err as KomerciaApiError).status).toBe(400);
    });

    it('eventually throws after exhausting retries on persistent 503', async () => {
      server.use(
        http.get(`${BASE_URL}/broken`, () => new HttpResponse(null, { status: 503 })),
      );

      const client = new HttpClient(BASE_URL, { timeoutMs: 5_000, maxRetries: 2 });

      await expect(client.get('/broken')).rejects.toThrow();
    });
  });

  describe('timeout behaviour', () => {
    it('throws KomerciaTimeoutError when the request exceeds timeoutMs', async () => {
      server.use(
        http.get(`${BASE_URL}/slow`, async () => {
          // Delay longer than the client timeout
          await new Promise((resolve) => setTimeout(resolve, 300));
          return HttpResponse.json({ ok: true });
        }),
      );

      // Very short timeout so the test is fast
      const client = new HttpClient(BASE_URL, { timeoutMs: 50, maxRetries: 0 });

      await expect(client.get('/slow')).rejects.toThrow(KomerciaTimeoutError);
    });
  });

  describe('successful requests', () => {
    it('GET returns parsed JSON', async () => {
      server.use(
        http.get(`${BASE_URL}/data`, () => HttpResponse.json({ id: '1', name: 'Test' })),
      );

      const client = new HttpClient(BASE_URL, { timeoutMs: 5_000, maxRetries: 3 });
      const result = await client.get<{ id: string; name: string }>('/data');

      expect(result.id).toBe('1');
      expect(result.name).toBe('Test');
    });

    it('POST sends body and returns parsed JSON', async () => {
      server.use(
        http.post(`${BASE_URL}/items`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ received: body });
        }),
      );

      const client = new HttpClient(BASE_URL, { timeoutMs: 5_000, maxRetries: 3 });
      const result = await client.post<{ received: unknown }>('/items', { foo: 'bar' });

      expect(result.received).toEqual({ foo: 'bar' });
    });

    it('sends Authorization header when auth option is provided', async () => {
      server.use(
        http.get(`${BASE_URL}/secure`, ({ request }) => {
          const auth = request.headers.get('Authorization');
          return HttpResponse.json({ auth });
        }),
      );

      const client = new HttpClient(BASE_URL, { timeoutMs: 5_000, maxRetries: 3 });
      const result = await client.get<{ auth: string }>('/secure', {
        auth: 'Bearer token123',
      });

      expect(result.auth).toBe('Bearer token123');
    });
  });
});

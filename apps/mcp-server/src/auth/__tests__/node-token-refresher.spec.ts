import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeTokenRefresher } from '../node-token-refresher.service.js';
import type { KomerciaSession, KomerciaSessionService } from '../komercia-session.service.js';

// We test the orchestration logic — the single-flight lock and skew window —
// without spinning up Komercia. KomerciaClient.createForAuth is mocked.

const mockLoginNode = vi.fn();

vi.mock('@komercia-mcp/komercia-client', () => ({
  KomerciaClient: {
    createForAuth: () => ({
      auth: {
        loginNode: (...args: unknown[]) => mockLoginNode(...args),
      },
    }),
  },
}));

vi.mock('../../config/env.js', () => ({
  config: {
    nodeUrl: 'https://node.test',
    laravelUrl: 'https://laravel.test',
    laravelClientId: '2',
    laravelClientSecret: 'secret',
  },
}));

function makeJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: 32951, exp: expSeconds })).toString('base64url');
  return `${header}.${payload}.sig`;
}

function makeSession(overrides: Partial<KomerciaSession> = {}): KomerciaSession {
  return {
    jti: '00000000-0000-4000-8000-000000000001',
    email: 'test@example.com',
    merchantId: '32951',
    storeId: '1559',
    nodeToken: 'old.node.jwt',
    nodeTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h ahead
    laravelToken: 'laravel-token',
    ...overrides,
  };
}

function makeSessionsService(): KomerciaSessionService {
  return {
    getRawCredentials: vi.fn(async () => ({ email: 'test@example.com', password: 'pw' })),
    encrypt: vi.fn((s: string) => `enc(${s})`),
    updateNodeToken: vi.fn(async () => undefined),
    revoke: vi.fn(async () => true),
  } as unknown as KomerciaSessionService;
}

beforeEach(() => {
  mockLoginNode.mockReset();
});

describe('NodeTokenRefresher', () => {
  it('does not refresh when token has > 5min remaining', async () => {
    const sessions = makeSessionsService();
    const r = new NodeTokenRefresher(sessions);
    const session = makeSession({ nodeTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000) });

    const out = await r.ensureFresh(session);

    expect(out.nodeToken).toBe('old.node.jwt');
    expect(mockLoginNode).not.toHaveBeenCalled();
    expect(sessions.updateNodeToken).not.toHaveBeenCalled();
  });

  it('refreshes when token is within skew window', async () => {
    const sessions = makeSessionsService();
    const r = new NodeTokenRefresher(sessions);
    const session = makeSession({ nodeTokenExpiresAt: new Date(Date.now() + 60 * 1000) }); // 1min left
    const newExp = Math.floor((Date.now() + 7200 * 1000) / 1000);
    mockLoginNode.mockResolvedValueOnce({ accessToken: makeJwt(newExp) });

    const out = await r.ensureFresh(session);

    expect(mockLoginNode).toHaveBeenCalledOnce();
    expect(out.nodeToken).not.toBe('old.node.jwt');
    expect(sessions.updateNodeToken).toHaveBeenCalledOnce();
    expect((sessions.updateNodeToken as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatch(/^enc\(/);
  });

  it('coalesces concurrent refresh requests for the same jti (single-flight)', async () => {
    const sessions = makeSessionsService();
    const r = new NodeTokenRefresher(sessions);
    const newExp = Math.floor((Date.now() + 7200 * 1000) / 1000);

    let resolveLogin!: (val: { accessToken: string }) => void;
    const loginPromise = new Promise<{ accessToken: string }>((res) => { resolveLogin = res; });
    mockLoginNode.mockImplementationOnce(() => loginPromise);

    const s1 = makeSession({ nodeTokenExpiresAt: new Date(Date.now() - 1000) });
    const s2 = makeSession({ nodeTokenExpiresAt: new Date(Date.now() - 1000) });

    const p1 = r.ensureFresh(s1);
    const p2 = r.ensureFresh(s2);

    // Yield so doRefresh runs up to the awaited loginNode call.
    await Promise.resolve();
    await Promise.resolve();
    resolveLogin({ accessToken: makeJwt(newExp) });
    await Promise.all([p1, p2]);

    expect(mockLoginNode).toHaveBeenCalledOnce();
    expect(sessions.updateNodeToken).toHaveBeenCalledOnce();
  });

  it('auto-revokes the session when Komercia rejects credentials (401)', async () => {
    const sessions = makeSessionsService();
    const r = new NodeTokenRefresher(sessions);
    const session = makeSession({ nodeTokenExpiresAt: new Date(Date.now() - 1000) });
    mockLoginNode.mockRejectedValueOnce(new Error('HTTP 401 from /api/v1/auth/stores/login'));

    await expect(r.ensureFresh(session)).rejects.toThrow();
    expect(sessions.revoke).toHaveBeenCalledWith(session.jti);
  });

  it('does NOT auto-revoke on transient errors (5xx, network)', async () => {
    const sessions = makeSessionsService();
    const r = new NodeTokenRefresher(sessions);
    const session = makeSession({ nodeTokenExpiresAt: new Date(Date.now() - 1000) });
    mockLoginNode.mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(r.ensureFresh(session)).rejects.toThrow();
    expect(sessions.revoke).not.toHaveBeenCalled();
  });

  it('throws when no stored credentials are available (legacy v1 row)', async () => {
    const sessions = {
      ...makeSessionsService(),
      getRawCredentials: vi.fn(async () => null),
    } as unknown as KomerciaSessionService;
    const r = new NodeTokenRefresher(sessions);
    const session = makeSession({ nodeTokenExpiresAt: new Date(Date.now() - 1000) });

    await expect(r.ensureFresh(session)).rejects.toThrow(/no stored credentials/);
  });
});

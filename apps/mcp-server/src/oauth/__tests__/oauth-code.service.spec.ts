import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  config: {
    oauthAuthRequestTtlSeconds: 600,
    oauthAuthCodeTtlSeconds: 90,
  },
}));

type SqlFn = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) & {
  begin: (cb: (tx: SqlFn) => Promise<unknown>) => Promise<unknown>;
};

const sqlMock: { current: SqlFn | undefined } = { current: undefined };

vi.mock('../../db/db.js', () => ({
  getSql: () => sqlMock.current,
}));

import { OAuthCodeError, OAuthCodeService } from '../oauth-code.service.js';

import type { OAuthAuthCode, OAuthAuthRequest } from '../oauth-code.service.js';

function makeSql(handler: (strings: TemplateStringsArray, values: unknown[]) => Promise<unknown[]>): SqlFn {
  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) =>
    handler(strings, values)) as SqlFn;
  fn.begin = async (cb) => cb(fn);
  return fn;
}

describe('OAuthCodeService', () => {
  let svc: OAuthCodeService;

  beforeEach(() => {
    svc = new OAuthCodeService();
  });

  it('createRequest returns the inserted request_id', async () => {
    const requestId = randomUUID();
    sqlMock.current = makeSql(async () => [{ request_id: requestId }]);

    const out = await svc.createRequest({
      client_id: randomUUID(),
      redirect_uri: 'https://app.example/cb',
      code_challenge: 'a'.repeat(43),
      scope: 'read',
      state: 'xyz',
      resource: 'https://api-mcp.komercia.co',
    });

    expect(out).toBe(requestId);
  });

  it('findRequest returns null when no row matches', async () => {
    sqlMock.current = makeSql(async () => []);
    const out = await svc.findRequest(randomUUID());
    expect(out).toBeNull();
  });

  it('redeemCode throws invalid_grant when code not found', async () => {
    sqlMock.current = makeSql(async () => []);
    await expect(
      svc.redeemCode('abc', {
        client_id: randomUUID(),
        redirect_uri: 'https://app.example/cb',
      }),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
  });

  it('redeemCode throws invalid_grant when consumed', async () => {
    const clientId = randomUUID();
    const jti = randomUUID();
    const row: OAuthAuthCode = {
      code: 'abc',
      client_id: clientId,
      jti,
      redirect_uri: 'https://app.example/cb',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      scope: 'read',
      resource: 'https://api-mcp.komercia.co',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: new Date(),
    };
    sqlMock.current = makeSql(async () => [row]);

    await expect(
      svc.redeemCode('abc', { client_id: clientId, redirect_uri: row.redirect_uri }),
    ).rejects.toBeInstanceOf(OAuthCodeError);
  });

  it('redeemCode throws invalid_grant on expired code', async () => {
    const clientId = randomUUID();
    const jti = randomUUID();
    const row: OAuthAuthCode = {
      code: 'abc',
      client_id: clientId,
      jti,
      redirect_uri: 'https://app.example/cb',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      scope: 'read',
      resource: 'https://api-mcp.komercia.co',
      created_at: new Date(),
      expires_at: new Date(Date.now() - 1_000),
      consumed_at: null,
    };
    sqlMock.current = makeSql(async () => [row]);

    await expect(
      svc.redeemCode('abc', { client_id: clientId, redirect_uri: row.redirect_uri }),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
  });

  it('redeemCode throws invalid_grant on client_id mismatch', async () => {
    const jti = randomUUID();
    const row: OAuthAuthCode = {
      code: 'abc',
      client_id: randomUUID(),
      jti,
      redirect_uri: 'https://app.example/cb',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      scope: 'read',
      resource: 'https://api-mcp.komercia.co',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: null,
    };
    sqlMock.current = makeSql(async () => [row]);

    await expect(
      svc.redeemCode('abc', { client_id: randomUUID(), redirect_uri: row.redirect_uri }),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
  });

  it('redeemCode throws invalid_target on resource mismatch', async () => {
    const clientId = randomUUID();
    const jti = randomUUID();
    const row: OAuthAuthCode = {
      code: 'abc',
      client_id: clientId,
      jti,
      redirect_uri: 'https://app.example/cb',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      scope: 'read',
      resource: 'https://api-mcp.komercia.co',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: null,
    };
    sqlMock.current = makeSql(async () => [row]);

    await expect(
      svc.redeemCode('abc', {
        client_id: clientId,
        redirect_uri: row.redirect_uri,
        resource: 'https://wrong.example',
      }),
    ).rejects.toMatchObject({ code: 'invalid_target' });
  });

  it('redeemCode returns the row and consumes it on success', async () => {
    const clientId = randomUUID();
    const jti = randomUUID();
    const row: OAuthAuthCode = {
      code: 'abc',
      client_id: clientId,
      jti,
      redirect_uri: 'https://app.example/cb',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      scope: 'read',
      resource: 'https://api-mcp.komercia.co',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: null,
    };
    let callCount = 0;
    sqlMock.current = makeSql(async () => {
      callCount += 1;
      if (callCount === 1) return [row]; // SELECT FOR UPDATE
      return []; // UPDATE
    });

    const out = await svc.redeemCode('abc', {
      client_id: clientId,
      redirect_uri: row.redirect_uri,
      resource: row.resource,
    });

    expect(out.code).toBe('abc');
    expect(callCount).toBe(2);
  });

  it('issueCodeForRequest inserts a code and marks the request consumed', async () => {
    const request: OAuthAuthRequest = {
      request_id: randomUUID(),
      client_id: randomUUID(),
      redirect_uri: 'https://app.example/cb',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      scope: 'read',
      state: 'xyz',
      resource: 'https://api-mcp.komercia.co',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 600_000),
      consumed_at: null,
    };
    const calls: unknown[][] = [];
    sqlMock.current = makeSql(async (strings, values) => {
      calls.push([strings.raw, values]);
      return [];
    });

    const code = await svc.issueCodeForRequest(request, randomUUID());

    expect(code.length).toBeGreaterThan(0);
    expect(calls.length).toBe(2); // INSERT auth_codes + UPDATE auth_requests
  });
});

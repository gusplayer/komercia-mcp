import { describe, it, expect } from 'vitest';
import {
  signMerchantToken,
  verifyMerchantToken,
  TokenExpiredError,
  TokenInvalidError,
  TokenMalformedError,
} from '../jwt.js';

const SECRET = 'test-secret-key-for-unit-tests-only';

const BASE_PAYLOAD = {
  sub: 'merchant-123',
  store_id: 'store-456',
  email: 'merchant@example.com',
  scope: 'read' as const,
};

describe('signMerchantToken / verifyMerchantToken', () => {
  it('produces a valid JWT that verifyMerchantToken accepts', async () => {
    const token = await signMerchantToken(BASE_PAYLOAD, SECRET);
    const result = await verifyMerchantToken(token, SECRET);
    expect(result.sub).toBe(BASE_PAYLOAD.sub);
  });

  it('round-trips all payload claims correctly', async () => {
    const token = await signMerchantToken(BASE_PAYLOAD, SECRET);
    const result = await verifyMerchantToken(token, SECRET);

    expect(result.sub).toBe(BASE_PAYLOAD.sub);
    expect(result.store_id).toBe(BASE_PAYLOAD.store_id);
    expect(result.email).toBe(BASE_PAYLOAD.email);
    expect(result.scope).toBe(BASE_PAYLOAD.scope);
    expect(typeof result.jti).toBe('string');
    expect(result.jti.length).toBeGreaterThan(0);
    expect(typeof result.iat).toBe('number');
    expect(typeof result.exp).toBe('number');
  });

  it('throws TokenExpiredError for an expired token', async () => {
    const token = await signMerchantToken(BASE_PAYLOAD, SECRET, -1);
    await expect(verifyMerchantToken(token, SECRET)).rejects.toThrow(TokenExpiredError);
  });

  it('throws TokenInvalidError for a tampered signature', async () => {
    const token = await signMerchantToken(BASE_PAYLOAD, SECRET);
    const parts = token.split('.');
    parts[2] = parts[2]!.split('').reverse().join('');
    const tampered = parts.join('.');
    await expect(verifyMerchantToken(tampered, SECRET)).rejects.toThrow(TokenInvalidError);
  });

  it('throws TokenMalformedError for a random string', async () => {
    await expect(verifyMerchantToken('not.a.jwt', SECRET)).rejects.toThrow(TokenMalformedError);
  });

  it('throws TokenMalformedError for a completely invalid string', async () => {
    await expect(verifyMerchantToken('randomgarbage', SECRET)).rejects.toThrow(TokenMalformedError);
  });

  it('jti is unique across two consecutive calls', async () => {
    const token1 = await signMerchantToken(BASE_PAYLOAD, SECRET);
    const token2 = await signMerchantToken(BASE_PAYLOAD, SECRET);
    const result1 = await verifyMerchantToken(token1, SECRET);
    const result2 = await verifyMerchantToken(token2, SECRET);
    expect(result1.jti).not.toBe(result2.jti);
  });

  it('scope is always read — tokens signed with a different secret that embed invalid scope are rejected', async () => {
    const { SignJWT } = await import('jose');
    const secretKey = new TextEncoder().encode(SECRET);
    const badToken = await new SignJWT({ store_id: 'x', email: 'x@x.com', scope: 'write' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('x')
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secretKey);

    await expect(verifyMerchantToken(badToken, SECRET)).rejects.toThrow(TokenInvalidError);
  });
});

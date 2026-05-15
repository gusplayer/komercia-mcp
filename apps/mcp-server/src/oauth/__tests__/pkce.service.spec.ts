import { describe, expect, it } from 'vitest';

import { PkceService } from '../pkce.service.js';

// RFC 7636 §A.1 test vector.
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('PkceService', () => {
  const svc = new PkceService();

  it('accepts the RFC 7636 §A.1 verifier+challenge pair', () => {
    expect(svc.verify(RFC_VERIFIER, RFC_CHALLENGE)).toBe(true);
  });

  it('rejects a verifier that does not hash to the challenge', () => {
    expect(svc.verify('not-the-right-verifier-not-the-right-verifier1234', RFC_CHALLENGE)).toBe(false);
  });

  it('rejects when challenge length differs from expected', () => {
    // Truncated challenge — must not throw, must return false.
    expect(svc.verify(RFC_VERIFIER, RFC_CHALLENGE.slice(0, 30))).toBe(false);
  });

  it('does not throw on different lengths (timingSafeEqual would throw)', () => {
    expect(() => svc.verify(RFC_VERIFIER, 'short')).not.toThrow();
  });

  it('returns false for empty inputs', () => {
    expect(svc.verify('', '')).toBe(false);
    expect(svc.verify(RFC_VERIFIER, '')).toBe(false);
    expect(svc.verify('', RFC_CHALLENGE)).toBe(false);
  });

  it('rejects non-string inputs defensively', () => {
    // @ts-expect-error — exercising the runtime guard.
    expect(svc.verify(null, RFC_CHALLENGE)).toBe(false);
    // @ts-expect-error — exercising the runtime guard.
    expect(svc.verify(RFC_VERIFIER, undefined)).toBe(false);
  });
});

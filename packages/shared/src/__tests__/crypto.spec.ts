import { describe, it, expect } from 'vitest';
import {
  createCryptoService,
  CryptoAuthError,
  CryptoFormatError,
  CryptoKeyError,
} from '../crypto.js';

const VALID_KEY = '256dec30064c936178a38960f200a6f3a17c56ef01c3b723bb51a015996eceb9';
const ALT_KEY = 'a'.repeat(64);

describe('createCryptoService', () => {
  it('rejects keys of wrong length', () => {
    expect(() => createCryptoService('short')).toThrow(CryptoKeyError);
    expect(() => createCryptoService('a'.repeat(63))).toThrow(CryptoKeyError);
  });

  it('rejects non-hex keys', () => {
    expect(() => createCryptoService('z'.repeat(64))).toThrow(CryptoKeyError);
  });

  it('round-trips ASCII and unicode payloads', () => {
    const svc = createCryptoService(VALID_KEY);
    for (const sample of ['hello', '', 'multi line\nwith tabs\there', '🔐 emoji + ñ', 'a'.repeat(2000)]) {
      const enc = svc.encrypt(sample);
      expect(enc).toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/);
      expect(svc.decrypt(enc)).toBe(sample);
    }
  });

  it('produces different ciphertext for the same input (random IV)', () => {
    const svc = createCryptoService(VALID_KEY);
    const a = svc.encrypt('same input');
    const b = svc.encrypt('same input');
    expect(a).not.toBe(b);
    expect(svc.decrypt(a)).toBe(svc.decrypt(b));
  });

  it('refuses tampered ciphertext (CryptoAuthError)', () => {
    const svc = createCryptoService(VALID_KEY);
    const enc = svc.encrypt('payload');
    const [iv, tag, ct] = enc.split(':');
    const tampered = [iv, tag, ct!.replace(/.$/, (c) => (c === '0' ? '1' : '0'))].join(':');
    expect(() => svc.decrypt(tampered)).toThrow(CryptoAuthError);
  });

  it('refuses ciphertext from a different key', () => {
    const a = createCryptoService(VALID_KEY);
    const b = createCryptoService(ALT_KEY);
    const enc = a.encrypt('cross-key');
    expect(() => b.decrypt(enc)).toThrow(CryptoAuthError);
  });

  it('refuses malformed input (CryptoFormatError)', () => {
    const svc = createCryptoService(VALID_KEY);
    expect(() => svc.decrypt('not-encrypted')).toThrow(CryptoFormatError);
    expect(() => svc.decrypt('a:b')).toThrow(CryptoFormatError);
    expect(() => svc.decrypt('zz:yy:xx')).toThrow(CryptoFormatError);
  });
});

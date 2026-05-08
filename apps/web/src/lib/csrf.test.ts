import { describe, it, expect } from 'vitest';

import { generateCsrfToken, validateCsrfToken } from './csrf.js';

describe('generateCsrfToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a different value on each call', () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });
});

describe('validateCsrfToken', () => {
  it('returns true when cookie and header match', () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it('returns false when values differ', () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    expect(validateCsrfToken(a, b)).toBe(false);
  });

  it('returns false when cookie is null', () => {
    expect(validateCsrfToken(null, 'abc')).toBe(false);
  });

  it('returns false when header is null', () => {
    expect(validateCsrfToken('abc', null)).toBe(false);
  });

  it('returns false when both are empty strings', () => {
    expect(validateCsrfToken('', '')).toBe(false);
  });

  it('returns false when lengths differ (avoids timingSafeEqual throw)', () => {
    expect(validateCsrfToken('short', 'muchlongervalue')).toBe(false);
  });
});

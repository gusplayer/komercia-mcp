import { createHash, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

/**
 * PKCE S256 verifier (RFC 7636).
 *
 * Both inputs are URL-safe base64 strings without padding. The challenge is
 * `BASE64URL(SHA256(verifier))`. We compute the expected challenge from the
 * verifier, compare in constant time, and fail closed on any length mismatch
 * — `timingSafeEqual` throws when buffers differ in length.
 */
@Injectable()
export class PkceService {
  verify(verifier: string, challenge: string): boolean {
    if (typeof verifier !== 'string' || typeof challenge !== 'string') {
      return false;
    }

    const expected = createHash('sha256').update(verifier).digest();
    const expectedB64 = expected
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const expectedBuf = Buffer.from(expectedB64);
    const challengeBuf = Buffer.from(challenge);

    if (expectedBuf.length !== challengeBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, challengeBuf);
  }
}

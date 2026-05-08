import * as crypto from 'node:crypto';

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;

export class CryptoFormatError extends Error {
  constructor(message = 'Invalid encrypted value format') {
    super(message);
    this.name = 'CryptoFormatError';
  }
}

export class CryptoKeyError extends Error {
  constructor(message = 'Invalid encryption key') {
    super(message);
    this.name = 'CryptoKeyError';
  }
}

export class CryptoAuthError extends Error {
  constructor(message = 'Decryption failed (auth tag mismatch)') {
    super(message);
    this.name = 'CryptoAuthError';
  }
}

export interface CryptoService {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}

/**
 * Builds an AES-256-GCM encrypt/decrypt pair from a 32-byte key (provided as 64 hex chars).
 * Output format: `<ivHex(24)>:<authTagHex(32)>:<ciphertextHex>` — fixed-width, colon-separated.
 *
 * Throws `CryptoKeyError` synchronously if the key is malformed.
 * `decrypt` throws `CryptoFormatError` for malformed input or `CryptoAuthError` if the
 * auth tag does not validate (tampering or wrong key).
 */
export function createCryptoService(keyHex: string): CryptoService {
  if (typeof keyHex !== 'string' || keyHex.length !== KEY_BYTES * 2 || !/^[0-9a-f]+$/i.test(keyHex)) {
    const expected = String(KEY_BYTES * 2);
    const got = typeof keyHex === 'string' ? String(keyHex.length) : '0';
    throw new CryptoKeyError(`Encryption key must be ${expected} hex chars (got ${got})`);
  }
  const key = Buffer.from(keyHex, 'hex');

  return {
    encrypt(plaintext: string): string {
      const iv = crypto.randomBytes(IV_BYTES);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
    },

    decrypt(stored: string): string {
      const parts = stored.split(':');
      if (parts.length !== 3) {
        throw new CryptoFormatError();
      }
      const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];
      if (
        ivHex.length !== IV_BYTES * 2 ||
        authTagHex.length !== AUTH_TAG_BYTES * 2 ||
        !/^[0-9a-f]*$/i.test(ciphertextHex)
      ) {
        throw new CryptoFormatError();
      }
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const ciphertext = Buffer.from(ciphertextHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      try {
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
      } catch {
        throw new CryptoAuthError();
      }
    },
  };
}

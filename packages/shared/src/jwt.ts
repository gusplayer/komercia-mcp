import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

import { JWT_EXPIRY_SECONDS, SCOPES } from './constants.js';

import type { MerchantJWTPayload } from './types.js';

export class TokenExpiredError extends Error {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class TokenInvalidError extends Error {
  constructor(message = 'Token signature is invalid') {
    super(message);
    this.name = 'TokenInvalidError';
  }
}

export class TokenMalformedError extends Error {
  constructor(message = 'Token is malformed') {
    super(message);
    this.name = 'TokenMalformedError';
  }
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signMerchantToken(
  payload: Omit<MerchantJWTPayload, 'iat' | 'exp' | 'jti'>,
  secret: string,
  expirySeconds: number = JWT_EXPIRY_SECONDS,
): Promise<string> {
  const jti = crypto.randomUUID();
  const secretKey = encodeSecret(secret);

  return new SignJWT({
    store_id: payload.store_id,
    email: payload.email,
    scope: payload.scope,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${String(expirySeconds)}s`)
    .sign(secretKey);
}

export async function verifyMerchantToken(
  token: string,
  secret: string,
): Promise<MerchantJWTPayload> {
  const secretKey = encodeSecret(secret);

  let payload: MerchantJWTPayload;

  try {
    const { payload: raw } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    const sub = raw.sub;
    // store_id is the JWT claim name (snake_case is standard wire format).
    // We rename to camelCase locally to satisfy the linter.
    const storeId = raw['store_id'];
    const email = raw['email'];
    const scope = raw['scope'];
    const jti = raw.jti;
    const iat = raw.iat;
    const exp = raw.exp;

    if (
      typeof sub !== 'string' ||
      typeof storeId !== 'string' ||
      typeof email !== 'string' ||
      typeof scope !== 'string' ||
      typeof jti !== 'string' ||
      typeof iat !== 'number' ||
      typeof exp !== 'number'
    ) {
      throw new TokenMalformedError('Token payload is missing required claims');
    }

    if (!(SCOPES as readonly string[]).includes(scope)) {
      throw new TokenInvalidError(`Token scope '${scope}' is not permitted`);
    }

    payload = {
      sub,
      store_id: storeId,
      email,
      scope: scope as MerchantJWTPayload['scope'],
      jti,
      iat,
      exp,
    };
  } catch (err) {
    if (err instanceof TokenExpiredError || err instanceof TokenInvalidError || err instanceof TokenMalformedError) {
      throw err;
    }

    if (err instanceof joseErrors.JWTExpired) {
      throw new TokenExpiredError();
    }

    if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
      throw new TokenInvalidError();
    }

    if (
      err instanceof joseErrors.JWSInvalid ||
      err instanceof joseErrors.JWTInvalid ||
      err instanceof joseErrors.JWTClaimValidationFailed ||
      err instanceof joseErrors.JOSENotSupported
    ) {
      throw new TokenMalformedError();
    }

    throw new TokenMalformedError('Token could not be parsed');
  }

  return payload;
}

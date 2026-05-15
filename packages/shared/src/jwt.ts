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

export type SignMerchantTokenOptions = {
  secret: string;
  sub: string;
  store_id: string;
  email: string;
  scope: MerchantJWTPayload['scope'];
  jti?: string;
  expirySeconds?: number;
  iss?: string;
  aud?: string;
};

export type VerifyMerchantTokenOptions = {
  token: string;
  secret: string;
  expectedAudience?: string;
};

/**
 * Sign a merchant JWT. Supports two call styles:
 *
 *   1. Positional (legacy): `signMerchantToken(payload, secret, expirySeconds?)`
 *   2. Options object (OAuth-aware): `signMerchantToken({ secret, sub, store_id,
 *      email, scope, jti?, expirySeconds?, iss?, aud? })`
 *
 * `iss`/`aud` are only embedded when supplied via the options form, so legacy
 * tokens stay byte-compatible.
 */
export async function signMerchantToken(
  payload: Omit<MerchantJWTPayload, 'iat' | 'exp' | 'jti'>,
  secret: string,
  expirySeconds?: number,
): Promise<string>;
export async function signMerchantToken(options: SignMerchantTokenOptions): Promise<string>;
export async function signMerchantToken(
  payloadOrOptions: Omit<MerchantJWTPayload, 'iat' | 'exp' | 'jti'> | SignMerchantTokenOptions,
  secret?: string,
  expirySeconds?: number,
): Promise<string> {
  const isOptions = typeof secret === 'undefined';

  const effectiveSecret = isOptions
    ? (payloadOrOptions as SignMerchantTokenOptions).secret
    : (secret as string);

  const sub = (payloadOrOptions as { sub: string }).sub;
  const storeId = (payloadOrOptions as { store_id: string }).store_id;
  const email = (payloadOrOptions as { email: string }).email;
  const scope = (payloadOrOptions as { scope: MerchantJWTPayload['scope'] }).scope;

  const opts = isOptions ? (payloadOrOptions as SignMerchantTokenOptions) : undefined;
  const effectiveExpiry =
    opts?.expirySeconds ?? expirySeconds ?? JWT_EXPIRY_SECONDS;
  const jti = opts?.jti ?? crypto.randomUUID();
  const iss = opts?.iss;
  const aud = opts?.aud;

  const secretKey = encodeSecret(effectiveSecret);

  let builder = new SignJWT({
    store_id: storeId,
    email,
    scope,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${String(effectiveExpiry)}s`);

  if (typeof iss === 'string' && iss.length > 0) {
    builder = builder.setIssuer(iss);
  }

  if (typeof aud === 'string' && aud.length > 0) {
    builder = builder.setAudience(aud);
  }

  return builder.sign(secretKey);
}

/**
 * Verify a merchant JWT. Supports two call styles:
 *
 *   1. Positional (legacy): `verifyMerchantToken(token, secret)`
 *   2. Options object (OAuth-aware): `verifyMerchantToken({ token, secret,
 *      expectedAudience? })`
 *
 * When both `expectedAudience` and a token `aud` claim are present, equality is
 * enforced via `jose`. When either side is missing, audience validation is
 * skipped — this preserves backwards compatibility with bearer tokens minted
 * before OAuth audience binding was introduced.
 */
export async function verifyMerchantToken(
  token: string,
  secret: string,
): Promise<MerchantJWTPayload>;
export async function verifyMerchantToken(
  options: VerifyMerchantTokenOptions,
): Promise<MerchantJWTPayload>;
export async function verifyMerchantToken(
  tokenOrOptions: string | VerifyMerchantTokenOptions,
  secret?: string,
): Promise<MerchantJWTPayload> {
  const isOptions = typeof tokenOrOptions !== 'string';
  const token = isOptions ? tokenOrOptions.token : tokenOrOptions;
  const effectiveSecret = isOptions ? tokenOrOptions.secret : (secret as string);
  const expectedAudience = isOptions ? tokenOrOptions.expectedAudience : undefined;

  const secretKey = encodeSecret(effectiveSecret);

  let payload: MerchantJWTPayload;

  try {
    // Peek at the token's `aud` claim so we only ask jose to validate audience
    // when both the caller and the token have one — keeps legacy tokens valid.
    let tokenHasAudience = false;
    const parts = token.split('.');
    if (parts.length === 3 && typeof parts[1] === 'string') {
      try {
        const decoded = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8'),
        ) as Record<string, unknown>;
        tokenHasAudience = typeof decoded['aud'] !== 'undefined';
      } catch {
        // Ignore peek errors; jose will reject malformed tokens below.
      }
    }

    const verifyOptions: Parameters<typeof jwtVerify>[2] = {
      algorithms: ['HS256'],
    };

    if (typeof expectedAudience === 'string' && expectedAudience.length > 0 && tokenHasAudience) {
      verifyOptions.audience = expectedAudience;
    }

    const { payload: raw } = await jwtVerify(token, secretKey, verifyOptions);

    const sub = raw.sub;
    // store_id is the JWT claim name (snake_case is standard wire format).
    // We rename to camelCase locally to satisfy the linter.
    const storeId = raw['store_id'];
    const email = raw['email'];
    const scope = raw['scope'];
    const jti = raw.jti;
    const iat = raw.iat;
    const exp = raw.exp;
    const iss = raw.iss;
    const aud = raw.aud;

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

    if (typeof iss === 'string') {
      payload.iss = iss;
    }

    if (typeof aud === 'string') {
      payload.aud = aud;
    } else if (Array.isArray(aud) && aud.length > 0 && typeof aud[0] === 'string') {
      payload.aud = aud[0];
    }
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

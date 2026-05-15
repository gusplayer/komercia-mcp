import { z } from 'zod';

// RFC 8252 §7.3 — localhost loopback is allowed for native apps; everything
// else must be https.
const redirectUriSchema = z
  .string()
  .url()
  .refine(
    (uri) => {
      try {
        const u = new URL(uri);
        if (u.protocol === 'https:') return true;
        if (u.protocol === 'http:') {
          // Loopback IPs and `localhost` (RFC 8252 §7.3).
          const host = u.hostname;
          return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
        }
        return false;
      } catch {
        return false;
      }
    },
    { message: 'redirect_uri must be https or http://localhost' },
  );

export const dcrRequestSchema = z
  .object({
    client_name: z.string().min(1).max(200),
    redirect_uris: z.array(redirectUriSchema).min(1).max(5),
    token_endpoint_auth_method: z
      .enum(['none', 'client_secret_basic', 'client_secret_post'])
      .optional()
      .default('none'),
    grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])).optional(),
    response_types: z.array(z.literal('code')).optional(),
    scope: z
      .string()
      .optional()
      .refine(
        (s) => {
          if (s === undefined) return true;
          const parts = s.split(/\s+/).filter(Boolean);
          return parts.every((p) => p === 'read');
        },
        { message: 'only "read" scope is supported' },
      ),
    software_id: z.string().optional(),
    software_version: z.string().optional(),
  })
  .strict();

export type DcrRequest = z.infer<typeof dcrRequestSchema>;

export const authorizeQuerySchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().uuid(),
  redirect_uri: z.string().url(),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  code_challenge_method: z.literal('S256'),
  state: z.string().min(1).max(512),
  scope: z.string().optional(),
  resource: z.string().url(),
});

export type AuthorizeQuery = z.infer<typeof authorizeQuerySchema>;

export const completeQuerySchema = z.object({
  ticket: z.string().min(1),
});

export const tokenRequestSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  client_id: z.string().uuid(),
  redirect_uri: z.string().url(),
  code_verifier: z.string().regex(/^[A-Za-z0-9_~.-]{43,128}$/),
  resource: z.string().url().optional(),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;

// Used only to detect unsupported grant_type early and emit the right error
// code. Anything else falls through to the strict schema above.
export const grantTypeSchema = z.object({
  grant_type: z.string().min(1),
});

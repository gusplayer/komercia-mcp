import { randomUUID } from 'node:crypto';

import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  config: {
    jwtSecret: 'a'.repeat(64),
    oauthCompletionTicketTtlSeconds: 120,
  },
}));

import {
  COMPLETION_TICKET_AUDIENCE,
  COMPLETION_TICKET_SCOPE,
  CompletionTicketError,
  CompletionTicketService,
} from '../completion-ticket.service.js';

const TEST_SECRET = 'a'.repeat(64);
const secret = () => new TextEncoder().encode(TEST_SECRET);

describe('CompletionTicketService', () => {
  let svc: CompletionTicketService;

  beforeEach(() => {
    svc = new CompletionTicketService();
  });

  it('signs and verifies a roundtrip', async () => {
    const oauthRequestId = randomUUID();
    const jti = randomUUID();
    const token = await svc.sign({ oauth_request_id: oauthRequestId, jti });

    const claims = await svc.verify(token);
    expect(claims.oauth_request_id).toBe(oauthRequestId);
    expect(claims.jti).toBe(jti);
  });

  it('rejects a ticket with the wrong audience', async () => {
    const oauthRequestId = randomUUID();
    const jti = randomUUID();
    const wrong = await new SignJWT({
      scope: COMPLETION_TICKET_SCOPE,
      oauth_request_id: oauthRequestId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('urn:wrong-audience')
      .setSubject(jti)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(secret());

    await expect(svc.verify(wrong)).rejects.toBeInstanceOf(CompletionTicketError);
  });

  it('rejects a ticket with the wrong scope', async () => {
    const oauthRequestId = randomUUID();
    const jti = randomUUID();
    const wrong = await new SignJWT({
      scope: 'something.else',
      oauth_request_id: oauthRequestId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(COMPLETION_TICKET_AUDIENCE)
      .setSubject(jti)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(secret());

    await expect(svc.verify(wrong)).rejects.toBeInstanceOf(CompletionTicketError);
  });

  it('rejects an expired ticket', async () => {
    const oauthRequestId = randomUUID();
    const jti = randomUUID();
    const expired = await new SignJWT({
      scope: COMPLETION_TICKET_SCOPE,
      oauth_request_id: oauthRequestId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(COMPLETION_TICKET_AUDIENCE)
      .setSubject(jti)
      .setJti(randomUUID())
      .setIssuedAt(Math.floor(Date.now() / 1000) - 600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret());

    await expect(svc.verify(expired)).rejects.toBeInstanceOf(CompletionTicketError);
  });

  it('rejects a malformed token', async () => {
    await expect(svc.verify('not-a-jwt')).rejects.toBeInstanceOf(CompletionTicketError);
    await expect(svc.verify('a.b.c')).rejects.toBeInstanceOf(CompletionTicketError);
  });

  it('rejects a ticket signed with the wrong secret', async () => {
    const oauthRequestId = randomUUID();
    const jti = randomUUID();
    const wrong = await new SignJWT({
      scope: COMPLETION_TICKET_SCOPE,
      oauth_request_id: oauthRequestId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(COMPLETION_TICKET_AUDIENCE)
      .setSubject(jti)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(new TextEncoder().encode('b'.repeat(64)));

    await expect(svc.verify(wrong)).rejects.toBeInstanceOf(CompletionTicketError);
  });

  it('rejects a ticket with a non-UUID oauth_request_id', async () => {
    const token = await new SignJWT({
      scope: COMPLETION_TICKET_SCOPE,
      oauth_request_id: 'not-a-uuid',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(COMPLETION_TICKET_AUDIENCE)
      .setSubject(randomUUID())
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(secret());

    await expect(svc.verify(token)).rejects.toBeInstanceOf(CompletionTicketError);
  });
});

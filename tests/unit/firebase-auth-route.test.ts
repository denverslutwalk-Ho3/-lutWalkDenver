import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consumeLoginAttempt: vi.fn(),
  clearLoginAttempts: vi.fn(),
  signToken: vi.fn(),
  memberPasswordVersion: vi.fn(),
  getAdminAuth: vi.fn(),
}));

vi.mock('../../lib/login-rate-limit', () => ({
  consumeLoginAttempt: mocks.consumeLoginAttempt,
  clearLoginAttempts: mocks.clearLoginAttempts,
}));

vi.mock('../../lib/auth', () => ({
  signToken: mocks.signToken,
}));

vi.mock('../../lib/session-version', () => ({
  memberPasswordVersion: mocks.memberPasswordVersion,
}));

vi.mock('../../lib/firebase-admin', () => ({
  getAdminAuth: mocks.getAdminAuth,
}));

import { POST } from '../../app/api/auth/firebase/route';

function firebaseSignInRequest(body: unknown) {
  return new Request('http://localhost/api/auth/firebase', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/firebase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeLoginAttempt.mockResolvedValue({ allowed: true });
    mocks.clearLoginAttempts.mockResolvedValue(undefined);
    mocks.memberPasswordVersion.mockReturnValue('test-member-version');
    mocks.signToken.mockReturnValue('signed-member-token');
    mocks.getAdminAuth.mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ sub: 'firebase-user-uid', email: 'member@example.com' }),
    });
  });

  it('rejects a request without an ID token', async () => {
    const response = await POST(firebaseSignInRequest({}));

    expect(response.status).toBe(400);
    expect(mocks.getAdminAuth).not.toHaveBeenCalled();
    expect(mocks.signToken).not.toHaveBeenCalled();
  });

  it('rejects a non-string ID token', async () => {
    const response = await POST(firebaseSignInRequest({ idToken: 12345 }));

    expect(response.status).toBe(400);
  });

  it('rejects an invalid or expired Firebase ID token', async () => {
    mocks.getAdminAuth.mockReturnValue({
      verifyIdToken: vi.fn().mockRejectedValue(new Error('invalid token')),
    });

    const response = await POST(firebaseSignInRequest({ idToken: 'not-a-real-token' }));

    expect(response.status).toBe(401);
    expect(mocks.signToken).not.toHaveBeenCalled();
  });

  it('rejects a decoded token without a subject', async () => {
    mocks.getAdminAuth.mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({}),
    });

    const response = await POST(firebaseSignInRequest({ idToken: 'token-without-sub' }));

    expect(response.status).toBe(401);
    expect(mocks.signToken).not.toHaveBeenCalled();
  });

  it('rejects with 429 when the member login rate limit is exhausted', async () => {
    mocks.consumeLoginAttempt.mockResolvedValue({ allowed: false, retryAfterSeconds: 900 });

    const response = await POST(firebaseSignInRequest({ idToken: 'a-token' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('900');
    expect(mocks.getAdminAuth).not.toHaveBeenCalled();
  });

  it('fails closed with 503 when the rate-limit store is unavailable', async () => {
    mocks.consumeLoginAttempt.mockRejectedValue(new Error('firestore down'));

    const response = await POST(firebaseSignInRequest({ idToken: 'a-token' }));

    expect(response.status).toBe(503);
    expect(mocks.getAdminAuth).not.toHaveBeenCalled();
  });

  it('issues a member session cookie and clears any admin session on success', async () => {
    const response = await POST(firebaseSignInRequest({ idToken: 'a-valid-token' }));

    expect(response.status).toBe(200);
    expect(mocks.signToken).toHaveBeenCalledWith({ sub: 'member', pv: 'test-member-version' });
    expect(mocks.clearLoginAttempts).toHaveBeenCalledTimes(1);

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/sw_auth=signed-member-token/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/sw_admin=;/);
    expect(setCookie).toMatch(/sw_admin=;.*Max-Age=0/i);
  });

  it('verifies the ID token with checkRevoked enabled', async () => {
    const verifyIdToken = vi.fn().mockResolvedValue({ sub: 'firebase-user-uid' });
    mocks.getAdminAuth.mockReturnValue({ verifyIdToken });

    await POST(firebaseSignInRequest({ idToken: 'a-valid-token' }));

    expect(verifyIdToken).toHaveBeenCalledWith('a-valid-token', true);
  });
});

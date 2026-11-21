import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consumeLoginAttempt: vi.fn(),
  clearLoginAttempts: vi.fn(),
  isAdminLoginConfigured: vi.fn(),
  verifyAdminPassword: vi.fn(),
  signToken: vi.fn(),
  adminPasswordVersion: vi.fn(),
}));

vi.mock('../../lib/login-rate-limit', () => ({
  consumeLoginAttempt: mocks.consumeLoginAttempt,
  clearLoginAttempts: mocks.clearLoginAttempts,
}));

vi.mock('../../lib/passwords', () => ({
  isAdminLoginConfigured: mocks.isAdminLoginConfigured,
  verifyAdminPassword: mocks.verifyAdminPassword,
}));

vi.mock('../../lib/auth', () => ({
  signToken: mocks.signToken,
}));

vi.mock('../../lib/session-version', () => ({
  adminPasswordVersion: mocks.adminPasswordVersion,
}));

import { POST } from '../../app/api/auth/admin-login/route';

function adminLoginRequest(password = 'authorized-test-password') {
  return new Request('http://localhost/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ password }),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/admin-login', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env = { ...process.env, NODE_ENV: originalNodeEnv };
    vi.clearAllMocks();
    mocks.isAdminLoginConfigured.mockReturnValue(true);
    mocks.consumeLoginAttempt.mockResolvedValue({ allowed: true });
    mocks.clearLoginAttempts.mockResolvedValue(undefined);
    mocks.adminPasswordVersion.mockReturnValue('test-admin-version');
    mocks.signToken.mockReturnValue('signed-admin-token');
  });

  it('rejects an incorrect administrator password', async () => {
    mocks.verifyAdminPassword.mockReturnValue(false);

    const response = await POST(adminLoginRequest('wrong'));

    expect(response.status).toBe(401);
    expect(mocks.signToken).not.toHaveBeenCalled();
  });

  it('issues only the admin role cookie and clears any member session', async () => {
    mocks.verifyAdminPassword.mockReturnValue(true);

    const response = await POST(adminLoginRequest());

    expect(response.status).toBe(200);
    expect(mocks.signToken).toHaveBeenCalledWith({
      sub: 'admin',
      pv: 'test-admin-version',
    }, 8 * 60 * 60);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('sw_admin=signed-admin-token');
    expect(setCookie).not.toContain('sw_auth=signed-admin-token');
    expect(setCookie).toMatch(/sw_auth=;.*Max-Age=0/i);
  });

  it('marks the session cookie HttpOnly, SameSite=Lax, site-wide and Secure in production', async () => {
    process.env = { ...process.env, NODE_ENV: 'production' };
    mocks.verifyAdminPassword.mockReturnValue(true);

    const response = await POST(adminLoginRequest());
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(setCookie).toMatch(/sw_admin=signed-admin-token/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/Max-Age=28800/i);
  });

  it('returns 429 with Retry-After once the rate limit is exceeded', async () => {
    mocks.consumeLoginAttempt.mockResolvedValue({ allowed: false, retryAfterSeconds: 900 });

    const response = await POST(adminLoginRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('900');
    expect(mocks.verifyAdminPassword).not.toHaveBeenCalled();
    expect(mocks.signToken).not.toHaveBeenCalled();
  });

  it('stays locked when no administrator password is configured', async () => {
    mocks.isAdminLoginConfigured.mockReturnValue(false);

    const response = await POST(adminLoginRequest());

    expect(response.status).toBe(503);
    expect(mocks.signToken).not.toHaveBeenCalled();
  });
});

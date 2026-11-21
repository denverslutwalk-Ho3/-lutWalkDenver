import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consumeLoginAttempt: vi.fn(),
  clearLoginAttempts: vi.fn(),
  isMemberLoginConfigured: vi.fn(),
  verifyMemberPassword: vi.fn(),
  signToken: vi.fn(),
  memberPasswordVersion: vi.fn(),
}));

vi.mock('../../lib/login-rate-limit', () => ({
  consumeLoginAttempt: mocks.consumeLoginAttempt,
  clearLoginAttempts: mocks.clearLoginAttempts,
}));

vi.mock('../../lib/passwords', () => ({
  isMemberLoginConfigured: mocks.isMemberLoginConfigured,
  verifyMemberPassword: mocks.verifyMemberPassword,
}));

vi.mock('../../lib/auth', () => ({
  signToken: mocks.signToken,
}));

vi.mock('../../lib/session-version', () => ({
  memberPasswordVersion: mocks.memberPasswordVersion,
}));

import { POST } from '../../app/api/auth/login/route';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMemberLoginConfigured.mockReturnValue(true);
    mocks.consumeLoginAttempt.mockResolvedValue({ allowed: true });
    mocks.clearLoginAttempts.mockResolvedValue(undefined);
    mocks.memberPasswordVersion.mockReturnValue('test-version');
  });

  it('rejects an incorrect member password', async () => {
    mocks.verifyMemberPassword.mockReturnValue(false);

    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(401);
    expect(mocks.signToken).not.toHaveBeenCalled();
  });

  it('issues only the member role cookie for a valid password', async () => {
    mocks.verifyMemberPassword.mockReturnValue(true);
    mocks.signToken.mockReturnValue('signed-member-token');

    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'authorized-test-password' }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(mocks.signToken).toHaveBeenCalledWith({
      sub: 'member',
      pv: 'test-version',
    });
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('sw_auth=signed-member-token');
    expect(setCookie).not.toContain('sw_admin=signed-member-token');
  });
});

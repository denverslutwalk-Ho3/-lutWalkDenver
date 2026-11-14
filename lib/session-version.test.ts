import crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { adminPasswordVersion, memberPasswordVersion, passwordVersion } from './session-version';

describe('passwordVersion', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns "unconfigured" when the password or secret is missing', () => {
    process.env.AUTH_SECRET = 'secret';
    delete process.env.MEMBER_PASSWORD;
    expect(memberPasswordVersion()).toBe('unconfigured');

    process.env.MEMBER_PASSWORD = 'pw';
    delete process.env.AUTH_SECRET;
    expect(memberPasswordVersion()).toBe('unconfigured');
  });

  it('derives a deterministic version from the password and secret', () => {
    process.env.AUTH_SECRET = 'secret';
    process.env.MEMBER_PASSWORD = 'pw';

    const expected = crypto
      .createHmac('sha256', 'secret')
      .update('sw-pv:member:pw')
      .digest('base64url')
      .slice(0, 22);

    expect(memberPasswordVersion()).toBe(expected);
    expect(memberPasswordVersion()).toBe(memberPasswordVersion());
  });

  it('changes when the password changes, revoking prior sessions', () => {
    process.env.AUTH_SECRET = 'secret';
    process.env.MEMBER_PASSWORD = 'old-password';
    const before = memberPasswordVersion();

    process.env.MEMBER_PASSWORD = 'new-password';
    expect(memberPasswordVersion()).not.toBe(before);
  });

  it('keeps member and admin versions independent', () => {
    process.env.AUTH_SECRET = 'secret';
    process.env.MEMBER_PASSWORD = 'member-pw';
    process.env.ADMIN_PASSWORD = 'admin-pw';

    expect(memberPasswordVersion()).not.toBe(adminPasswordVersion());
    expect(passwordVersion('admin')).toBe(adminPasswordVersion());
  });

  it('ignores surrounding whitespace in the password', () => {
    process.env.AUTH_SECRET = 'secret';
    process.env.MEMBER_PASSWORD = '  pw  ';
    const trimmed = memberPasswordVersion();

    process.env.MEMBER_PASSWORD = 'pw';
    expect(memberPasswordVersion()).toBe(trimmed);
  });
});

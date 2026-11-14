import { afterEach, describe, expect, it } from 'vitest';

import { isAdminLoginConfigured, isMemberLoginConfigured, verifyAdminPassword, verifyMemberPassword } from './passwords';

describe('password helpers', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reports member login as configured when MEMBER_PASSWORD is set', () => {
    process.env = { ...originalEnv, MEMBER_PASSWORD: 'member-secret' };
    expect(isMemberLoginConfigured()).toBe(true);
  });

  it('accepts the configured member password and trims surrounding whitespace', () => {
    process.env = { ...originalEnv, MEMBER_PASSWORD: 'member-secret' };

    expect(verifyMemberPassword('member-secret')).toBe(true);
    expect(verifyMemberPassword('  member-secret  ')).toBe(true);
    expect(verifyMemberPassword('wrong')).toBe(false);
  });

  it('locks member login when no password is configured', () => {
    const env = { ...originalEnv };
    delete env.MEMBER_PASSWORD;
    process.env = env;

    expect(isMemberLoginConfigured()).toBe(false);
    expect(verifyMemberPassword('')).toBe(false);
    expect(verifyMemberPassword('member-password')).toBe(false);
  });

  it('accepts only the configured admin password', () => {
    process.env = { ...originalEnv, ADMIN_PASSWORD: 'admin-secret' };

    expect(isAdminLoginConfigured()).toBe(true);
    expect(verifyAdminPassword('admin-secret')).toBe(true);
    expect(verifyAdminPassword('admin-password')).toBe(false);
  });

  it('locks admin login when no password is configured', () => {
    const env = { ...originalEnv };
    delete env.ADMIN_PASSWORD;
    process.env = env;

    expect(isAdminLoginConfigured()).toBe(false);
    expect(verifyAdminPassword('admin-password')).toBe(false);
  });
});

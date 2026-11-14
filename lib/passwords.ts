import crypto from 'crypto';

/**
 * Member and admin access is a single shared password per role, configured in
 * the deployment environment. There are deliberately no fallback passwords:
 * an unset password locks the role instead of opening it with a known value.
 */

function readPassword(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function constantTimeEqual(a: string, b: string) {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function isMemberLoginConfigured() {
  return readPassword('MEMBER_PASSWORD').length > 0;
}

export function isAdminLoginConfigured() {
  return readPassword('ADMIN_PASSWORD').length > 0;
}

export function verifyMemberPassword(input: string) {
  const expected = readPassword('MEMBER_PASSWORD');
  if (!expected) return false;
  return constantTimeEqual(input.trim(), expected);
}

export function verifyAdminPassword(input: string) {
  const expected = readPassword('ADMIN_PASSWORD');
  if (!expected) return false;
  return constantTimeEqual(input.trim(), expected);
}

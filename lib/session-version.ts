import crypto from 'crypto';

/**
 * Password-version claims let a password rotation revoke every session that
 * was issued under the previous password. The version is derived from the
 * current password and AUTH_SECRET, so it changes whenever either changes.
 */

function readPassword(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function passwordVersion(role: 'member' | 'admin'): string {
  const secret = process.env.AUTH_SECRET;
  const password = readPassword(role === 'member' ? 'MEMBER_PASSWORD' : 'ADMIN_PASSWORD');

  if (!secret || !password) {
    return 'unconfigured';
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`sw-pv:${role}:${password}`)
    .digest('base64url')
    .slice(0, 22);
}

export function memberPasswordVersion(): string {
  return passwordVersion('member');
}

export function adminPasswordVersion(): string {
  return passwordVersion('admin');
}

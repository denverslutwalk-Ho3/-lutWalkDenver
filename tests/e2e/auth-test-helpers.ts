import crypto from 'node:crypto';

export const E2E_AUTH_SECRET = process.env.AUTH_SECRET ?? 'playwright-only-auth-secret';
export const E2E_MEMBER_PASSWORD = process.env.MEMBER_PASSWORD ?? 'playwright-only-member-password';
export const E2E_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'playwright-only-admin-password';

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

export function createSessionToken(role: 'member' | 'admin', password = role === 'admin'
  ? E2E_ADMIN_PASSWORD
  : E2E_MEMBER_PASSWORD) {
  const iat = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const passwordVersion = crypto
    .createHmac('sha256', E2E_AUTH_SECRET)
    .update(`sw-pv:${role}:${password.trim()}`)
    .digest('base64url')
    .slice(0, 22);
  const body = base64url(JSON.stringify({
    sub: role,
    pv: passwordVersion,
    iat,
    exp: iat + 60 * 60,
  }));
  const unsigned = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', E2E_AUTH_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

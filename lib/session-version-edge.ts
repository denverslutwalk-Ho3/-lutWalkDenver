/**
 * Edge-runtime counterpart of lib/session-version.ts, used by middleware to
 * reject sessions issued under a rotated password. Uses Web Crypto so it runs
 * in the Node.js middleware runtime without importing Node's crypto module.
 */

function readPassword(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function base64url(bytes: ArrayBuffer) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function passwordVersionEdge(role: 'member' | 'admin'): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  const password = readPassword(role === 'member' ? 'MEMBER_PASSWORD' : 'ADMIN_PASSWORD');

  if (!secret || !password) {
    return 'unconfigured';
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`sw-pv:${role}:${password}`));

  return base64url(signature).slice(0, 22);
}

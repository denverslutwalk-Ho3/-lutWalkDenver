import crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { signToken, verifyToken } from './auth';
import { verifyTokenEdge } from './auth-edge';

describe('auth token helpers', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('signs a token and verifies it for a valid payload', () => {
    process.env.AUTH_SECRET = 'super-secret';

    const token = signToken({ sub: 'member' });

    expect(token).toContain('.');
    expect(verifyToken(token)).toMatchObject({ sub: 'member' });
  });

  it('returns null when the token is invalid or malformed', () => {
    process.env.AUTH_SECRET = 'super-secret';

    expect(verifyToken('not-a-jwt')).toBeNull();
    expect(verifyToken('header.body')).toBeNull();
  });

  it('rejects non-canonical base64url encodings of the signature', async () => {
    process.env.AUTH_SECRET = 'super-secret';

    const token = signToken({ sub: 'member' });
    const parts = token.split('.');
    const signature = parts[2];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const lastIndex = alphabet.indexOf(signature.at(-1)!);
    const alias = `${signature.slice(0, -1)}${alphabet[lastIndex + 1]}`;
    const tampered = `${parts[0]}.${parts[1]}.${alias}`;

    expect(verifyToken(tampered)).toBeNull();
    expect(await verifyTokenEdge(tampered)).toBeNull();
  });

  it('rejects a signature with changed HMAC bytes', async () => {
    process.env.AUTH_SECRET = 'super-secret';

    const token = signToken({ sub: 'member' });
    const [header, body, signature] = token.split('.');
    const changed = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;

    expect(verifyToken(`${header}.${body}.${changed}`)).toBeNull();
    expect(await verifyTokenEdge(`${header}.${body}.${changed}`)).toBeNull();
  });

  it('returns null when the token has expired', () => {
    process.env.AUTH_SECRET = 'super-secret';

    const expiredPayload = { sub: 'member', exp: Math.floor(Date.now() / 1000) - 60 };
    const encodedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const encodedBody = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const unsigned = `${encodedHeader}.${encodedBody}`;
    const signature = crypto.createHmac('sha256', 'super-secret').update(unsigned).digest('base64url');
    const token = `${unsigned}.${signature}`;

    expect(verifyToken(token)).toBeNull();
  });

  it('refuses to sign and rejects tokens when AUTH_SECRET is missing', () => {
    const env = { ...originalEnv };
    delete env.AUTH_SECRET;
    process.env = env;

    expect(() => signToken({ sub: 'member' })).toThrow('AUTH_SECRET is not configured');
    expect(verifyToken('header.body.signature')).toBeNull();
  });

  it('honours a custom token lifetime', () => {
    process.env.AUTH_SECRET = 'super-secret';

    const token = signToken({ sub: 'admin' }, 8 * 60 * 60);
    const payload = verifyToken(token);

    expect(payload).toMatchObject({ sub: 'admin' });
    expect(Number(payload?.exp) - Number(payload?.iat)).toBe(8 * 60 * 60);
  });

  it('includes issued at and expiration claims in verified payloads', () => {
    process.env.AUTH_SECRET = 'super-secret';

    const token = signToken({ sub: 'member' });
    const payload = verifyToken(token);

    expect(payload).toMatchObject({ sub: 'member' });
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('exp');
    expect(typeof payload?.iat).toBe('number');
    expect(typeof payload?.exp).toBe('number');
  });
});

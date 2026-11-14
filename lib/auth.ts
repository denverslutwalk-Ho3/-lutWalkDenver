import crypto from 'crypto';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return secret;
}

export function signToken(payload: Record<string, unknown>, ttlSeconds = TOKEN_TTL_SECONDS) {
  const authSecret = getAuthSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const body = { ...payload, iat, exp };
  const encoded = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = crypto.createHmac('sha256', authSecret).update(encoded).digest('base64url');

  return `${encoded}.${signature}`;
}

export function verifyToken(token: string) {
  const authSecret = process.env.AUTH_SECRET;

  if (!token || !authSecret) {
    return null;
  }

  try {
    const [encodedHeader, encodedBody, signature] = token.split('.');

    if (!encodedHeader || !encodedBody || !signature) {
      return null;
    }

    const unsigned = `${encodedHeader}.${encodedBody}`;
    const expectedSignature = crypto.createHmac('sha256', authSecret).update(unsigned).digest('base64url');

    const sigBuf = Buffer.from(signature, 'ascii');
    const expBuf = Buffer.from(expectedSignature, 'ascii');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));

    // Reject expired tokens
    if (typeof payload.exp !== 'number' || Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware JWT verification using Web Crypto, compatible with the Edge and
 * Node.js runtimes.
 */

function base64urlDecode(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function verifyTokenEdge(token: string): Promise<Record<string, unknown> | null> {
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedBody, signature] = parts;
    const signatureBytes = base64urlDecode(signature);
    if (base64urlEncode(signatureBytes) !== signature) {
      return null;
    }

    const unsigned = `${encodedHeader}.${encodedBody}`;
    const encoder = new TextEncoder();

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // crypto.subtle.verify is timing-safe by specification
    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      encoder.encode(unsigned),
    );

    if (!isValid) {
      return null;
    }

    const payload: unknown = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedBody)));

    // Validate that the payload is a plain object before indexing into it
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return null;
    }

    const claims = payload as Record<string, unknown>;

    // Reject expired tokens
    if (typeof claims.exp !== 'number' || Math.floor(Date.now() / 1000) > claims.exp) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

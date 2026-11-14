export type EncryptedChatPayload = {
  type: 'aes-gcm';
  iv: string;
  ciphertext: string;
  authTag: string;
};

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function encryptText(plaintext: string, key: CryptoKey): Promise<EncryptedChatPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const ciphertext = new Uint8Array(ciphertextBuffer);

  const tag = ciphertext.slice(-16);
  const body = ciphertext.slice(0, ciphertext.length - 16);

  return {
    type: 'aes-gcm',
    iv: toBase64(iv),
    ciphertext: toBase64(body),
    authTag: toBase64(tag),
  };
}

export async function decryptText(payload: EncryptedChatPayload, key: CryptoKey): Promise<string> {
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const authTag = fromBase64(payload.authTag);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  const plaintextBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  return new TextDecoder().decode(plaintextBuffer);
}

export function importKeyFromBase64(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    fromBase64(base64),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

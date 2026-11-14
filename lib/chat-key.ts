import crypto from 'crypto';

/**
 * All members share one encrypted room, so the room key is derived from the
 * server's AUTH_SECRET and handed only to authenticated members. Messages are
 * stored as ciphertext; the browser encrypts and decrypts them.
 */
export function getChatRoomKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return crypto.createHmac('sha256', secret).update('slutwalk-chat-room-v1').digest('base64');
}

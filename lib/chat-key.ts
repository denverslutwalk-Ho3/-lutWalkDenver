import crypto from 'crypto';

/**
 * The room key is derived from AUTH_SECRET and shared with authenticated
 * members. This encrypts stored messages but is not end-to-end encryption:
 * the server can derive the same key.
 */
export function getChatRoomKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return crypto.createHmac('sha256', secret).update('slutwalk-chat-room-v1').digest('base64');
}

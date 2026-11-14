import { createHmac } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './firebase-admin';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const COLLECTION = 'internal_login_rate_limits';

type LoginRole = 'member' | 'admin';
type RateLimitState = { attempts: number; windowStartedAt: number };

export function evaluateLoginAttempt(
  state: RateLimitState | null,
  now: number,
): { allowed: true; state: RateLimitState } | { allowed: false; retryAfterSeconds: number } {
  if (!state || now - state.windowStartedAt >= WINDOW_MS) {
    return { allowed: true, state: { attempts: 1, windowStartedAt: now } };
  }

  if (state.attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.windowStartedAt + WINDOW_MS - now) / 1000)),
    };
  }

  return { allowed: true, state: { ...state, attempts: state.attempts + 1 } };
}

function getRateLimitDocumentId(request: Request, role: LoginRole) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');

  const forwardedAddresses = request.headers.get('x-forwarded-for')
    ?.split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  const address = forwardedAddresses?.at(-1)
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';

  return createHmac('sha256', secret).update(`${role}\0${address}`).digest('hex');
}

export async function consumeLoginAttempt(
  request: Request,
  role: LoginRole,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(getRateLimitDocumentId(request, role));
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const start = data?.windowStartedAt;
    const state = snapshot.exists
      && typeof data?.attempts === 'number'
      && Number.isSafeInteger(data.attempts)
      && start instanceof Timestamp
      ? { attempts: data.attempts, windowStartedAt: start.toMillis() }
      : null;
    const result = evaluateLoginAttempt(state, now);

    if (result.allowed) {
      transaction.set(ref, {
        attempts: result.state.attempts,
        windowStartedAt: Timestamp.fromMillis(result.state.windowStartedAt),
        expiresAt: Timestamp.fromMillis(result.state.windowStartedAt + WINDOW_MS),
      });
      return result;
    }

    return result;
  });
}

export async function clearLoginAttempts(request: Request, role: LoginRole) {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(getRateLimitDocumentId(request, role));
  await ref.delete();
}

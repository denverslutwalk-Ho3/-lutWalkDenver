import { NextResponse } from 'next/server';

import { signToken } from '../../../../lib/auth';
import { getAdminAuth } from '../../../../lib/firebase-admin';
import { clearLoginAttempts, consumeLoginAttempt } from '../../../../lib/login-rate-limit';
import { memberPasswordVersion } from '../../../../lib/session-version';

// Same-origin API route. Verifies a Firebase Authentication ID token issued by
// one of the configured sign-in methods and mints the same signed member
// session cookie used by the shared-password login. Firebase sign-ins only
// ever receive the member role; administrator access stays on /admin-login.
export async function POST(request: Request) {
  let body: { idToken?: unknown };
  try {
    body = await request.json() as { idToken?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  if (!idToken) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let rateLimit: Awaited<ReturnType<typeof consumeLoginAttempt>>;
  try {
    rateLimit = await consumeLoginAttempt(request, 'member');
  } catch (err) {
    console.error('Firebase sign-in rate limit unavailable:', err);
    return NextResponse.json(
      { ok: false, message: 'Sign-in is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many sign-in attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  let decodedToken;
  try {
    decodedToken = await getAdminAuth().verifyIdToken(idToken, true);
  } catch (err) {
    console.error('Firebase ID token verification failed:', err);
    return NextResponse.json(
      { ok: false, message: 'That sign-in was not valid or has expired. Please try again.' },
      { status: 401 },
    );
  }

  if (!decodedToken.sub) {
    return NextResponse.json(
      { ok: false, message: 'That sign-in was not valid or has expired. Please try again.' },
      { status: 401 },
    );
  }

  try {
    await clearLoginAttempts(request, 'member');
  } catch (err) {
    console.error('Unable to clear member login rate limit:', err);
    return NextResponse.json(
      { ok: false, message: 'Sign-in is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  const token = signToken({ sub: 'member', pv: memberPasswordVersion() });
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: 'sw_auth',
    value: token,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });

  // Keep admin/member sessions isolated: member login clears any admin session.
  response.cookies.set({
    name: 'sw_admin',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}

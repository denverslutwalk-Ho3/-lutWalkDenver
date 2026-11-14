import { NextResponse } from 'next/server';

import { signToken } from '../../../../lib/auth';
import { isMemberLoginConfigured, verifyMemberPassword } from '../../../../lib/passwords';
import { clearLoginAttempts, consumeLoginAttempt } from '../../../../lib/login-rate-limit';
import { memberPasswordVersion } from '../../../../lib/session-version';

// SameSite=Lax on the session cookie already blocks cross-site form/fetch
// POSTs from carrying credentials, so no separate Origin comparison is needed
// here — and an Origin check breaks deployments behind a reverse proxy.
export async function POST(request: Request) {
  if (!isMemberLoginConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Member access is not configured yet. Contact an organizer.' },
      { status: 503 },
    );
  }

  let rateLimit: Awaited<ReturnType<typeof consumeLoginAttempt>>;
  try {
    rateLimit = await consumeLoginAttempt(request, 'member');
  } catch (err) {
    console.error('Member login rate limit unavailable:', err);
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

  let body: { password?: unknown };
  try {
    body = await request.json() as { password?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!verifyMemberPassword(password)) {
    return NextResponse.json({ ok: false, message: 'Incorrect password' }, { status: 401 });
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

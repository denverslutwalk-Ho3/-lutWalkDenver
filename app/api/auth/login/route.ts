import { NextResponse } from 'next/server';

import { signToken } from '../../../../lib/auth';
import { isMemberLoginConfigured, verifyMemberPassword } from '../../../../lib/passwords';

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

  try {
    const body = await request.json() as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';

    if (!verifyMemberPassword(password)) {
      return NextResponse.json({ ok: false, message: 'Incorrect password' }, { status: 401 });
    }

    const token = signToken({ sub: 'member' });
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
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

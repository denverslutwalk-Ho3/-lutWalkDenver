import { NextResponse } from 'next/server';

import { signToken } from '../../../../lib/auth';
import { isAdminLoginConfigured, verifyAdminPassword } from '../../../../lib/passwords';

const ADMIN_TOKEN_MAX_AGE = 60 * 60 * 8; // 8 hours

// See the note in ../login/route.ts: SameSite=Lax is the CSRF control, and an
// Origin comparison does not work behind a reverse proxy.
export async function POST(request: Request) {
  if (!isAdminLoginConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Administrator access is not configured yet.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json() as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ ok: false, message: 'Incorrect password' }, { status: 401 });
    }

    const token = signToken({ sub: 'admin' }, ADMIN_TOKEN_MAX_AGE);
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: 'sw_admin',
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: ADMIN_TOKEN_MAX_AGE,
    });

    // Keep admin/member sessions isolated: admin login clears any member session.
    response.cookies.set({
      name: 'sw_auth',
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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from './lib/auth-edge';
import { passwordVersionEdge } from './lib/session-version-edge';

// Paths that require either a member or admin token
const AUTH_REQUIRED_PATHS = [
  '/ai-chat',
  '/archive',
  '/bulletin',
  '/calendar',
  '/care',
  '/chat',
  '/community',
  '/education',
  '/organizing',
  '/shop',
  '/zines',
];

const ADMIN_PATHS = ['/admin'];

async function tokenHasRole(token: string | undefined, role: 'member' | 'admin') {
  if (!token) return false;
  const claims = await verifyTokenEdge(token);
  if (claims?.sub !== role) return false;
  // Reject sessions issued under a previous password.
  return claims.pv === (await passwordVersionEdge(role));
}

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (next) url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin-only routes: require the sw_admin cookie
  if (ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const adminToken = request.cookies.get('sw_admin')?.value;
    if (!(await tokenHasRole(adminToken, 'admin'))) {
      return redirectTo(request, '/admin-login', pathname);
    }
  }

  // Routes that accept either a member token or an admin token
  if (AUTH_REQUIRED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const memberToken = request.cookies.get('sw_auth')?.value;
    const adminToken = request.cookies.get('sw_admin')?.value;
    const isAuthorized =
      (await tokenHasRole(memberToken, 'member')) ||
      (await tokenHasRole(adminToken, 'admin'));

    if (!isAuthorized) {
      return redirectTo(request, '/login', pathname);
    }
  }

  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/admin/:path*',
    '/ai-chat/:path*',
    '/archive/:path*',
    '/bulletin/:path*',
    '/calendar/:path*',
    '/care/:path*',
    '/chat/:path*',
    '/community/:path*',
    '/education/:path*',
    '/organizing/:path*',
    '/shop/:path*',
    '/zines/:path*',
  ],
};

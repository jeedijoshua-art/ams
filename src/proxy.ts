import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Obsolete /admin routes: Return 404 immediately
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const hasSession =
    request.cookies.has('authjs.session-token') ||
    request.cookies.has('__Secure-authjs.session-token');

  // 2. Protect /bosshere routes (except /bosshere/login)
  if (pathname.startsWith('/bosshere') && !pathname.startsWith('/bosshere/login')) {
    if (!hasSession) {
      const loginUrl = new URL('/bosshere/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Protect /faculty routes
  if (pathname.startsWith('/faculty')) {
    if (!hasSession) {
      const loginUrl = new URL('/sign-in', request.url);
      loginUrl.searchParams.set('role', 'faculty');
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Protect /student routes
  if (pathname.startsWith('/student')) {
    if (!hasSession) {
      const loginUrl = new URL('/sign-in', request.url);
      loginUrl.searchParams.set('role', 'student');
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/bosshere/:path*',
    '/faculty/:path*',
    '/student/:path*',
  ],
};

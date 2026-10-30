import { Auth } from '@auth/core';
import { authConfig } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * AMS Dynamic Multi-Mode Authentication Route Handler
 *
 * Resolves the CSRF Cookie mismatch between Insecure LAN HTTP and Secure HTTPS Tunnels:
 *
 * 1. LAN Mode (HTTP):
 *    - Applies `useSecureCookies: false`
 *    - Uses standard `authjs.*` cookies without `Secure` flag or `__Host-` / `__Secure-` prefixes
 *    - Enables full CSRF protection and Credential-based Faculty/Admin sign-in over LAN IP.
 *
 * 2. HTTPS Tunnel Mode:
 *    - Applies `useSecureCookies: true`
 *    - Uses strict `__Host-` and `__Secure-` cookies with `Secure; SameSite=Lax`
 *    - Powers Student Google OAuth with PKCE verifier, state, and HTTPS callback URLs.
 *
 * 3. Origin Authorization:
 *    - Enforces allowed dev origins (localhost, private LAN subnets, active ngrok tunnel)
 *    - Rejects disallowed external hosts with 403 Forbidden
 *    - Rejects Google OAuth attempts over insecure LAN HTTP with an actionable 400 Bad Request.
 */

export function isAuthorizedHost(host: string): boolean {
  if (!host) return false;

  const hostname = host.split(':')[0].toLowerCase();

  // 1. Loopback origins
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  // 2. Private LAN IPv4 subnets (RFC 1918)
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  // 172.16.0.0/12 (172.16.x - 172.31.x)
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;

  // 3. Configured environment variables (AUTH_URL, NEXT_PUBLIC_APP_URL)
  const configuredAuthUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (configuredAuthUrl) {
    try {
      const configuredHost = new URL(configuredAuthUrl).host.toLowerCase();
      if (host.toLowerCase() === configuredHost || hostname === configuredHost.split(':')[0]) {
        return true;
      }
    } catch {}
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      const configuredHost = new URL(configuredAppUrl).host.toLowerCase();
      if (host.toLowerCase() === configuredHost || hostname === configuredHost.split(':')[0]) {
        return true;
      }
    } catch {}
  }

  // 4. Authorized ngrok tunnel domains
  if (
    hostname.endsWith('.ngrok-free.dev') ||
    hostname.endsWith('.ngrok-free.app') ||
    hostname.endsWith('.ngrok.app') ||
    hostname.endsWith('.ngrok.io')
  ) {
    return true;
  }

  return false;
}

export async function handleAuthRequest(req: NextRequest): Promise<Response> {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const rawHost = forwardedHost || req.headers.get('host') || req.nextUrl.host;
  const isHttps = forwardedProto === 'https' || req.nextUrl.protocol === 'https:';

  // 1. Validate host against authorized origins
  if (!isAuthorizedHost(rawHost)) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED_ORIGIN',
        message: `Origin ${rawHost} is not authorized for AMS authentication.`,
      },
      { status: 403 }
    );
  }

  // 2. Protect against Google OAuth over insecure remote LAN HTTP
  const pathname = req.nextUrl.pathname;
  const isGoogleSigninAction =
    pathname.endsWith('/signin/google') || pathname.endsWith('/callback/google');

  const isLocalhost =
    rawHost.startsWith('localhost') || rawHost.startsWith('127.0.0.1');

  if (isGoogleSigninAction && !isHttps && !isLocalhost) {
    return NextResponse.json(
      {
        error: 'LAN_HTTP_OAUTH_UNSUPPORTED',
        message:
          'Student Google OAuth requires an authorized HTTPS tunnel. To test student Google sign-in across devices, access AMS via your HTTPS tunnel (e.g. https://<tunnel-host>). For LAN HTTP testing, please sign in using Faculty or Administrator credentials.',
      },
      { status: 400 }
    );
  }

  // 3. Construct canonical action URL bound to caller's actual origin
  const protocol = isHttps ? 'https' : 'http';
  const currentOrigin = `${protocol}://${rawHost}`;
  const actionUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, currentOrigin);

  const normalizedReq = new NextRequest(actionUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  // 4. Delegate to Auth.js with origin-appropriate cookie security
  return Auth(normalizedReq, {
    ...authConfig,
    basePath: '/api/auth',
    trustHost: true,
    useSecureCookies: isHttps,
  });
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;

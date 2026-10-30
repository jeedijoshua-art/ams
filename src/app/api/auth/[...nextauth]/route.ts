import { Auth } from '@auth/core';
import { authConfig } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * AMS Dynamic Multi-Mode Authentication Route Handler
 *
 * Resolves the CSRF Cookie mismatch between Local Network (LAN) HTTP and Production HTTPS:
 *
 * 1. Local Network Mode (HTTP):
 *    - Applies `useSecureCookies: false`
 *    - Uses standard `authjs.*` cookies without `Secure` flag or `__Host-` / `__Secure-` prefixes
 *    - Enables full CSRF protection and Credential-based Faculty/Admin sign-in over LAN IP.
 *
 * 2. Production HTTPS Mode:
 *    - Applies `useSecureCookies: true`
 *    - Uses strict `__Host-` and `__Secure-` cookies with `Secure; SameSite=Lax`
 *    - Powers Student Google OAuth with PKCE verifier, state, and HTTPS callback URLs.
 *
 * 3. Origin Authorization:
 *    - Enforces allowed origins (localhost, private RFC 1918 LAN subnets, and configured production hosts)
 *    - Rejects disallowed external hosts with 403 Forbidden
 *    - Rejects Google OAuth attempts over plain LAN HTTP with an actionable 400 Bad Request.
 */

export function isPrivateIPv4(ip: string): boolean {
  const is10 = /^10\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
  const is172 = /^172\.(1[6-9]|2\d|3[01])\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
  const is192 = /^192\.168\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
  return is10 || is172 || is192;
}

export function extractHostname(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname.toLowerCase();
    }
    return new URL(`https://${trimmed}`).hostname.toLowerCase();
  } catch {
    return trimmed.split(':')[0].toLowerCase();
  }
}

export function isAuthorizedHost(host: string): boolean {
  const incoming = extractHostname(host);
  if (!incoming) return false;

  // 1. Loopback origins
  if (incoming === 'localhost' || incoming === '127.0.0.1' || incoming === '::1') return true;

  // 2. Private LAN IPv4 subnets (RFC 1918)
  if (isPrivateIPv4(incoming)) return true;

  // 3. Exact configured application and deployment hostnames
  const candidateUrls = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    'https://ams-five-mu.vercel.app',
  ].filter(Boolean) as string[];

  for (const candidate of candidateUrls) {
    const configuredHostname = extractHostname(candidate);
    if (configuredHostname && incoming === configuredHostname) {
      return true;
    }
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
          'Student Google OAuth requires a secure origin (HTTPS or localhost) per Google OAuth 2.0 specifications. On a plain HTTP local network (LAN), Google OAuth cannot complete. For LAN testing, please sign in using Faculty or Administrator credentials, or access the official HTTPS deployment at https://ams-five-mu.vercel.app.',
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

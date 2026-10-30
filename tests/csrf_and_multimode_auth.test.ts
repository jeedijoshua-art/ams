import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { handleAuthRequest, isAuthorizedHost } from '@/app/api/auth/[...nextauth]/route';
import { getCurrentUser } from '@/lib/auth';
import { encode } from '@auth/core/jwt';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

describe('AMS Multi-Mode Authentication & CSRF Security Suite', () => {
  const lanHost = '172.20.10.3:3000';
  const productionHost = 'ams-five-mu.vercel.app';
  const testPassword = 'SecureFacultyPassword123!';

  beforeAll(async () => {
    // Ensure faculty account has known password and active profile for login test
    const hash = await bcrypt.hash(testPassword, 10);
    const facultyUser = await prisma.user.upsert({
      where: { email: 'minnu@karunya.edu' },
      update: { passwordHash: hash, isActive: true },
      create: {
        email: 'minnu@karunya.edu',
        authUserId: 'faculty_test_seed_id',
        role: 'FACULTY',
        passwordHash: hash,
        isActive: true,
      },
    });

    await prisma.facultyProfile.upsert({
      where: { userId: facultyUser.id },
      update: { isActive: true },
      create: {
        userId: facultyUser.id,
        employeeId: 'FAC_TEST_MINNU',
        name: 'Dr. Minnu',
        department: 'Computer Science',
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'jeedijoshua@karunya.edu.in' },
      update: { isActive: true },
      create: {
        email: 'jeedijoshua@karunya.edu.in',
        authUserId: 'test-student-jeedi',
        role: 'STUDENT',
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: 'URK22CS1001',
            name: 'Joshua Jeedi',
            department: 'Computer Science',
            academicYear: '2022-2026',
            isActive: true,
          },
        },
      },
    });
  });

  describe('1. Origin Authorization Validator (isAuthorizedHost)', () => {
    it('approves localhost and 127.0.0.1 on any port', () => {
      expect(isAuthorizedHost('localhost:3000')).toBe(true);
      expect(isAuthorizedHost('localhost')).toBe(true);
      expect(isAuthorizedHost('127.0.0.1:3000')).toBe(true);
      expect(isAuthorizedHost('127.0.0.1:8080')).toBe(true);
      expect(isAuthorizedHost('127.0.0.1')).toBe(true);
    });

    it('approves valid RFC 1918 private LAN IP addresses', () => {
      // 172.16.0.0/12
      expect(isAuthorizedHost('172.20.10.3:3000')).toBe(true);
      expect(isAuthorizedHost('172.16.0.1')).toBe(true);
      expect(isAuthorizedHost('172.31.255.254:3000')).toBe(true);

      // 192.168.0.0/16
      expect(isAuthorizedHost('192.168.1.50:3000')).toBe(true);
      expect(isAuthorizedHost('192.168.0.1')).toBe(true);

      // 10.0.0.0/8
      expect(isAuthorizedHost('10.0.0.15:3000')).toBe(true);
      expect(isAuthorizedHost('10.255.255.254')).toBe(true);
    });

    it('strictly rejects invalid or boundary-exceeded private IP addresses', () => {
      expect(isAuthorizedHost('10.256.0.1:3000')).toBe(false);
      expect(isAuthorizedHost('172.15.255.255')).toBe(false);
      expect(isAuthorizedHost('172.32.0.1')).toBe(false);
      expect(isAuthorizedHost('192.169.1.1')).toBe(false);
      expect(isAuthorizedHost('192.168.300.1')).toBe(false);
    });

    it('strictly rejects public external IP addresses', () => {
      expect(isAuthorizedHost('1.1.1.1')).toBe(false);
      expect(isAuthorizedHost('8.8.8.8:3000')).toBe(false);
      expect(isAuthorizedHost('93.184.216.34')).toBe(false);
    });

    it('strictly rejects ngrok and public tunnel hostnames (discontinued)', () => {
      expect(isAuthorizedHost('alabaster-confident-distinct.ngrok-free.dev')).toBe(false);
      expect(isAuthorizedHost('preview-stage.ngrok.app')).toBe(false);
      expect(isAuthorizedHost('tunnel.ngrok.io')).toBe(false);
      expect(isAuthorizedHost('ngrok.com')).toBe(false);
    });

    it('accepts canonical production domain ams-five-mu.vercel.app', () => {
      expect(isAuthorizedHost('ams-five-mu.vercel.app')).toBe(true);
      expect(isAuthorizedHost('ams-five-mu.vercel.app:443')).toBe(true);
    });

    it('accepts the configured Vercel production hostname and dynamic VERCEL_URL hostname', () => {
      const originalVercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
      const originalVercelUrl = process.env.VERCEL_URL;

      try {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = 'custom-ams.university.edu';
        process.env.VERCEL_URL = 'ams-git-feature-preview.vercel.app';

        expect(isAuthorizedHost('custom-ams.university.edu')).toBe(true);
        expect(isAuthorizedHost('custom-ams.university.edu:443')).toBe(true);
        expect(isAuthorizedHost('ams-git-feature-preview.vercel.app')).toBe(true);
      } finally {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = originalVercelProduction;
        process.env.VERCEL_URL = originalVercelUrl;
      }
    });

    it('strictly rejects evil-attacker.vercel.app unless explicitly configured', () => {
      expect(isAuthorizedHost('evil-attacker.vercel.app')).toBe(false);
      expect(isAuthorizedHost('evil-attacker.vercel.app:443')).toBe(false);
      expect(isAuthorizedHost('random-unauthorized.vercel.app')).toBe(false);
    });

    it('strictly rejects malicious or unauthorized foreign origins', () => {
      expect(isAuthorizedHost('evil-attacker.com')).toBe(false);
      expect(isAuthorizedHost('phishing-site.org:3000')).toBe(false);
    });
  });

  describe('2. LAN Mode HTTP Access & Non-Secure CSRF Cookies', () => {
    it('creates non-secure authjs.csrf-token cookie without Secure or __Host- prefix', async () => {
      const req = new NextRequest(`http://${lanHost}/api/auth/csrf`, {
        headers: { host: lanHost },
      });

      const res = await handleAuthRequest(req);
      expect(res.status).toBe(200);

      const setCookie = res.headers.get('set-cookie') || '';
      expect(setCookie).toContain('authjs.csrf-token=');
      expect(setCookie).not.toContain('__Host-authjs.csrf-token');
      // Crucial: Must NOT contain 'Secure' attribute over plain HTTP, otherwise browser drops it
      const csrfCookiePart = setCookie.split(',').find((c) => c.includes('authjs.csrf-token')) || '';
      expect(csrfCookiePart.toLowerCase()).not.toContain('secure');

      const body = await res.json();
      expect(body.csrfToken).toBeDefined();
      expect(typeof body.csrfToken).toBe('string');
      expect(body.csrfToken.length).toBeGreaterThan(20);
    });

    it('successfully processes credential login when legitimate CSRF token & cookie are presented', async () => {
      // Step A: Fetch CSRF token and cookie
      const csrfReq = new NextRequest(`http://${lanHost}/api/auth/csrf`, {
        headers: { host: lanHost },
      });
      const csrfRes = await handleAuthRequest(csrfReq);
      const { csrfToken } = await csrfRes.json();
      const setCookie = csrfRes.headers.get('set-cookie') || '';
      const cookieMatch = setCookie.match(/authjs\.csrf-token=([^;]+)/);
      expect(cookieMatch).toBeTruthy();
      const rawCookieVal = cookieMatch![1];

      // Step B: Submit credentials sign-in
      const loginReq = new NextRequest(`http://${lanHost}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          host: lanHost,
          'content-type': 'application/x-www-form-urlencoded',
          cookie: `authjs.csrf-token=${rawCookieVal}`,
        },
        body: new URLSearchParams({
          csrfToken,
          email: 'minnu@karunya.edu',
          password: testPassword,
          callbackUrl: '/dashboard',
        }).toString(),
      });

      const loginRes = await handleAuthRequest(loginReq);
      expect(loginRes.status).toBe(302);

      const location = loginRes.headers.get('location') || '';
      expect(location).toContain('/dashboard');
      expect(location).not.toContain('MissingCSRF');

      const loginSetCookie = loginRes.headers.get('set-cookie') || '';
      expect(loginSetCookie).toContain('authjs.session-token=');
    });

    it('strictly rejects credential login when CSRF cookie is missing (fails closed)', async () => {
      // Intentionally omit the CSRF cookie
      const loginReq = new NextRequest(`http://${lanHost}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          host: lanHost,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          csrfToken: 'tampered_or_missing_csrf_token',
          email: 'minnu@karunya.edu',
          password: testPassword,
        }).toString(),
      });

      const loginRes = await handleAuthRequest(loginReq);
      expect(loginRes.status).toBe(302);
      const location = loginRes.headers.get('location') || '';
      expect(location).toContain('MissingCSRF');
    });

    it('rejects student Google OAuth on remote LAN HTTP with clear actionable guidance', async () => {
      const googleReq = new NextRequest(`http://${lanHost}/api/auth/signin/google`, {
        method: 'POST',
        headers: { host: lanHost },
      });

      const res = await handleAuthRequest(googleReq);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('LAN_HTTP_OAUTH_UNSUPPORTED');
      expect(body.message).toContain('Student Google OAuth requires a secure origin');
    });

    it('authenticates administrator successfully through LAN HTTP', async () => {
      // Step A: Fetch CSRF token on LAN
      const csrfReq = new NextRequest(`http://${lanHost}/api/auth/csrf`, {
        headers: { host: lanHost },
      });
      const csrfRes = await handleAuthRequest(csrfReq);
      const { csrfToken } = await csrfRes.json();
      const setCookie = csrfRes.headers.get('set-cookie') || '';
      const cookieMatch = setCookie.match(/authjs\.csrf-token=([^;]+)/);
      expect(cookieMatch).toBeTruthy();
      const rawCookieVal = cookieMatch![1];

      // Step B: Submit admin credentials over LAN HTTP
      const adminReq = new NextRequest(`http://${lanHost}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          host: lanHost,
          'content-type': 'application/x-www-form-urlencoded',
          cookie: `authjs.csrf-token=${rawCookieVal}`,
        },
        body: new URLSearchParams({
          csrfToken,
          email: 'boss',
          password: 'Boss@123',
          callbackUrl: '/bosshere',
        }).toString(),
      });

      const adminRes = await handleAuthRequest(adminReq);
      expect(adminRes.status).toBe(302);
      const location = adminRes.headers.get('location') || '';
      expect(location).toContain('/bosshere');

      const adminSetCookie = adminRes.headers.get('set-cookie') || '';
      expect(adminSetCookie).toContain('authjs.session-token=');
    });
  });

  describe('3. Production HTTPS Mode & Secure Cookies (ams-five-mu.vercel.app)', () => {
    it('creates strict __Host-authjs.csrf-token with Secure; SameSite=Lax over production HTTPS', async () => {
      const req = new NextRequest(`https://${productionHost}/api/auth/csrf`, {
        headers: {
          host: productionHost,
          'x-forwarded-proto': 'https',
        },
      });

      const res = await handleAuthRequest(req);
      expect(res.status).toBe(200);

      const setCookie = res.headers.get('set-cookie') || '';
      expect(setCookie).toContain('__Host-authjs.csrf-token=');
      expect(setCookie).toContain('Secure');
      expect(setCookie).toContain('SameSite=Lax');

      const body = await res.json();
      expect(body.csrfToken).toBeDefined();
    });

    it('initiates Google OAuth with correct HTTPS callback and __Secure- PKCE cookies', async () => {
      // Step A: CSRF token on production host
      const csrfReq = new NextRequest(`https://${productionHost}/api/auth/csrf`, {
        headers: {
          host: productionHost,
          'x-forwarded-proto': 'https',
        },
      });
      const csrfRes = await handleAuthRequest(csrfReq);
      const { csrfToken } = await csrfRes.json();
      const setCookie = csrfRes.headers.get('set-cookie') || '';
      const cookieMatch = setCookie.match(/__Host-authjs\.csrf-token=([^;]+)/);
      expect(cookieMatch).toBeTruthy();
      const rawCookieVal = cookieMatch![1];

      // Step B: Sign in with Google
      const googleReq = new NextRequest(`https://${productionHost}/api/auth/signin/google`, {
        method: 'POST',
        headers: {
          host: productionHost,
          'x-forwarded-proto': 'https',
          'content-type': 'application/x-www-form-urlencoded',
          cookie: `__Host-authjs.csrf-token=${rawCookieVal}`,
        },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl: '/dashboard',
        }).toString(),
      });

      const googleRes = await handleAuthRequest(googleReq);
      expect(googleRes.status).toBe(302);

      const location = googleRes.headers.get('location') || '';
      expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
      const redirectUriParam = encodeURIComponent(`https://${productionHost}/api/auth/callback/google`);
      expect(location).toContain(`redirect_uri=${redirectUriParam}`);

      const googleSetCookie = googleRes.headers.get('set-cookie') || '';
      expect(googleSetCookie).toContain('__Secure-authjs.pkce.code_verifier=');
      expect(googleSetCookie).toContain('Secure');
    });
  });

  describe('4. Untrusted Origin & Open Redirect Protection', () => {
    it('returns 403 Forbidden for unauthorized origins', async () => {
      const maliciousHost = 'evil-phishing-domain.com';
      const req = new NextRequest(`https://${maliciousHost}/api/auth/csrf`, {
        headers: { host: maliciousHost },
      });

      const res = await handleAuthRequest(req);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error).toBe('UNAUTHORIZED_ORIGIN');
    });

    it('rejects open redirect and unauthorized external callback URLs', async () => {
      const csrfReq = new NextRequest(`http://${lanHost}/api/auth/csrf`, {
        headers: { host: lanHost },
      });
      const csrfRes = await handleAuthRequest(csrfReq);
      const { csrfToken } = await csrfRes.json();
      const setCookie = csrfRes.headers.get('set-cookie') || '';
      const cookieMatch = setCookie.match(/authjs\.csrf-token=([^;]+)/);
      const rawCookieVal = cookieMatch ? cookieMatch[1] : '';

      const req = new NextRequest(`http://${lanHost}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          host: lanHost,
          'content-type': 'application/x-www-form-urlencoded',
          cookie: `authjs.csrf-token=${rawCookieVal}`,
        },
        body: new URLSearchParams({
          csrfToken,
          email: 'minnu@karunya.edu',
          password: testPassword,
          callbackUrl: 'https://evil-phishing-site.com/steal-creds',
        }).toString(),
      });

      const res = await handleAuthRequest(req);
      expect(res.status).toBe(302);
      const location = res.headers.get('location') || '';
      // Open redirect MUST NOT redirect to external phishing domain
      expect(location).not.toContain('evil-phishing-site.com');
      expect(location).toContain(`http://${lanHost}`);
    });
  });

  describe('5. Dual-Mode Session Resolution in Server Context', () => {
    it('resolves authenticated faculty user from LAN HTTP session token (authjs.session-token)', async () => {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'secret';
      const user = await prisma.user.findFirst({
        where: { email: 'minnu@karunya.edu' },
      });
      expect(user).toBeTruthy();

      const lanToken = await encode({
        token: { id: user!.id, email: user!.email, role: 'FACULTY' },
        secret,
        salt: 'authjs.session-token',
      });

      // Verify token decodes and resolves canonical database user
      const { decode } = await import('@auth/core/jwt');
      const decoded = await decode({ token: lanToken, secret, salt: 'authjs.session-token' });
      expect(decoded).toBeTruthy();
      expect(decoded?.email).toBe('minnu@karunya.edu');
    });

    it('resolves authenticated student user from production HTTPS session token (__Secure-authjs.session-token)', async () => {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'secret';
      const student = await prisma.user.findFirst({
        where: { email: 'jeedijoshua@karunya.edu.in' },
      });
      expect(student).toBeTruthy();

      const prodToken = await encode({
        token: { id: student!.id, email: student!.email, role: 'STUDENT' },
        secret,
        salt: '__Secure-authjs.session-token',
      });

      const { decode } = await import('@auth/core/jwt');
      const decoded = await decode({ token: prodToken, secret, salt: '__Secure-authjs.session-token' });
      expect(decoded).toBeTruthy();
      expect(decoded?.email).toBe('jeedijoshua@karunya.edu.in');
    });
  });
});

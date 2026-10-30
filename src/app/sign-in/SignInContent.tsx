'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  GraduationCap,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export default function SignInContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'faculty' ? 'faculty' : 'student';
  const urlError = searchParams.get('error');

  const [activeTab, setActiveTab] = useState<'student' | 'faculty'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect insecure LAN HTTP (Google OAuth unavailable)
  const [isLanHttp, setIsLanHttp] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLanHttp(
        window.location.protocol === 'http:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      );
    }
  }, []);

  useEffect(() => {
    if (urlError === 'OAuthCallbackError' || urlError === 'OAuthSignin') {
      setError('Google sign-in was interrupted or not configured. Please contact the administrator.');
    } else if (urlError === 'MissingCSRF') {
      setError('Security verification failed (Missing CSRF / Origin Mismatch). Please refresh the page and verify browser cookies are enabled.');
    } else if (urlError) {
      setError('Authentication failed. Please verify your institutional status.');
    }
  }, [urlError]);

  const handleStudentGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      // Direct detection of insecure LAN HTTP
      const isLanHttp =
        typeof window !== 'undefined' &&
        window.location.protocol === 'http:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

      if (isLanHttp) {
        setError(
          'Student Google OAuth requires an authorized HTTPS origin per Google security rules. On a local network (LAN) HTTP connection, please sign in using Faculty or Administrator credentials, or access the official HTTPS deployment at https://ams-five-mu.vercel.app.'
        );
        setLoading(false);
        return;
      }

      const res = await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: false,
      });

      if (res?.error) {
        if (res.error === 'LAN_HTTP_OAUTH_UNSUPPORTED') {
          setError(
            'Student Google OAuth requires an authorized HTTPS origin per Google security rules. On a local network (LAN) HTTP connection, please sign in using Faculty or Administrator credentials, or access the official HTTPS deployment at https://ams-five-mu.vercel.app.'
          );
        } else if (res.error === 'MissingCSRF') {
          setError(
            'Security verification failed (Missing CSRF). Please refresh the page and verify browser cookies are enabled.'
          );
        } else if (res.error === 'OAuthSignin' || res.error === 'OAuthCallbackError') {
          setError('Google OAuth initialization failed. Check authorized redirect URIs in Google Cloud Console.');
        } else {
          setError(`Google sign-in error: ${res.error}`);
        }
        setLoading(false);
      } else if (res?.url) {
        // Guard against origin mismatch when testing on LAN IP
        const isExternalDevice =
          typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1';

        if (isExternalDevice && res.url.includes('redirect_uri=http%3A%2F%2Flocalhost')) {
          setError(
            'Origin Mismatch: Google OAuth requires an authorized HTTPS origin. For student Google login, access the official HTTPS deployment at https://ams-five-mu.vercel.app. (For local network demonstration, use Faculty or Administrator credentials).'
          );
          setLoading(false);
          return;
        }

        // Valid destination: proceed to Google OAuth consent
        window.location.href = res.url;
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to initiate Google sign-in. Please try again.');
      setLoading(false);
    }
  };

  const handleFacultyCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === 'MissingCSRF') {
          setError('Security verification failed (Missing CSRF). Please refresh the page and verify browser cookies are enabled.');
        } else if (res.error.includes('throttled') || res.error.includes('Too many failed')) {
          setError('Too many failed login attempts. Account temporarily throttled for 5 minutes.');
        } else {
          setError('Invalid email or password. Please verify your credentials.');
        }
        setLoading(false);
      } else {
        // Hard navigation guarantees fresh session cookie is sent on server render across tabs
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleStudentCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === 'MissingCSRF') {
          setError('Security verification failed (Missing CSRF). Please refresh the page and verify browser cookies are enabled.');
        } else if (res.error.includes('throttled') || res.error.includes('Too many failed')) {
          setError('Too many failed login attempts. Account temporarily throttled for 5 minutes.');
        } else {
          setError('Invalid student email or password. Please verify your credentials with your administrator.');
        }
        setLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col items-center justify-center p-4 relative selection:bg-[#C6F36B]/30">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C6F36B]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#A0A89F] hover:text-[#F1F3ED] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal Home
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#171B18] border border-[#303831] text-[#C6F36B]">
          Karunya AMS Portal
        </span>
      </div>

      {/* Main Login Card */}
      <div className="z-10 w-full max-w-md">
        <div className="p-6 rounded-xl bg-[#171B18] border border-[#303831] shadow-2xl backdrop-blur-md">
          {/* Tab Selection */}
          <div className="grid grid-cols-2 p-1 bg-[#202622] rounded-lg border border-[#303831] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setError(null);
                setEmail('');
                setPassword('');
              }}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'student'
                  ? 'bg-[#C6F36B] text-[#101211] font-bold shadow-md shadow-[#C6F36B]/20'
                  : 'text-[#A0A89F] hover:text-[#F1F3ED]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('faculty');
                setError(null);
                setEmail('');
                setPassword('');
              }}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'faculty'
                  ? 'bg-[#C6F36B] text-[#101211] font-bold shadow-md shadow-[#C6F36B]/20'
                  : 'text-[#A0A89F] hover:text-[#F1F3ED]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Faculty Portal
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-[#FF7777]/10 border border-[#FF7777]/20 text-[#FF7777] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Login Flow */}
          {activeTab === 'student' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#C6F36B]/5 border border-[#C6F36B]/15 text-xs text-[#A0A89F] leading-relaxed">
                <div className="font-semibold text-[#C6F36B] mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Admin-Provisioned Student Credentials
                </div>
                Sign in using your institutional email or Roll Number with the password issued by your institution administrator.
              </div>

              {/* Student Credentials Form (LAN & General Access) */}
              <form onSubmit={handleStudentCredentialsLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                    Student Email or Roll Number
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@karunya.edu.in or URK25CS1140"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#202622] border border-[#303831] text-sm text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] focus:ring-1 focus:ring-[#C6F36B]/20 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#202622] border border-[#303831] text-sm text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] focus:ring-1 focus:ring-[#C6F36B]/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#C6F36B] hover:bg-[#D4FF83] active:bg-[#b5e855] disabled:opacity-50 text-[#101211] font-bold text-sm transition-all shadow-lg shadow-[#C6F36B]/20 flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#101211]" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in to Student Portal'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-[#303831] w-full" />
                <span className="bg-[#171B18] px-3 text-[10px] uppercase tracking-wider text-[#A0A89F] font-semibold absolute">
                  Or Sign In via Google
                </span>
              </div>

              {/* Google OAuth Section */}
              {isLanHttp ? (
                <div className="p-3 rounded-lg bg-[#202622] border border-[#303831] text-[11px] text-[#A0A89F] leading-relaxed">
                  <div className="text-[#F0BC65] font-semibold mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Google Login Disabled on Local Wi-Fi (HTTP)
                  </div>
                  Google OAuth 2.0 requires an authorized HTTPS origin. On plain HTTP local networks, use your assigned Student credentials above. For Google Sign-In, visit the official HTTPS production URL at{' '}
                  <a
                    href="https://ams-five-mu.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C6F36B] underline hover:text-[#D4FF83]"
                  >
                    ams-five-mu.vercel.app
                  </a>
                  .
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStudentGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#202622] hover:bg-[#252D27] active:bg-[#171B18] border border-[#303831] hover:border-[#424D43] text-[#F1F3ED] font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 select-none cursor-pointer touch-manipulation"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
                      Connecting to Google...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2.5 pointer-events-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Student Login with Google
                    </span>
                  )}
                </button>
              )}

              <div className="pt-2 text-center">
                <p className="text-[11px] text-[#A0A89F]/70">
                  Not enrolled yet? Contact your Academic Administrator for credentials.
                </p>
              </div>
            </div>
          ) : (
            /* Faculty Login Flow */
            <form onSubmit={handleFacultyCredentialsLogin} className="space-y-4">
              <div className="p-4 rounded-lg bg-[#C6F36B]/5 border border-[#C6F36B]/15 text-xs text-[#A0A89F] leading-relaxed">
                <div className="font-semibold text-[#C6F36B] mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Admin-Provisioned Credentials
                </div>
                Faculty sign in using credentials issued by the institution administrator.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                  Faculty Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@karunya.edu"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#202622] border border-[#303831] text-sm text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] focus:ring-1 focus:ring-[#C6F36B]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#202622] border border-[#303831] text-sm text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] focus:ring-1 focus:ring-[#C6F36B]/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#C6F36B] hover:bg-[#D4FF83] active:bg-[#b5e855] disabled:opacity-50 text-[#101211] font-bold text-sm transition-all shadow-lg shadow-[#C6F36B]/20 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#101211]" />
                    Signing in...
                  </>
                ) : (
                  'Sign in to Faculty Portal'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Lock, ArrowLeft, AlertCircle, Loader2, ShieldCheck, KeyRound } from 'lucide-react';

export default function BossLoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: identifier.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: '/bosshere',
      });

      if (!res?.ok || res?.error) {
        if (res?.error === 'MissingCSRF') {
          setError('Security verification failed (Missing CSRF). Please refresh the page and verify browser cookies are enabled.');
        } else if (res?.error?.includes('throttled') || res?.error?.includes('Too many failed')) {
          setError('Too many failed login attempts. Throttled for 5 minutes.');
        } else if (res?.error?.includes('UNAUTHORIZED_ORIGIN')) {
          setError('Origin verification failed: The current domain is not authorized for authentication.');
        } else {
          setError('Invalid administrator credentials.');
        }
        setLoading(false);
        return;
      }

      // Hard navigation guarantees fresh session cookie is sent on server render across tabs
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/bosshere';
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101211] flex flex-col items-center justify-center p-4 relative text-[#F1F3ED] selection:bg-[#C6F36B]/30">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C6F36B]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#A0A89F] hover:text-[#F1F3ED] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Public Home
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#171B18] border border-[#303831] text-[#C6F36B] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Boss Control Center
        </span>
      </div>

      {/* Admin Title Card */}
      <div className="w-full max-w-md mb-6 p-6 rounded-xl bg-[#171B18] border border-[#303831] shadow-2xl backdrop-blur-md z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#C6F36B]/10 border border-[#C6F36B]/20 flex items-center justify-center text-[#C6F36B]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F1F3ED]">System Administration</h1>
            <p className="text-xs text-[#A0A89F]">Academic Coordinators & System Administrators</p>
          </div>
        </div>

        <p className="text-xs text-[#A0A89F] leading-relaxed border-t border-[#303831] pt-3">
          Sign in with administrator credentials. Sessions, roles, and administrative rights are cryptographically verified server-side on every request.
        </p>
      </div>

      {/* Credentials Login Form */}
      <div className="z-10 w-full max-w-md">
        <div className="p-6 rounded-xl bg-[#171B18] border border-[#303831] shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/20 text-[#FF7777] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                Username or Administrator Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. boss or admin email"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-sm text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] transition-all font-mono"
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
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-sm text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B] transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] active:bg-[#b5e855] disabled:opacity-50 text-[#101211] font-bold text-sm transition-all shadow-lg shadow-[#C6F36B]/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#101211]" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Authenticate as Administrator
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#303831] text-center">
            <p className="text-[11px] text-[#A0A89F]/70">
              Demo Access: <code className="text-[#C6F36B] font-mono">boss</code> / <code className="text-[#C6F36B] font-mono">Boss@123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

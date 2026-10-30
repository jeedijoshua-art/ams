'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { RoleBadge } from './RoleBadge';
import { signOut, useSession } from 'next-auth/react';
import {
  QrCode,
  LogOut,
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  BarChart3,
  ChevronRight,
  Menu,
  X,
  Loader2,
} from 'lucide-react';

export function Navbar({ currentUser: propUser }: { currentUser?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Authoritative identity resolution: Server prop first, then client session
  const currentUser =
    propUser ||
    (session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: (session.user as any).role || 'STUDENT',
          studentProfile: (session.user as any).studentProfile,
          facultyProfile: (session.user as any).facultyProfile,
        }
      : null);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (err) {
      console.error('Sign out error:', err);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/sign-in';
    if (currentUser.role === 'ADMIN') return '/bosshere';
    if (currentUser.role === 'FACULTY') return '/faculty';
    return '/student';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#303831] bg-[#101211]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#C6F36B] flex items-center justify-center text-[#101211] font-black shadow-md shadow-[#C6F36B]/15 group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4 text-[#101211]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-[#F1F3ED]">AMS</span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#202622] text-[#C6F36B] border border-[#303831]">
                  v2.5
                </span>
              </div>
              <p className="text-[11px] text-[#A0A89F] font-medium hidden sm:block">
                Karunya Academic Portal
              </p>
            </div>
          </Link>

          {/* Navigation Links (when authenticated) */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-[#303831]">
              <Link
                href={getDashboardLink()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname.startsWith('/bosshere') ||
                  pathname.startsWith('/faculty') ||
                  pathname.startsWith('/student')
                    ? 'bg-[#202622] text-[#C6F36B] border border-[#303831]'
                    : 'text-[#A0A89F] hover:text-[#F1F3ED] hover:bg-[#171B18]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Workspace
              </Link>

              <Link
                href="/reports"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === '/reports'
                    ? 'bg-[#202622] text-[#C6F36B] border border-[#303831]'
                    : 'text-[#A0A89F] hover:text-[#F1F3ED] hover:bg-[#171B18]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Reports
              </Link>
            </nav>
          )}
        </div>

        {/* Right Section: Auth State or Dual Login Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-[#F1F3ED]">
                  {currentUser.studentProfile?.name ||
                    currentUser.facultyProfile?.name ||
                    'Administrator'}
                </p>
                <p className="font-mono text-[10px] text-[#A0A89F]">
                  {currentUser.studentProfile?.rollNumber ||
                    currentUser.facultyProfile?.employeeId ||
                    currentUser.email}
                </p>
              </div>
              <RoleBadge role={currentUser.role} />
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="p-2 rounded-xl bg-[#171B18] hover:bg-[#202622] text-[#A0A89F] hover:text-[#FF7777] border border-[#303831] transition-colors"
                title="Sign out of portal"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/sign-in?role=faculty"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-xs font-semibold text-[#A0A89F] hover:text-[#F1F3ED] transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#A0A89F]" />
                Faculty Portal
              </Link>
              <Link
                href="/sign-in?role=student"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] text-xs font-bold transition-all shadow-md shadow-[#C6F36B]/15 uppercase tracking-wide"
              >
                <GraduationCap className="w-4 h-4 text-[#101211]" />
                Student Login
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 rounded-lg bg-[#171B18] border border-[#303831] text-[#A0A89F]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5 text-[#F1F3ED]" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-[#303831] bg-[#101211] p-4 space-y-3">
          {currentUser ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#171B18] border border-[#303831] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#F1F3ED]">
                    {currentUser.studentProfile?.name ||
                      currentUser.facultyProfile?.name ||
                      'Administrator'}
                  </p>
                  <p className="font-mono text-[10px] text-[#A0A89F]">{currentUser.email}</p>
                </div>
                <RoleBadge role={currentUser.role} />
              </div>

              <Link
                href={getDashboardLink()}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#171B18] text-xs font-semibold text-[#F1F3ED]"
              >
                <span>Workspace</span>
                <ChevronRight className="w-4 h-4 text-[#A0A89F]" />
              </Link>

              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#FF7777]/10 border border-[#FF7777]/20 text-xs font-semibold text-[#FF7777]"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/sign-in?role=student"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#C6F36B] text-[#101211] font-bold text-xs uppercase"
              >
                <GraduationCap className="w-4 h-4" />
                Student Login (Google SSO)
              </Link>
              <Link
                href="/sign-in?role=faculty"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#171B18] border border-[#303831] text-[#F1F3ED] font-semibold text-xs"
              >
                <BookOpen className="w-4 h-4 text-[#A0A89F]" />
                Faculty Portal
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

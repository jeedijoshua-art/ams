'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { RoleBadge } from './RoleBadge';
import {
  QrCode,
  LogOut,
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export function Navbar({ currentUser }: { currentUser?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      // If Clerk is available on window, sign out of Clerk as well
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        await (window as any).Clerk.signOut();
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/sign-in';
    if (currentUser.role === 'ADMIN') return '/admin';
    if (currentUser.role === 'FACULTY') return '/faculty';
    return '/student';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">AMS</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Institutional
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Karunya Smart Attendance Portal
              </p>
            </div>
          </Link>

          {/* Navigation Links (when authenticated) */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-800">
              <Link
                href={getDashboardLink()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname.startsWith('/admin') ||
                  pathname.startsWith('/faculty') ||
                  pathname.startsWith('/student')
                    ? 'bg-slate-800 text-teal-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>
              <Link
                href="/reports"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === '/reports'
                    ? 'bg-slate-800 text-teal-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Reports & Analytics
              </Link>
            </nav>
          )}
        </div>

        {/* Right Section: Auth State or Dual Login Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-white">
                  {currentUser.studentProfile?.name ||
                    currentUser.facultyProfile?.name ||
                    'Administrator'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {currentUser.studentProfile?.rollNumber ||
                    currentUser.facultyProfile?.employeeId ||
                    currentUser.email}
                </p>
              </div>
              <RoleBadge role={currentUser.role} />
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="ml-2 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                title="Sign out of portal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/sign-in?role=faculty"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Faculty Login
              </Link>
              <Link
                href="/sign-in?role=student"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/20"
              >
                <GraduationCap className="w-4 h-4 text-slate-950" />
                Student Login (Google)
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-800 bg-slate-950 p-4 space-y-3">
          {currentUser ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">
                    {currentUser.studentProfile?.name ||
                      currentUser.facultyProfile?.name ||
                      'Administrator'}
                  </p>
                  <p className="text-[10px] text-slate-400">{currentUser.email}</p>
                </div>
                <RoleBadge role={currentUser.role} />
              </div>

              <Link
                href={getDashboardLink()}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 text-xs font-semibold text-white"
              >
                <span>Dashboard</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/sign-in?role=student"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
              >
                <GraduationCap className="w-4 h-4" />
                Student Login (Google SSO)
              </Link>
              <Link
                href="/sign-in?role=faculty"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-xs"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Faculty Login
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

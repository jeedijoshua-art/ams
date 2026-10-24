'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { RoleBadge } from './RoleBadge';
import {
  QrCode,
  UserCheck,
  ChevronDown,
  LogOut,
  Sparkles,
  Layers,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

interface DevUser {
  id: string;
  email: string;
  role: string;
  name: string;
  detail: string;
}

export function Navbar({ currentUser }: { currentUser?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<DevUser[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    // Fetch available test accounts for quick persona switching
    fetch('/api/auth/dev-switch')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          const mapped = data.users.map((u: any) => ({
            id: u.id,
            email: u.email,
            role: u.role,
            name: u.studentProfile?.name || u.facultyProfile?.name || 'Administrator',
            detail:
              u.studentProfile?.rollNumber ||
              u.facultyProfile?.employeeId ||
              'System Admin',
          }));
          setUsers(mapped);
        }
      })
      .catch((err) => console.error('Failed to load dev users', err));
  }, []);

  const handleSwitchUser = async (userId: string, role: string) => {
    setIsSwitching(true);
    setDropdownOpen(false);
    try {
      const res = await fetch('/api/auth/dev-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        // Redirect to appropriate dashboard based on chosen role
        let target = '/dashboard';
        if (role === 'ADMIN') target = '/admin';
        else if (role === 'FACULTY') target = '/faculty';
        else if (role === 'STUDENT') target = '/student';

        router.push(target);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwitching(false);
    }
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/';
    if (currentUser.role === 'ADMIN') return '/admin';
    if (currentUser.role === 'FACULTY') return '/faculty';
    return '/student';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                AMS
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  v1.0
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Smart Attendance Portal</p>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href={getDashboardLink()}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/admin') ||
                pathname.startsWith('/faculty') ||
                pathname.startsWith('/student')
                  ? 'bg-slate-800 text-teal-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/reports"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/reports'
                  ? 'bg-slate-800 text-teal-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Analytics
            </Link>
          </nav>
        </div>

        {/* Right Section: Persona Switcher & Current User */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Persona Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all shadow-sm"
              title="Switch demo persona (Admin, Faculty, Student)"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Demo Persona:</span>
              <span className="font-bold text-white">
                {currentUser?.studentProfile?.name ||
                  currentUser?.facultyProfile?.name ||
                  (currentUser?.role === 'ADMIN' ? 'Admin' : 'Select')}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Instant Persona Switcher
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Test role-based access with seeded accounts
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 py-1">
                  {users.map((u) => {
                    const isCurrent = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        disabled={isSwitching}
                        onClick={() => handleSwitchUser(u.id, u.role)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isCurrent
                            ? 'bg-teal-500/15 border border-teal-500/30 text-white'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{u.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {u.detail} • {u.email}
                          </p>
                        </div>
                        <RoleBadge role={u.role} className="scale-90" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-semibold text-white">
                  {currentUser.studentProfile?.name ||
                    currentUser.facultyProfile?.name ||
                    'Administrator'}
                </p>
                <p className="text-[10px] text-slate-400">{currentUser.email}</p>
              </div>
              <RoleBadge role={currentUser.role} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

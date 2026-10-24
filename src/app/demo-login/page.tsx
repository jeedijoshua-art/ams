'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, School, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

function DemoLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch('/api/auth/dev-switch')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);

        // If a specific role was requested in URL query, auto-switch to first user with that role
        if (roleParam && data.users) {
          const targetUser = data.users.find((u: any) => u.role === roleParam.toUpperCase());
          if (targetUser) {
            handleLogin(targetUser.id, targetUser.role);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [roleParam]);

  const handleLogin = async (userId: string, role: string) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/dev-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        if (role === 'ADMIN') router.push('/admin');
        else if (role === 'FACULTY') router.push('/faculty');
        else router.push('/student');
      }
    } catch (err) {
      console.error(err);
      setSwitching(false);
    }
  };

  if (loading || switching) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400 mb-3" />
        <p className="text-sm font-semibold text-slate-300">
          {switching ? 'Authenticating & Initializing Role Session...' : 'Loading Demo Personas...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block text-2xl font-black text-white tracking-tight">
            AMS <span className="text-teal-400">Portal</span>
          </Link>
          <h2 className="text-xl font-bold mt-2">Select Demo Persona</h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose any seeded persona below to inspect their role-tailored interface.
          </p>
        </div>

        <div className="space-y-3">
          {users.map((u) => {
            const role = u.role;
            const name = u.studentProfile?.name || u.facultyProfile?.name || 'Administrator';
            const detail =
              u.studentProfile?.rollNumber ||
              u.facultyProfile?.employeeId ||
              'Full System Privileges';

            const Icon =
              role === 'ADMIN' ? Shield : role === 'FACULTY' ? School : GraduationCap;
            const colorClass =
              role === 'ADMIN'
                ? 'border-amber-500/30 hover:border-amber-500/60 text-amber-400'
                : role === 'FACULTY'
                ? 'border-teal-500/30 hover:border-teal-500/60 text-teal-400'
                : 'border-indigo-500/30 hover:border-indigo-500/60 text-indigo-400';

            return (
              <button
                key={u.id}
                onClick={() => handleLogin(u.id, u.role)}
                className={`w-full p-4 rounded-xl bg-slate-900 border text-left flex items-center justify-between transition-all group ${colorClass}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-800">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                      {name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {detail} • <span className="font-mono text-[11px]">{role}</span>
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-white transition-all" />
              </button>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
            ← Return to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DemoLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      }
    >
      <DemoLoginContent />
    </Suspense>
  );
}

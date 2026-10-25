import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, isClerkConfigured } from '@/lib/auth';
import { Role } from '@prisma/client';
import { SignIn } from '@clerk/nextjs';
import { ShieldCheck, Lock, Terminal, ArrowLeft, AlertCircle } from 'lucide-react';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && currentUser.role === Role.ADMIN) {
    redirect('/admin');
  }

  const clerkEnabled = isClerkConfigured();

  // In development, retrieve provisioned admin accounts for testing
  let devAdminUsers: any[] = [];
  if (process.env.NODE_ENV !== 'production') {
    devAdminUsers = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true, email: true, isActive: true },
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Public Home
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
          Restricted Zone
        </span>
      </div>

      {/* Admin Title Card */}
      <div className="w-full max-w-md mb-6 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">System Administration</h1>
            <p className="text-xs text-slate-400">Authorized personnel & academic coordinators only</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
          This portal manages institutional student rosters, faculty assignments, system settings,
          and attendance audits. Authorization is strictly verified server-side on every request.
        </p>
      </div>

      {/* Clerk Login or Dev Login */}
      <div className="z-10 w-full max-w-md flex flex-col items-center">
        {clerkEnabled ? (
          <SignIn
            routing="path"
            path="/admin/login"
            fallbackRedirectUrl="/admin"
            appearance={{
              elements: {
                card: 'bg-slate-900/95 border border-slate-800 shadow-2xl rounded-2xl text-slate-100 backdrop-blur-md',
                headerTitle: 'text-white text-xl font-bold',
                headerSubtitle: 'text-slate-400 text-xs',
                formButtonPrimary:
                  'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20',
                formFieldInput:
                  'bg-slate-950 border-slate-800 text-white focus:border-amber-500 focus:ring-amber-500/20',
                footerActionLink: 'text-amber-400 hover:text-amber-300 font-semibold',
              },
            }}
          />
        ) : (
          <div className="w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl text-center">
            <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Development Admin Access</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select a provisioned administrator account to authenticate for local testing:
            </p>

            <div className="space-y-2 text-left">
              {devAdminUsers.map((admin) => (
                <Link
                  key={admin.id}
                  href={`/demo-login?role=ADMIN`}
                  className="block p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold text-white transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>{admin.email}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                      ADMIN
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-left text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-mono text-amber-400 font-semibold mb-1">
                <Terminal className="w-3.5 h-3.5" />
                Initial Admin Bootstrap:
              </div>
              <code className="block bg-slate-900 p-2 rounded text-slate-300 font-mono overflow-x-auto text-[10px]">
                npm run admin:bootstrap -- --email=admin@karunya.edu
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

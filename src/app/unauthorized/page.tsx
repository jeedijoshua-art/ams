import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 shadow-xl">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-black tracking-tight text-white">Access Denied</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        You do not have the necessary role permissions to access this administrative or faculty resource.
        All security checks are verified server-side.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          Home
        </Link>
        <Link
          href="/demo-login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-sm font-bold hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
        >
          Switch Persona
        </Link>
      </div>
    </div>
  );
}

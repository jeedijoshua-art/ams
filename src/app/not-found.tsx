import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 mb-6 shadow-xl">
        <FileQuestion className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-black tracking-tight text-white">404 — Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        The page or resource you are looking for does not exist or has been moved.
      </p>

      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 text-sm font-bold hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
        >
          <Home className="w-4 h-4" />
          Back to Safety
        </Link>
      </div>
    </div>
  );
}

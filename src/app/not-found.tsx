import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-xl bg-[#171B18] border border-[#303831] flex items-center justify-center text-[#C6F36B] mb-6 shadow-sm">
        <FileQuestion className="w-8 h-8" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#F1F3ED]">404 — Page Not Found</h1>
      <p className="mt-2 text-sm text-[#A0A89F] max-w-md">
        The requested resource does not exist or has been relocated within the academic portal.
      </p>

      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#D4FF83] text-[#101211] text-xs font-bold transition-all shadow-sm"
        >
          <Home className="w-4 h-4" />
          Return to Portal
        </Link>
      </div>
    </div>
  );
}

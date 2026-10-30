'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw, Home, ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AMS-EXCEPTION-CAPTURED] Global Error Boundary:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col items-center justify-center p-6 selection:bg-[#C6F36B]/30">
      <div className="max-w-md w-full p-8 rounded-xl bg-[#171B18] border border-[#303831] shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Subtle Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-[#FF7777]/50 rounded-b-full blur-[1px]" />

        <div className="w-16 h-16 mx-auto rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/30 flex items-center justify-center text-[#FF7777] shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#202622] text-[#FF7777] border border-[#303831]">
            Application Exception
          </span>
          <h1 className="text-xl font-black text-[#F1F3ED] mt-3">Something Went Wrong</h1>
          <p className="text-xs text-[#A0A89F] mt-1.5 leading-relaxed">
            The application encountered an unexpected runtime condition. Academic state and verified records remain safe and persisted in the database.
          </p>
        </div>

        {error.digest && (
          <div className="p-3 rounded-xl bg-[#202622] border border-[#303831] text-[11px] font-mono text-[#A0A89F] break-all">
            Digest: <span className="text-[#F1F3ED]">{error.digest}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C6F36B]/20"
          >
            <RotateCw className="w-4 h-4" />
            Retry Request
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#F1F3ED] font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-[#303831]"
          >
            <Home className="w-4 h-4 text-[#A0A89F]" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RotateCw, Lock } from 'lucide-react';

export default function BossErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AMS-EXCEPTION-CAPTURED] Admin Portal Error:', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col items-center justify-center p-6 selection:bg-[#C6F36B]/30">
      <div className="max-w-md w-full p-8 rounded-xl bg-[#171B18] border border-[#303831] shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/30 flex items-center justify-center text-[#FF7777]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#202622] text-[#F0BC65] border border-[#303831]">
            Admin Control Center Exception
          </span>
          <h1 className="text-xl font-black text-[#F1F3ED] mt-3">Telemetry Service Interrupted</h1>
          <p className="text-xs text-[#A0A89F] mt-1.5 leading-relaxed">
            The administrator panel encountered a processing error. All institutional data, schema tables, and access credentials remain protected.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C6F36B]/20"
          >
            <RotateCw className="w-4 h-4" />
            Retry Control Center
          </button>
          <Link
            href="/bosshere"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#F1F3ED] font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-[#303831]"
          >
            <Lock className="w-4 h-4 text-[#F0BC65]" />
            Reload Admin Hub
          </Link>
        </div>
      </div>
    </div>
  );
}

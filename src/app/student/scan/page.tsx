'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { QrScanner } from '@/components/QrScanner';
import { Role } from '@prisma/client';
import { QrCode, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';

function StudentScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledSessionId = searchParams.get('sessionId') || '';
  const [completedRecord, setCompletedRecord] = useState<any>(null);

  const handleSuccess = (result: any) => {
    setCompletedRecord(result.record || result);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar role={Role.STUDENT} />

        <main className="flex-1 p-6 lg:p-8 max-w-xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/student" className="text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-teal-400" />
                  Mark Attendance
                </h1>
                <p className="text-xs text-slate-400">
                  Scan classroom QR or enter token to record presence.
                </p>
              </div>
            </div>
          </div>

          {completedRecord ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-teal-500/40 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-xl font-bold text-white">Attendance Verified & Recorded!</h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Your presence was verified and marked as{' '}
                <span className="font-bold text-teal-400">PRESENT</span> at{' '}
                {new Date().toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
                .
              </p>

              <div className="pt-4 flex justify-center gap-3">
                <Link
                  href="/student"
                  className="px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-colors flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
                >
                  View Updated Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <QrScanner
              prefilledSessionId={prefilledSessionId}
              onCheckInSuccess={handleSuccess}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function StudentScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <QrCode className="w-8 h-8 text-teal-400 animate-pulse" />
        </div>
      }
    >
      <StudentScanContent />
    </Suspense>
  );
}

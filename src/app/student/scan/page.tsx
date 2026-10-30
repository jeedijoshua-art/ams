'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { QrScanner } from '@/components/QrScanner';
import { Role } from '@prisma/client';
import { QrCode, ArrowLeft, CheckCircle2, ArrowRight, RotateCw, BookOpen, Clock } from 'lucide-react';
import { AmsLoader } from '@/components/AmsLoader';

function StudentScanContent() {
  const searchParams = useSearchParams();
  const prefilledSessionId = searchParams.get('sessionId') || '';
  const prefilledToken = searchParams.get('token') || '';
  const [completedRecord, setCompletedRecord] = useState<any>(null);

  const handleSuccess = (result: any) => {
    setCompletedRecord(result.record || result);
  };

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar role={Role.STUDENT} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/student" className="p-2 rounded-xl bg-[#171B18] border border-[#303831] text-[#A0A89F] hover:text-[#F1F3ED] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#F1F3ED] flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-[#C6F36B]" />
                  Mark Attendance
                </h1>
                <p className="text-xs text-[#A0A89F] mt-0.5">
                  Point camera at projection screen or enter verification token.
                </p>
              </div>
            </div>
          </div>

          {completedRecord ? (
            <div className="p-6 sm:p-8 rounded-xl bg-[#171B18] border border-[#C6F36B]/40 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-[#C6F36B]/15 border border-[#C6F36B]/40 flex items-center justify-center text-[#C6F36B] mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#C6F36B]/10 border border-[#C6F36B]/30 text-[#C6F36B] text-xs font-bold uppercase tracking-wider mb-2">
                  Verified & Persisted
                </span>
                <h2 className="text-xl font-bold text-[#F1F3ED]">Attendance Recorded Successfully!</h2>
              </div>

              {completedRecord.subjectName && (
                <div className="p-4 rounded-xl bg-[#202622] border border-[#303831] text-left space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F1F3ED]">
                    <BookOpen className="w-4 h-4 text-[#C6F36B]" />
                    <span>Course: {completedRecord.subjectName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#A0A89F]">
                    <Clock className="w-3.5 h-3.5 text-[#A0A89F]" />
                    <span>
                      Timestamp:{' '}
                      {new Date(completedRecord.markedAt || Date.now()).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      IST
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-[#A0A89F] max-w-sm mx-auto">
                Your presence was verified against the cryptographic token and permanently registered into academic records.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setCompletedRecord(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#202622] text-[#F1F3ED] hover:bg-[#303831] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Scan Another Class
                </button>
                <Link
                  href="/student"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C6F36B] text-[#101211] font-bold text-xs hover:bg-[#b5e855] transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-[#C6F36B]/20"
                >
                  View Academic Hub
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <QrScanner
              prefilledSessionId={prefilledSessionId}
              prefilledToken={prefilledToken}
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
    <Suspense fallback={<AmsLoader fullScreen label="Initializing scanner..." />}>
      <StudentScanContent />
    </Suspense>
  );
}

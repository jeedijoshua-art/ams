'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  QrCode,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  BookOpen,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { AmsLoader } from '@/components/AmsLoader';

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get('subjectId') || '';

  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [classSection, setClassSection] = useState('CSE-A');
  const [period, setPeriod] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [qrExpiryMinutes, setQrExpiryMinutes] = useState(2);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);

  // Selected subject details
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data.subjects) {
          setSubjects(data.subjects);
          if (!subjectId && data.subjects.length > 0) {
            setSubjectId(data.subjects[0].id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please select a course subject.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          classSection,
          period: Number(period),
          durationMinutes: Number(durationMinutes),
          qrExpiryMinutes: Number(qrExpiryMinutes),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(`/faculty/sessions/${data.session.id}`);
      } else {
        setError(data.error || 'Failed to create session.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 min-w-0 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <QrCode className="w-6 h-6 text-[#C6F36B]" />
                Launch Attendance Session
              </h1>
              <p className="text-xs text-[#A0A89F] mt-1">
                Configure your class section, schedule, and rolling cryptographic QR window.
              </p>
            </div>
            <Link
              href="/faculty"
              className="text-xs font-semibold text-[#A0A89F] hover:text-[#F1F3ED]"
            >
              Cancel
            </Link>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/30 text-[#FF7777] flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-[#FF7777] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-[#A0A89F]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#C6F36B] mb-2" />
              <p className="text-xs">Loading course catalog...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Select Subject */}
              <div className="p-5 rounded-xl bg-[#171B18] border border-[#303831] space-y-4">
                <h3 className="text-sm font-bold text-[#F1F3ED] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C6F36B]" />
                  Course & Section Allocation
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                    Assigned Course Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-medium"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name} ({s._count?.enrollments || 0} enrolled)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                      Class Section / Batch
                    </label>
                    <select
                      value={classSection}
                      onChange={(e) => setClassSection(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-mono font-bold"
                    >
                      <option value="CSE-A">CSE-A (Section A)</option>
                      <option value="CSE-B">CSE-B (Section B)</option>
                      <option value="CSE-C">CSE-C (Section C)</option>
                      <option value="AI&DS-A">AI&DS-A</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                      Class Period / Hour
                    </label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                        <option key={p} value={p}>
                          Period {p} ({p === 1 ? '08:30 AM' : p === 2 ? '09:30 AM' : p === 3 ? '10:45 AM' : p === 4 ? '11:45 AM' : p === 5 ? '01:30 PM' : p === 6 ? '02:30 PM' : p === 7 ? '03:30 PM' : '04:30 PM'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                    Session Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-mono"
                  />
                </div>
              </div>

              {/* Roster Preview Card */}
              {selectedSubject && (
                <div className="p-4 rounded-xl bg-[#171B18] border border-[#303831] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C6F36B]/10 border border-[#C6F36B]/20 flex items-center justify-center text-[#C6F36B]">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#F1F3ED]">Eligible Class Roster</p>
                      <p className="text-[11px] text-[#A0A89F]">
                        {selectedSubject._count?.enrollments || 0} students enrolled in {selectedSubject.code}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#C6F36B]/15 text-[#C6F36B] text-xs font-mono font-bold">
                    {selectedSubject._count?.enrollments || 0} Enrolled
                  </span>
                </div>
              )}

              {/* Security & Token Configuration */}
              <div className="p-5 rounded-xl bg-[#171B18] border border-[#303831] space-y-4">
                <h3 className="text-sm font-bold text-[#F1F3ED] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#72D6A0]" />
                  Anti-Proxy QR Expiry Settings
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                      QR Token Validity
                    </label>
                    <select
                      value={qrExpiryMinutes}
                      onChange={(e) => setQrExpiryMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
                    >
                      <option value={1}>1 Minute (Strict anti-proxy)</option>
                      <option value={2}>2 Minutes (Recommended)</option>
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes</option>
                    </select>
                    <p className="text-[10px] text-[#A0A89F]/70 mt-1">
                      Rolling entropy tokens rotate to prevent forwarding.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                      Total Class Duration
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
                    >
                      <option value={50}>50 Minutes (1 Standard Hour)</option>
                      <option value={100}>100 Minutes (2-Hour Block)</option>
                      <option value={150}>150 Minutes (Laboratory Practical)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-[#101211] font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#C6F36B]/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#101211]" />
                    Generating Secure Cryptographic QR...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    Confirm Roster & Launch QR Session
                  </>
                )}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<AmsLoader fullScreen label="Preparing session configuration..." />}>
      <NewSessionContent />
    </Suspense>
  );
}

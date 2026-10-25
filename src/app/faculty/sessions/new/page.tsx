'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  QrCode,
  Clock,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
  Users,
} from 'lucide-react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 min-w-0 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <QrCode className="w-6 h-6 text-teal-400" />
                Launch Attendance Session
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Configure your class section, schedule, and rolling cryptographic QR window.
              </p>
            </div>
            <Link
              href="/faculty"
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </Link>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
              <p className="text-xs">Loading course catalog...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Select Subject */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-400" />
                  Course & Section Allocation
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Assigned Course Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Class Section / Batch
                    </label>
                    <select
                      value={classSection}
                      onChange={(e) => setClassSection(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 font-mono font-bold"
                    >
                      <option value="CSE-A">CSE-A (Section A)</option>
                      <option value="CSE-B">CSE-B (Section B)</option>
                      <option value="CSE-C">CSE-C (Section C)</option>
                      <option value="AI&DS-A">AI&DS-A</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Class Period / Hour
                    </label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 font-bold"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Session Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Roster Preview Card */}
              {selectedSubject && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Eligible Class Roster</p>
                      <p className="text-[11px] text-slate-400">
                        {selectedSubject._count?.enrollments || 0} students enrolled in {selectedSubject.code}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 text-xs font-mono font-bold">
                    {selectedSubject._count?.enrollments || 0} Enrolled
                  </span>
                </div>
              )}

              {/* Security & Token Configuration */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Anti-Proxy QR Expiry Settings
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      QR Token Validity
                    </label>
                    <select
                      value={qrExpiryMinutes}
                      onChange={(e) => setQrExpiryMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value={1}>1 Minute (Strict anti-proxy)</option>
                      <option value={2}>2 Minutes (Recommended)</option>
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Rolling entropy tokens rotate to prevent forwarding.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Total Class Duration
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
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
                className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-teal-500/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      }
    >
      <NewSessionContent />
    </Suspense>
  );
}

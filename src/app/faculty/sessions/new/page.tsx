'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import { QrCode, Clock, ShieldCheck, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
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
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [qrExpiryMinutes, setQrExpiryMinutes] = useState(2);

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
          durationMinutes: Number(durationMinutes),
          qrExpiryMinutes: Number(qrExpiryMinutes),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect to live session screen
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

      <div className="flex-1 flex">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 p-6 lg:p-8 max-w-2xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <QrCode className="w-6 h-6 text-teal-400" />
                Launch Attendance Session
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Generates a cryptographically random expiring QR token and opens the session.
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
              <p className="text-xs">Loading course subjects...</p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Course Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} — {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      Class Duration
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={50}>50 Minutes (Standard)</option>
                      <option value={90}>90 Minutes</option>
                      <option value={120}>120 Minutes (Lab)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                      QR Expiry Window
                    </label>
                    <select
                      value={qrExpiryMinutes}
                      onChange={(e) => setQrExpiryMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value={1}>1 Minute (Strict)</option>
                      <option value={2}>2 Minutes (Recommended)</option>
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Security Parameters:</p>
                  <p>• Only enrolled students can submit check-ins for this subject.</p>
                  <p>• Duplicate check-in attempts are rejected at the database level.</p>
                  <p>• You can project the QR code onto the classroom screen and refresh it at any time.</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Cryptographic QR Token...
                    </>
                  ) : (
                    <>
                      Open Session & Display QR Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      }
    >
      <NewSessionContent />
    </Suspense>
  );
}

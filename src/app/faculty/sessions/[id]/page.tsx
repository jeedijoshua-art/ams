'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import { SessionStatusBadge, AttendanceStatusBadge } from '@/components/StatusBadge';
import {
  QrCode,
  RotateCw,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Lock,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';

export default function FacultySessionViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeTab, setActiveTab] = useState<'attended' | 'absent'>('attended');
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const fetchSessionData = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const json = await res.json();
      if (json.session) {
        setData(json);

        // If session has active QR, calculate remaining time
        if (json.session.qrExpiresAt && json.session.status === 'OPEN') {
          const diff = Math.max(
            0,
            Math.floor((new Date(json.session.qrExpiresAt).getTime() - Date.now()) / 1000)
          );
          setSecondsRemaining(diff);
        } else {
          setSecondsRemaining(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  // Real-time polling every 3 seconds while session is OPEN
  useEffect(() => {
    if (!data?.session || data.session.status !== 'OPEN') return;

    const interval = setInterval(() => {
      fetchSessionData();
    }, 3000);

    return () => clearInterval(interval);
  }, [data?.session?.status, sessionId]);

  // Second-by-second countdown timer for QR
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Refresh QR token
  const handleRefreshQr = async () => {
    setRefreshingQr(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh-qr', expiryMinutes: 2 }),
      });
      const json = await res.json();
      if (json.success && json.qr) {
        setQrDataUrl(json.qr.dataUrl);
        setQrToken(json.qr.token);
        const diff = Math.max(
          0,
          Math.floor((new Date(json.qr.expiresAt).getTime() - Date.now()) / 1000)
        );
        setSecondsRemaining(diff);
        fetchSessionData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshingQr(false);
    }
  };

  // Close session
  const handleCloseSession = async () => {
    if (
      !confirm(
        'Are you sure you want to conclude this attendance session? Check-in will be locked.'
      )
    )
      return;

    setClosingSession(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const json = await res.json();
      if (json.success) {
        setQrDataUrl(null);
        setQrToken(null);
        setSecondsRemaining(null);
        fetchSessionData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClosingSession(false);
    }
  };

  // Copy token helper
  const copyTokenToClipboard = () => {
    if (!qrToken) return;
    navigator.clipboard.writeText(qrToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // If live token is not yet generated, trigger an initial generation for an open session
  useEffect(() => {
    if (data?.session?.status === 'OPEN' && !qrDataUrl && !refreshingQr) {
      handleRefreshQr();
    }
  }, [data?.session?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!data?.session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <p className="text-lg font-bold">Attendance Session Not Found</p>
        <Link href="/faculty" className="text-xs text-teal-400 mt-2 underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { session, enrolledTotal, attendedTotal, absentTotal, absentStudents } = data;
  const isOpen = session.status === 'OPEN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/faculty"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
                  {session.subject.code}
                </span>
                <SessionStatusBadge status={session.status} />
              </div>
              <h1 className="text-2xl font-black text-white">{session.subject.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Session ID: <span className="font-mono">{session.id}</span> • Started:{' '}
                {new Date(session.startsAt).toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/reports/session-csv?sessionId=${session.id}`}
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                Export CSV Sheet
              </a>

              {isOpen && (
                <button
                  onClick={handleCloseSession}
                  disabled={closingSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-all"
                >
                  {closingSession ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Conclude Session
                </button>
              )}
            </div>
          </div>

          {/* Real-time Telemetry Stats Banner */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Enrolled
              </span>
              <span className="text-2xl font-black text-white mt-1 block">{enrolledTotal}</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                Present / Attended
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {attendedTotal}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">
                Unmarked / Absent
              </span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">{absentTotal}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: QR Code Projector */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl text-center">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-teal-400" />
                    Classroom Projection View
                  </h3>

                  {isOpen && (
                    <button
                      onClick={handleRefreshQr}
                      disabled={refreshingQr}
                      title="Generate new token"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
                    >
                      <RotateCw
                        className={`w-3.5 h-3.5 ${refreshingQr ? 'animate-spin' : ''}`}
                      />
                      Refresh
                    </button>
                  )}
                </div>

                {isOpen ? (
                  <div>
                    {qrDataUrl ? (
                      <div className="relative inline-block p-4 rounded-2xl bg-white shadow-2xl mx-auto my-2">
                        <img
                          src={qrDataUrl}
                          alt="Dynamic Attendance QR Code"
                          className="w-64 h-64 mx-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-64 h-64 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto my-2">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                      </div>
                    )}

                    {/* Expiration Timer Banner */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 text-xs">
                      <Clock className="w-4 h-4 text-teal-400" />
                      <span className="text-slate-400">Token validity:</span>
                      <span
                        className={`font-mono font-bold ${
                          secondsRemaining !== null && secondsRemaining <= 30
                            ? 'text-rose-400 animate-pulse'
                            : 'text-teal-400'
                        }`}
                      >
                        {secondsRemaining !== null
                          ? `${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s`
                          : 'Expired'}
                      </span>
                    </div>

                    {/* Token String Fallback for Manual Testing */}
                    {qrToken && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 truncate max-w-[200px]">{qrToken}</span>
                        <button
                          onClick={copyTokenToClipboard}
                          className="p-1 text-teal-400 hover:text-teal-300 transition-colors"
                          title="Copy Token"
                        >
                          {copiedToken ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-slate-500">
                    <Lock className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">
                      This attendance session is concluded.
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Check-in tokens are invalidated and locked.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Attendee Roster Tabs */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('attended')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        activeTab === 'attended'
                          ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Present ({attendedTotal})
                    </button>
                    <button
                      onClick={() => setActiveTab('absent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        activeTab === 'absent'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Unmarked / Absent ({absentTotal})
                    </button>
                  </div>

                  {isOpen && (
                    <span className="text-[11px] text-teal-400 flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                      Auto-syncing (3s)
                    </span>
                  )}
                </div>

                <div className="max-h-[460px] overflow-y-auto">
                  {activeTab === 'attended' ? (
                    session.records.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 text-xs">
                        No students have checked in yet.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-4">Roll Number</th>
                            <th className="py-2.5 px-4">Student Name</th>
                            <th className="py-2.5 px-4">Check-in Time</th>
                            <th className="py-2.5 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {session.records.map((rec: any) => (
                            <tr key={rec.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-4 font-mono font-bold text-teal-400">
                                {rec.student.rollNumber}
                              </td>
                              <td className="py-3 px-4 font-semibold text-white">
                                {rec.student.name}
                              </td>
                              <td className="py-3 px-4 text-slate-400">
                                {new Date(rec.markedAt).toLocaleTimeString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <AttendanceStatusBadge status={rec.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  ) : absentStudents.length === 0 ? (
                    <div className="p-12 text-center text-emerald-400 text-xs flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      100% Attendance: Every enrolled student has marked attendance!
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">Roll Number</th>
                          <th className="py-2.5 px-4">Student Name</th>
                          <th className="py-2.5 px-4">Department</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {absentStudents.map((std: any) => (
                          <tr key={std.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">
                              {std.rollNumber}
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">{std.name}</td>
                            <td className="py-3 px-4 text-slate-500">{std.department}</td>
                            <td className="py-3 px-4 text-right">
                              <AttendanceStatusBadge status="ABSENT" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

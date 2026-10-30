'use client';

import React, { useState, useEffect, use, useRef } from 'react';
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
  Edit3,
  UserCheck,
  History,
  X,
  Maximize2,
  Minimize2,
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
  const [projectorMode, setProjectorMode] = useState(false);

  // Attendance Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<{
    studentId: string;
    studentName: string;
    rollNumber: string;
    currentStatus: string;
  } | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const isFetchingRef = useRef(false);

  const fetchSessionData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const json = await res.json();
      if (json.session) {
        setData(json);

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
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  // Real-time polling with in-flight guard while session is OPEN
  useEffect(() => {
    if (!data?.session || data.session.status !== 'OPEN') return;

    let timeoutId: NodeJS.Timeout;
    let isActive = true;

    const poll = async () => {
      await fetchSessionData();
      if (isActive) {
        timeoutId = setTimeout(poll, 3000);
      }
    };

    timeoutId = setTimeout(poll, 3000);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
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

  const copyTokenToClipboard = () => {
    if (!qrToken) return;
    navigator.clipboard.writeText(qrToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Initial QR load
  useEffect(() => {
    if (data?.session?.status === 'OPEN' && !qrDataUrl && !refreshingQr) {
      handleRefreshQr();
    }
  }, [data?.session?.status]);

  const openCorrectionModal = (
    studentId: string,
    studentName: string,
    rollNumber: string,
    currentStatus: string
  ) => {
    setCorrectionTarget({ studentId, studentName, rollNumber, currentStatus });
    setCorrectionStatus(currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT');
    setCorrectionReason('');
    setFeedback(null);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;

    if (!correctionReason.trim() || correctionReason.trim().length < 4) {
      setFeedback({
        type: 'error',
        text: 'A mandatory explanation reason (min 4 characters) is required for attendance audit logging.',
      });
      return;
    }

    setSubmittingCorrection(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: correctionTarget.studentId,
          newStatus: correctionStatus,
          reason: correctionReason,
        }),
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        setFeedback({
          type: 'success',
          text: `Attendance for ${correctionTarget.rollNumber} updated to ${correctionStatus}. Immutable audit logged.`,
        });
        setCorrectionTarget(null);
        fetchSessionData();
      } else {
        setFeedback({ type: 'error', text: resData.error || 'Failed to submit correction.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setSubmittingCorrection(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
        <Navbar />
        <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
          <Sidebar role={Role.FACULTY} />
          <main className="flex-1 min-w-0 space-y-8 animate-pulse">
            <div className="h-8 bg-[#202622] rounded-lg w-1/3 mb-2" />
            <div className="h-4 bg-[#202622]/60 rounded w-1/2 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-28 bg-[#171B18] border border-[#303831] rounded-xl" />
              <div className="h-28 bg-[#171B18] border border-[#303831] rounded-xl" />
              <div className="h-28 bg-[#171B18] border border-[#303831] rounded-xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 h-96 bg-[#171B18] border border-[#303831] rounded-xl" />
              <div className="lg:col-span-7 h-96 bg-[#171B18] border border-[#303831] rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!data?.session) {
    return (
      <div className="min-h-screen bg-[#101211] flex flex-col items-center justify-center text-[#F1F3ED] p-4">
        <p className="text-lg font-bold">Attendance Session Not Found</p>
        <Link href="/faculty" className="text-xs text-[#C6F36B] mt-2 underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { session, enrolledTotal, attendedTotal, absentTotal, absentStudents } = data;
  const isOpen = session.status === 'OPEN';

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#303831]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/faculty/sessions"
                  className="text-[#A0A89F] hover:text-[#F1F3ED] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[#202622] text-[#C6F36B] border border-[#303831]">
                  {session.subject.code}
                </span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#202622] text-[#A0A89F]">
                  {session.classSection || 'CSE-A'} • Period {session.period || 1}
                </span>
                <SessionStatusBadge status={session.status} />
              </div>
              <h1 className="text-2xl font-black text-[#F1F3ED]">{session.subject.name}</h1>
              <p className="text-xs text-[#A0A89F] mt-0.5">
                Conducted:{' '}
                {new Date(session.startsAt).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                at{' '}
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171B18] border border-[#303831] text-xs font-semibold text-[#A0A89F] hover:bg-[#202622] hover:text-[#F1F3ED] transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#C6F36B]" />
                Export CSV Sheet
              </a>

              {isOpen && (
                <button
                  onClick={handleCloseSession}
                  disabled={closingSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF7777]/15 border border-[#FF7777]/30 text-[#FF7777] hover:bg-[#FF7777]/25 text-xs font-bold transition-all"
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

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-[#72D6A0]/10 border-[#72D6A0]/30 text-[#72D6A0]'
                  : 'bg-[#FF7777]/10 border-[#FF7777]/30 text-[#FF7777]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-[#72D6A0] shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FF7777] shrink-0" />
              )}
              <span className="text-xs font-medium">{feedback.text}</span>
            </div>
          )}

          {/* Real-time Telemetry Stats Banner */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#171B18] border border-[#303831] text-center">
              <span className="text-xs font-semibold text-[#A0A89F] uppercase tracking-wider block">
                Total Enrolled
              </span>
              <span className="text-2xl font-black text-[#F1F3ED] mt-1 block">{enrolledTotal}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#72D6A0]/10 border border-[#72D6A0]/30 text-center">
              <span className="text-xs font-semibold text-[#72D6A0] uppercase tracking-wider block">
                Present / Attended
              </span>
              <span className="text-2xl font-black text-[#72D6A0] mt-1 block">
                {attendedTotal}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#171B18] border border-[#303831] text-center">
              <span className="text-xs font-semibold text-[#FF7777] uppercase tracking-wider block">
                Unmarked / Absent
              </span>
              <span className="text-2xl font-black text-[#FF7777] mt-1 block">{absentTotal}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: QR Code Projector */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-xl bg-[#171B18] border border-[#303831] shadow-xl text-center">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#F1F3ED] flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#C6F36B]" />
                    Classroom Projection View
                  </h3>

                  {isOpen && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setProjectorMode(true)}
                        title="Open Fullscreen Classroom Projector Mode"
                        className="px-2.5 py-1.5 rounded-lg bg-[#C6F36B]/15 hover:bg-[#C6F36B]/25 border border-[#C6F36B]/30 text-[#C6F36B] text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Projector Mode
                      </button>

                      <button
                        onClick={handleRefreshQr}
                        disabled={refreshingQr}
                        title="Generate new token"
                        className="p-1.5 rounded-lg bg-[#202622] hover:bg-[#303831] text-[#A0A89F] hover:text-[#F1F3ED] transition-colors flex items-center gap-1 text-xs"
                      >
                        <RotateCw
                          className={`w-3.5 h-3.5 ${refreshingQr ? 'animate-spin' : ''}`}
                        />
                        Refresh
                      </button>
                    </div>
                  )}
                </div>

                {isOpen ? (
                  <div>
                    {qrDataUrl ? (
                      <div className="relative inline-block p-4 rounded-xl bg-white shadow-2xl mx-auto my-2">
                        <img
                          src={qrDataUrl}
                          alt="Dynamic Attendance QR Code"
                          className="w-64 h-64 mx-auto object-contain"
                        />
                        {/* Token Expired Overlay */}
                        {secondsRemaining === 0 && (
                          <div className="absolute inset-0 bg-[#101211]/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center animate-in fade-in">
                            <AlertTriangle className="w-8 h-8 text-[#F0BC65] mb-2" />
                            <p className="text-xs font-bold text-[#F1F3ED]">QR Token Expired</p>
                            <p className="text-[11px] text-[#A0A89F] mb-3 max-w-[200px]">
                              Code expired. Refresh to generate a new live token.
                            </p>
                            <button
                              onClick={handleRefreshQr}
                              disabled={refreshingQr}
                              className="px-3.5 py-1.5 rounded-lg bg-[#C6F36B] hover:bg-[#D4FF83] active:bg-[#b5e855] text-[#101211] font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#C6F36B]/20"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${refreshingQr ? 'animate-spin' : ''}`} />
                              Regenerate QR
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-64 h-64 rounded-xl bg-[#101211] border border-[#303831] flex items-center justify-center mx-auto my-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#C6F36B]" />
                      </div>
                    )}

                    {/* Expiration Timer Banner */}
                    <div className="mt-4 p-3 rounded-xl bg-[#101211] border border-[#303831] flex items-center justify-center gap-2 text-xs">
                      <Clock className="w-4 h-4 text-[#C6F36B]" />
                      <span className="text-[#A0A89F]">Token validity:</span>
                      <span
                        className={`font-mono font-bold ${
                          secondsRemaining !== null && secondsRemaining <= 30
                            ? 'text-[#FF7777] animate-pulse'
                            : 'text-[#C6F36B]'
                        }`}
                      >
                        {secondsRemaining !== null
                          ? `${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s`
                          : 'Expired'}
                      </span>
                    </div>

                    {/* Token String Fallback */}
                    {qrToken && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[#101211]/70 border border-[#303831] flex items-center justify-between text-xs font-mono">
                        <span className="text-[#A0A89F] truncate max-w-[200px]">{qrToken}</span>
                        <button
                          onClick={copyTokenToClipboard}
                          className="p-1 text-[#C6F36B] hover:text-[#b5e855] transition-colors"
                          title="Copy Token"
                        >
                          {copiedToken ? (
                            <Check className="w-4 h-4 text-[#72D6A0]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-[#A0A89F]">
                    <Lock className="w-12 h-12 mx-auto text-[#303831] mb-2" />
                    <p className="text-sm font-semibold text-[#A0A89F]">
                      This attendance session is concluded.
                    </p>
                    <p className="text-xs text-[#A0A89F]/70 mt-1">
                      Attendance records can still be corrected using the audit workflow below.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Attendee Roster Tabs with Manual Correction */}
            <div className="lg:col-span-7">
              <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[#303831] flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('attended')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        activeTab === 'attended'
                          ? 'bg-[#C6F36B]/15 text-[#C6F36B] border border-[#C6F36B]/30'
                          : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                      }`}
                    >
                      Present ({attendedTotal})
                    </button>
                    <button
                      onClick={() => setActiveTab('absent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        activeTab === 'absent'
                          ? 'bg-[#FF7777]/15 text-[#FF7777] border border-[#FF7777]/30'
                          : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                      }`}
                    >
                      Unmarked / Absent ({absentTotal})
                    </button>
                  </div>

                  {isOpen && (
                    <span className="text-[11px] text-[#C6F36B] flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#C6F36B] animate-ping" />
                      Auto-syncing (3s)
                    </span>
                  )}
                </div>

                <div className="max-h-[460px] overflow-y-auto">
                  {activeTab === 'attended' ? (
                    session.records.length === 0 ? (
                      <div className="p-12 text-center text-[#737E75] text-xs">
                        No students have checked in yet.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#101211] text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831] sticky top-0">
                          <tr>
                            <th className="py-2.5 px-4">Roll Number</th>
                            <th className="py-2.5 px-4">Student Name</th>
                            <th className="py-2.5 px-4">Method / Time</th>
                            <th className="py-2.5 px-4 text-center">Status</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                          {session.records.map((rec: any) => (
                            <tr key={rec.id} className="hover:bg-[#202622]/40">
                              <td className="py-3 px-4 font-mono font-bold text-[#C6F36B]">
                                {rec.student.rollNumber}
                              </td>
                              <td className="py-3 px-4 font-semibold text-[#F1F3ED]">
                                {rec.student.name}
                              </td>
                              <td className="py-3 px-4 text-[#A0A89F]">
                                <span className="font-mono text-[11px]">
                                  {new Date(rec.markedAt).toLocaleTimeString('en-IN', {
                                    timeZone: 'Asia/Kolkata',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#202622] text-[#A0A89F]">
                                  {rec.markedMethod || 'QR'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <AttendanceStatusBadge status={rec.status} />
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() =>
                                    openCorrectionModal(
                                      rec.student.id,
                                      rec.student.name,
                                      rec.student.rollNumber,
                                      rec.status
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A0A89F] hover:text-[#C6F36B] transition-colors"
                                  title="Correct attendance record"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Correct
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  ) : absentStudents.length === 0 ? (
                    <div className="p-12 text-center text-[#72D6A0] text-xs flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      100% Attendance: Every enrolled student has marked attendance!
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101211] text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">Roll Number</th>
                          <th className="py-2.5 px-4">Student Name</th>
                          <th className="py-2.5 px-4">Department</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                          <th className="py-2.5 px-4 text-right">Manual Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                        {absentStudents.map((std: any) => (
                          <tr key={std.id} className="hover:bg-[#202622]/40">
                            <td className="py-3 px-4 font-mono font-bold text-[#A0A89F]">
                              {std.rollNumber}
                            </td>
                            <td className="py-3 px-4 font-semibold text-[#F1F3ED]">{std.name}</td>
                            <td className="py-3 px-4 text-[#A0A89F]/70">{std.department}</td>
                            <td className="py-3 px-4 text-center">
                              <AttendanceStatusBadge status="ABSENT" />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() =>
                                  openCorrectionModal(
                                    std.id,
                                    std.name,
                                    std.rollNumber,
                                    'ABSENT'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#C6F36B]/10 hover:bg-[#C6F36B]/20 text-[#C6F36B] border border-[#C6F36B]/30 text-[11px] font-semibold transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Mark Present
                              </button>
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

          {/* Fullscreen Classroom Projector Mode Modal */}
          {projectorMode && (
            <div className="fixed inset-0 z-50 bg-[#101211] flex flex-col items-center justify-between p-6 sm:p-10 animate-in fade-in duration-200">
              {/* Projector Header */}
              <div className="w-full max-w-4xl flex items-center justify-between border-b border-[#303831] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold px-3 py-1 rounded-lg bg-[#C6F36B]/15 text-[#C6F36B] border border-[#C6F36B]/30">
                      {session.subject.code}
                    </span>
                    <span className="text-xs text-[#A0A89F] font-semibold">
                      {session.classSection || 'CSE-A'} • Period {session.period || 1}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#F1F3ED] mt-1">
                    {session.subject.name}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRefreshQr}
                    disabled={refreshingQr}
                    className="px-4 py-2 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-[#F1F3ED] text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <RotateCw className={`w-4 h-4 ${refreshingQr ? 'animate-spin' : ''}`} />
                    Refresh QR
                  </button>

                  <button
                    onClick={() => setProjectorMode(false)}
                    className="p-2.5 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-[#A0A89F] hover:text-[#F1F3ED] transition-colors"
                    title="Exit Projector Mode"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Central Giant QR Code */}
              <div className="my-auto flex flex-col items-center text-center">
                {qrDataUrl ? (
                  <div className="p-6 sm:p-8 rounded-xl bg-white shadow-2xl relative inline-block">
                    <img
                      src={qrDataUrl}
                      alt="Classroom Attendance QR Code"
                      className="w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] object-contain"
                    />
                    {secondsRemaining === 0 && (
                      <div className="absolute inset-0 bg-[#101211]/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-[#F0BC65] mb-3" />
                        <h2 className="text-xl font-bold text-[#F1F3ED]">QR Token Expired</h2>
                        <p className="text-xs text-[#A0A89F] mb-4 max-w-xs">
                          Click below to regenerate a live token for students.
                        </p>
                        <button
                          onClick={handleRefreshQr}
                          disabled={refreshingQr}
                          className="px-5 py-2.5 rounded-lg bg-[#C6F36B] hover:bg-[#D4FF83] active:bg-[#b5e855] text-[#101211] font-bold text-sm flex items-center gap-2 shadow-xl shadow-[#C6F36B]/25"
                        >
                          <RotateCw className={`w-4 h-4 ${refreshingQr ? 'animate-spin' : ''}`} />
                          Regenerate Live QR
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-80 h-80 rounded-xl bg-[#171B18] border border-[#303831] flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[#C6F36B]" />
                  </div>
                )}

                {/* Expiry Countdown & Live Counter */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  <div className="px-5 py-2.5 rounded-xl bg-[#171B18] border border-[#303831] flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-[#C6F36B]" />
                    <span className="text-xs text-[#A0A89F]">Token validity:</span>
                    <span
                      className={`font-mono text-base font-black ${
                        secondsRemaining !== null && secondsRemaining <= 30
                          ? 'text-[#FF7777] animate-pulse'
                          : 'text-[#C6F36B]'
                      }`}
                    >
                      {secondsRemaining !== null
                        ? `${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s`
                        : 'Expired'}
                    </span>
                  </div>

                  <div className="px-5 py-2.5 rounded-xl bg-[#72D6A0]/10 border border-[#72D6A0]/30 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#72D6A0]" />
                    <span className="text-xs text-[#72D6A0]">Present:</span>
                    <span className="font-mono text-base font-black text-[#72D6A0]">
                      {attendedTotal} / {enrolledTotal}
                    </span>
                  </div>
                </div>

                {qrToken && (
                  <p className="text-xs font-mono text-[#A0A89F]/70 mt-3">
                    Token: <span className="text-[#A0A89F]">{qrToken}</span>
                  </p>
                )}
              </div>

              {/* Projector Footer Notice */}
              <div className="w-full max-w-4xl text-center border-t border-[#303831] pt-4">
                <p className="text-xs text-[#A0A89F]">
                  Students: Open <span className="text-[#C6F36B] font-mono font-semibold">/student/scan</span> on your mobile device to scan this screen.
                </p>
              </div>
            </div>
          )}

          {/* Modal: Attendance Correction with Required Audit Reason */}
          {correctionTarget && (
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-[#F1F3ED] flex items-center gap-2">
                    <History className="w-5 h-5 text-[#C6F36B]" />
                    Attendance Record Adjustment
                  </h3>
                  <button
                    onClick={() => setCorrectionTarget(null)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#202622] border border-[#303831] my-3 text-xs">
                  <p className="font-bold text-[#F1F3ED]">{correctionTarget.studentName}</p>
                  <p className="text-[11px] text-[#A0A89F] font-mono">
                    Roll: {correctionTarget.rollNumber} • Current Status:{' '}
                    <span className="font-bold text-[#C6F36B]">{correctionTarget.currentStatus}</span>
                  </p>
                </div>

                <form onSubmit={handleSubmitCorrection} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                      New Attendance Status
                    </label>
                    <select
                      value={correctionStatus}
                      onChange={(e) => setCorrectionStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-bold"
                    >
                      <option value="PRESENT">PRESENT (In attendance)</option>
                      <option value="ABSENT">ABSENT (Did not attend)</option>
                      <option value="LATE">LATE (Arrived after grace period)</option>
                      <option value="EXCUSED">EXCUSED (Official On-Duty / Medical)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                      Mandatory Correction Reason <span className="text-[#FF7777]">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Student reported hardware camera defect during live QR scan; verified present in row 3."
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#C6F36B]"
                    />
                    <p className="text-[10px] text-[#A0A89F]/70 mt-1">
                      Recorded permanently in university audit trail with your faculty identity.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCorrectionTarget(null)}
                      className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-xs font-semibold text-[#A0A89F]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCorrection}
                      className="px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-xs font-bold text-[#101211] flex items-center gap-1.5"
                    >
                      {submittingCorrection && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Log Correction & Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

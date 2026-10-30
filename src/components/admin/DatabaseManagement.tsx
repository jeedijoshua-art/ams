'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  AlertTriangle,
  Lock,
  RefreshCw,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  Loader2,
  HardDrive,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  FileCheck2,
  Layers,
} from 'lucide-react';
import type { ResetCategorySummary } from '@/lib/database-reset';

interface DatabaseManagementProps {
  initialCounts: ResetCategorySummary;
}

export function DatabaseManagement({ initialCounts }: DatabaseManagementProps) {
  const router = useRouter();
  const [counts, setCounts] = useState<ResetCategorySummary>(initialCounts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const totalAppRecords =
    counts.studentProfiles +
    counts.facultyProfiles +
    counts.subjects +
    counts.attendanceSessions +
    counts.attendanceRecords +
    counts.correctionAudits +
    counts.enrollmentRequests +
    counts.enrollments +
    counts.importBatches +
    counts.nonAdminUsers;

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          confirmationText: confirmationPhrase,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset application data.');
      }

      setSuccessResult(data);
      setCounts({
        attendanceRecords: 0,
        attendanceSessions: 0,
        correctionAudits: 0,
        enrollmentRequests: 0,
        enrollments: 0,
        subjects: 0,
        studentProfiles: 0,
        facultyProfiles: 0,
        nonAdminUsers: 0,
        importBatches: 0,
      });
      setPassword('');
      setConfirmationPhrase('');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An error occurred while resetting database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Overview Header */}
      <div className="p-6 rounded-xl bg-[#171B18] border border-[#303831] shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#303831]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C6F36B]/10 border border-[#C6F36B]/20 flex items-center justify-center text-[#C6F36B]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F1F3ED] flex items-center gap-2">
                Database Management & System Health
              </h2>
              <p className="text-xs text-[#A0A89F] mt-0.5">
                Live Neon PostgreSQL database telemetry and schema maintenance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#72D6A0]/10 border border-[#72D6A0]/30 text-[#72D6A0] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#72D6A0] animate-pulse" />
              Neon Cloud Connected
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#202622] border border-[#303831] text-[#A0A89F] text-xs font-mono">
              <HardDrive className="w-3.5 h-3.5 text-[#A0A89F]" />
              {totalAppRecords} App Records
            </span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#C6F36B]" />
              <span>Students</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.studentProfiles}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <Users className="w-3.5 h-3.5 text-[#C6F36B]" />
              <span>Faculty</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.facultyProfiles}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <BookOpen className="w-3.5 h-3.5 text-[#F0BC65]" />
              <span>Courses/Subjects</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.subjects}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <CalendarCheck className="w-3.5 h-3.5 text-[#72D6A0]" />
              <span>Sessions</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.attendanceSessions}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <FileCheck2 className="w-3.5 h-3.5 text-[#C6F36B]" />
              <span>Attendance Records</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.attendanceRecords}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <Layers className="w-3.5 h-3.5 text-[#C6F36B]" />
              <span>Enrollments</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.enrollments}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <Layers className="w-3.5 h-3.5 text-[#F0BC65]" />
              <span>Enrollment Req.</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.enrollmentRequests}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <RefreshCw className="w-3.5 h-3.5 text-[#FF7777]" />
              <span>Correction Audits</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.correctionAudits}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <HardDrive className="w-3.5 h-3.5 text-[#C6F36B]" />
              <span>Import Batches</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.importBatches}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
            <div className="flex items-center gap-2 text-[#A0A89F] text-xs mb-1">
              <Users className="w-3.5 h-3.5 text-[#A0A89F]" />
              <span>Non-Admin Users</span>
            </div>
            <p className="text-lg font-black text-[#F1F3ED] font-mono">{counts.nonAdminUsers}</p>
          </div>
        </div>

        {/* Safety Note & Action */}
        <div className="p-4 rounded-xl bg-[#101211] border border-[#303831] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F1F3ED]">
              <ShieldAlert className="w-4 h-4 text-[#F0BC65]" />
              <span>Admin Account & Schema Protection</span>
            </div>
            <p className="text-[11px] text-[#A0A89F] leading-relaxed max-w-2xl">
              Database reset operates via atomic transaction: it permanently removes application demo data while strictly preserving database migrations, schema tables, indexes, system threshold settings, and your administrator authentication credentials.
            </p>
          </div>

          <button
            onClick={() => {
              setIsModalOpen(true);
              setError(null);
              setSuccessResult(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#FF7777]/10 hover:bg-[#FF7777]/20 border border-[#FF7777]/30 text-[#FF7777] text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md"
          >
            <Trash2 className="w-4 h-4" />
            Reset Application Data
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successResult && (
        <div className="p-5 rounded-xl bg-[#72D6A0]/10 border border-[#72D6A0]/30 space-y-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-[#72D6A0] text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Application Data Successfully Reset</span>
          </div>
          <p className="text-xs text-[#72D6A0] leading-relaxed">
            The database has been restored to a pristine demonstration state at{' '}
            <span className="font-mono text-[#F1F3ED]">
              {new Date(successResult.timestamp).toLocaleString()}
            </span>
            . All student, faculty, course, and attendance records have been deleted in foreign-key-safe order. Your administrator account is intact.
          </p>
          {successResult.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-[#72D6A0]">
              <div>Records: {successResult.summary.attendanceRecords}</div>
              <div>Sessions: {successResult.summary.attendanceSessions}</div>
              <div>Students: {successResult.summary.studentProfiles}</div>
              <div>Courses: {successResult.summary.subjects}</div>
            </div>
          )}
        </div>
      )}

      {/* Destructive Reset Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg p-6 rounded-xl bg-[#171B18] border border-[#FF7777]/40 shadow-2xl space-y-5 text-[#F1F3ED]">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF7777]/20 border border-[#FF7777]/40 flex items-center justify-center text-[#FF7777] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F1F3ED]">
                  Permanently Reset Application Data?
                </h3>
                <p className="text-xs text-[#FF7777] mt-0.5">
                  This action is irreversible. All student data, faculty profiles, subjects, sessions, and attendance history will be deleted.
                </p>
              </div>
            </div>

            {/* Exact Categories to be Deleted */}
            <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831] text-xs space-y-2">
              <p className="font-semibold text-[#F1F3ED] uppercase text-[10px] tracking-wider">
                Categories to be Deleted:
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-[#A0A89F]">
                <div>• Student Profiles ({counts.studentProfiles})</div>
                <div>• Faculty Profiles ({counts.facultyProfiles})</div>
                <div>• Courses / Subjects ({counts.subjects})</div>
                <div>• Attendance Sessions ({counts.attendanceSessions})</div>
                <div>• Attendance Records ({counts.attendanceRecords})</div>
                <div>• Course Enrollments ({counts.enrollments})</div>
                <div>• Registration Requests ({counts.enrollmentRequests})</div>
                <div>• Correction Audits ({counts.correctionAudits})</div>
                <div>• Student Import Batches ({counts.importBatches})</div>
                <div>• Non-Admin Users ({counts.nonAdminUsers})</div>
              </div>
              <div className="pt-2 border-t border-[#303831] text-[11px] text-[#72D6A0] flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Administrator account & database tables will be preserved.</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/20 text-[#FF7777] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Confirmation Form */}
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                  1. Verify Current Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#A0A89F] pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#FF7777] transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A89F] mb-1.5">
                  2. Type <span className="font-mono text-[#FF7777] font-bold">RESET AMS DATA</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder="RESET AMS DATA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F]/50 focus:outline-none focus:border-[#FF7777] transition-all font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#A0A89F] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !password.trim() ||
                    confirmationPhrase.trim() !== 'RESET AMS DATA'
                  }
                  className="px-5 py-2 rounded-lg bg-[#FF7777] hover:bg-[#FF7777]/80 disabled:opacity-40 disabled:cursor-not-allowed text-[#101211] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#FF7777]/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#101211]" />
                      Executing Reset...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Permanently Reset Database
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

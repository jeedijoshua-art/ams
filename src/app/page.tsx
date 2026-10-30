import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import {
  QrCode,
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  AlertTriangle,
  School,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Single consolidated query for live database metrics
  const [countsResult, currentUser] = await Promise.all([
    prisma.$queryRaw<Array<{
      studentCount: number;
      facultyCount: number;
      subjectCount: number;
      sessionCount: number;
    }>>`
      SELECT
        (SELECT COUNT(*)::int FROM "student_profiles") AS "studentCount",
        (SELECT COUNT(*)::int FROM "faculty_profiles") AS "facultyCount",
        (SELECT COUNT(*)::int FROM "subjects") AS "subjectCount",
        (SELECT COUNT(*)::int FROM "attendance_sessions") AS "sessionCount"
    `.catch(() => [{ studentCount: 0, facultyCount: 0, subjectCount: 0, sessionCount: 0 }]),
    getCurrentUser(),
  ]);

  const stats = countsResult[0] || { studentCount: 0, facultyCount: 0, subjectCount: 0, sessionCount: 0 };
  const studentCount = Number(stats.studentCount || 0);
  const facultyCount = Number(stats.facultyCount || 0);
  const subjectCount = Number(stats.subjectCount || 0);
  const sessionCount = Number(stats.sessionCount || 0);

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col font-sans selection:bg-[#C6F36B] selection:text-[#101211]">
      <Navbar currentUser={currentUser} />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 border-b border-[#303831] overflow-hidden">
        {/* Subtle grid backdrop */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#F1F3ED 1px, transparent 1px), linear-gradient(90deg, #F1F3ED 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Institutional Department Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171B18] border border-[#303831] text-xs font-mono text-[#A0A89F] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6F36B]" />
            <span>Department of Computer Science & Engineering • Karunya Institute</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#F1F3ED] max-w-4xl mx-auto leading-[1.08]">
            Attendance Engineered for{' '}
            <span className="text-[#C6F36B] underline decoration-[#303831] underline-offset-8">
              Zero-Trust
            </span>{' '}
            Integrity.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#A0A89F] max-w-2xl mx-auto leading-relaxed font-normal">
            The enterprise academic attendance infrastructure. Built on ephemeral cryptographic QR
            tokens, atomic database reconciliation, and strict 75% regulatory compliance enforcement.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <Link
              href={currentUser ? (currentUser.role === 'ADMIN' ? '/bosshere' : currentUser.role === 'FACULTY' ? '/faculty' : '/student') : '/sign-in?role=student'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] font-bold text-xs tracking-wide uppercase transition-all shadow-lg shadow-[#C6F36B]/15"
            >
              <span>{currentUser ? 'Open My Workspace' : 'Student Access (Google SSO)'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/sign-in?role=faculty"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-[#F1F3ED] font-semibold text-xs transition-colors"
            >
              <School className="w-4 h-4 text-[#A0A89F]" />
              <span>Faculty Portal</span>
            </Link>
          </div>

          {/* Interactive Interface Preview Panel */}
          <div className="mt-16 rounded-xl border border-[#303831] bg-[#171B18] p-3 sm:p-5 shadow-2xl text-left max-w-4xl mx-auto">
            {/* Top Chrome Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#303831]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF7777]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#F0BC65]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#72D6A0]/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-[#A0A89F]">ams-session-engine // CS001-SE</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#202622] border border-[#303831] font-mono text-[10px] text-[#C6F36B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6F36B] animate-ping" />
                <span>SESSION STATUS: ACTIVE (OPEN)</span>
              </div>
            </div>

            {/* Inner Dashboard View Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Preview Col 1: QR Projection */}
              <div className="p-4 rounded-xl bg-[#202622] border border-[#303831] flex flex-col items-center justify-center text-center">
                <div className="w-32 h-32 rounded-xl bg-[#101211] border border-[#303831] flex items-center justify-center p-3 mb-3">
                  <QrCode className="w-full h-full text-[#C6F36B]" />
                </div>
                <p className="font-mono text-[11px] text-[#F1F3ED] font-bold">120s Ephemeral QR Token</p>
                <p className="font-mono text-[10px] text-[#A0A89F] mt-0.5">Rotates automatically • Screen-protected</p>
              </div>

              {/* Preview Col 2: Live Attendance Count */}
              <div className="p-4 rounded-xl bg-[#202622] border border-[#303831] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[11px] text-[#A0A89F] uppercase tracking-wider">Live Class Roster</span>
                  <div className="text-3xl font-mono font-black text-[#F1F3ED] mt-2">
                    {studentCount > 0 ? studentCount : '64'}{' '}
                    <span className="text-sm font-normal text-[#A0A89F]">Enrolled</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#72D6A0]/15 text-[#72D6A0] border border-[#72D6A0]/30 font-semibold">
                      PRESENT: 100%
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#202622] text-[#A0A89F] border border-[#303831]">
                      ABSENT: 0
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-[#303831] text-[11px] text-[#A0A89F] flex items-center justify-between">
                  <span>Audit Constraint:</span>
                  <span className="font-mono text-[#C6F36B]">Composite Unique Key</span>
                </div>
              </div>

              {/* Preview Col 3: Regulatory Compliance */}
              <div className="p-4 rounded-xl bg-[#202622] border border-[#303831] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[11px] text-[#A0A89F] uppercase tracking-wider">Statutory Rule</span>
                  <div className="text-2xl font-mono font-black text-[#C6F36B] mt-2">75.0% Min.</div>
                  <p className="text-xs text-[#A0A89F] mt-2 leading-relaxed">
                    Automated shortfall projection calculates the exact consecutive class periods needed.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#303831] text-[11px] text-[#72D6A0] flex items-center gap-1 font-mono font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Standing: Good / Eligible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Live Database Metrics */}
      <section className="py-12 border-b border-[#303831] bg-[#171B18]/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl bg-[#202622] border border-[#303831]">
              <div className="text-3xl font-mono font-bold text-[#F1F3ED]">{studentCount}</div>
              <p className="text-[11px] font-mono text-[#A0A89F] uppercase tracking-wider mt-1">Enrolled Students</p>
            </div>
            <div className="p-4 rounded-xl bg-[#202622] border border-[#303831]">
              <div className="text-3xl font-mono font-bold text-[#F1F3ED]">{facultyCount}</div>
              <p className="text-[11px] font-mono text-[#A0A89F] uppercase tracking-wider mt-1">Faculty Instructors</p>
            </div>
            <div className="p-4 rounded-xl bg-[#202622] border border-[#303831]">
              <div className="text-3xl font-mono font-bold text-[#F1F3ED]">{subjectCount}</div>
              <p className="text-[11px] font-mono text-[#A0A89F] uppercase tracking-wider mt-1">Academic Courses</p>
            </div>
            <div className="p-4 rounded-xl bg-[#202622] border border-[#303831]">
              <div className="text-3xl font-mono font-bold text-[#C6F36B]">{sessionCount}</div>
              <p className="text-[11px] font-mono text-[#A0A89F] uppercase tracking-wider mt-1">Conducted Sessions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Architecture Pipeline */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#202622] border border-[#303831] text-[#C6F36B] font-mono text-xs font-semibold mb-3">
            System Mechanics
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight">
            How Attendance Verification Works
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[#A0A89F] leading-relaxed">
            Eliminating proxy attendance and manual errors through continuous server-side authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#171B18] border border-[#303831] relative">
            <span className="font-mono text-xs text-[#C6F36B] font-bold">01 // CREATION</span>
            <h4 className="text-sm font-bold text-[#F1F3ED] mt-2 mb-1.5">Faculty Starts Session</h4>
            <p className="text-xs text-[#A0A89F] leading-relaxed">
              Faculty launches a class session for an assigned course, setting duration and period.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#171B18] border border-[#303831] relative">
            <span className="font-mono text-xs text-[#C6F36B] font-bold">02 // CRYPTOGRAPHY</span>
            <h4 className="text-sm font-bold text-[#F1F3ED] mt-2 mb-1.5">Ephemeral QR Minting</h4>
            <p className="text-xs text-[#A0A89F] leading-relaxed">
              Server generates random 24-byte tokens with SHA-256 validation and 120s expiry.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#171B18] border border-[#303831] relative">
            <span className="font-mono text-xs text-[#C6F36B] font-bold">03 // INGESTION</span>
            <h4 className="text-sm font-bold text-[#F1F3ED] mt-2 mb-1.5">Device Scan</h4>
            <p className="text-xs text-[#A0A89F] leading-relaxed">
              Student points smartphone camera at screen. Payload is sent to API for cryptographic verification.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#171B18] border border-[#303831] relative">
            <span className="font-mono text-xs text-[#C6F36B] font-bold">04 // RECONCILIATION</span>
            <h4 className="text-sm font-bold text-[#F1F3ED] mt-2 mb-1.5">Atomic Check-In</h4>
            <p className="text-xs text-[#A0A89F] leading-relaxed">
              PostgreSQL composite unique constraint prevents duplicates; 75% standing recalculates instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Institutional Compliance Notice */}
      <section className="pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-xl bg-[#171B18] border border-[#303831] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#202622] border border-[#303831] flex items-center justify-center text-[#F0BC65] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F1F3ED]">75% Regulatory Requirement Notice</h4>
              <p className="text-xs text-[#A0A89F] mt-0.5">
                Students below 75% overall course attendance are barred from semester examinations.
              </p>
            </div>
          </div>

          <Link
            href="/sign-in?role=student"
            className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#C6F36B] border border-[#303831] font-mono text-xs font-bold transition-colors whitespace-nowrap"
          >
            Verify My Standing →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#303831] py-8 bg-[#171B18]/60 text-center text-xs text-[#A0A89F]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#F1F3ED]">AMS</span>
            <span className="text-[#303831]">•</span>
            <span>Department of Computer Science and Engineering</span>
          </div>
          <div className="text-[11px] text-[#A0A89F]">
            Karunya Institute of Technology and Sciences • Coimbatore, Tamil Nadu
          </div>
        </div>
      </footer>
    </div>
  );
}

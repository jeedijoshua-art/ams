import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import {
  QrCode,
  ShieldCheck,
  TrendingUp,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Clock,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const currentUser = await getCurrentUser();

  // Fetch real database counts
  const [studentCount, facultyCount, subjectCount, sessionCount] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.facultyProfile.count(),
    prisma.subject.count(),
    prisma.attendanceSession.count(),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950">
      <Navbar currentUser={currentUser} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-teal-400 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Department of Computer Science and Engineering • Karunya Institute</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Smart Attendance{' '}
            <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Engineered with Integrity.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            The institutional attendance management platform. Built on zero-trust server validation,
            ephemeral cryptographic QR codes, real-time roster reconciliation, and strict 75%
            regulatory compliance.
          </p>

          {/* Dual User Journeys: Student & Faculty */}
          <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Student Journey Card */}
            <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 shadow-2xl backdrop-blur-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    STUDENT PORTAL
                  </span>
                </div>

                <h3 className="text-xl font-black text-white">Student Access</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Sign in using your institutional Google account. Automatically matches against your
                  pre-enrolled student record in the college database.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Instant camera scan for live classroom QR tokens</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Subject-wise 75% attendance threshold monitoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Mathematical target calculator for shortfall recovery</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <Link
                  href="/sign-in?role=student"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-teal-500/20 group-hover:scale-[1.01]"
                >
                  <span>Student Login (Google SSO)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="mt-2 text-[11px] text-slate-500 text-center">
                  Restricted to pre-registered university roll numbers
                </p>
              </div>
            </div>

            {/* Faculty Journey Card */}
            <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 shadow-2xl backdrop-blur-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    FACULTY PORTAL
                  </span>
                </div>

                <h3 className="text-xl font-black text-white">Faculty Access</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Authenticate using credentials provisioned by the academic administrator. Manage
                  your assigned courses, batches, and live class attendance.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Generate dynamic, 120-second rolling QR sessions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Live class roster reconciliation (Present / Absent / Pending)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Manual marking & attendance corrections with audit reasons</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <Link
                  href="/sign-in?role=faculty"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 text-white font-bold text-sm transition-all shadow-md group-hover:scale-[1.01]"
                >
                  <span>Faculty Login</span>
                  <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="mt-2 text-[11px] text-slate-500 text-center">
                  Accounts provisioned by Academic Administration
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live System Metrics from Database */}
      <section className="py-12 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <GraduationCap className="w-6 h-6 text-teal-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{studentCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Enrolled Students</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Users className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{facultyCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Faculty Members</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <BookOpen className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{subjectCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Active Courses</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <CalendarCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{sessionCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Conducted Sessions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Security & Engineering Highlights */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-3">
            Institutional Standards
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Architected for Zero-Fraud Classroom Attendance
          </h2>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed">
            Eliminating attendance proxying, spreadsheet tampering, and manual calculation errors
            through cryptographically secured, server-enforced software engineering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-500/30 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Short-Lived Ephemeral QR</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sessions generate random 24-byte cryptographic tokens with 120-second rolling expiry.
              Token hashes are verified server-side, preventing screenshot forwarding outside class.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/30 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Engine Uniqueness Constraints</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Composite database uniqueness `(sessionId, studentId)` rejects race conditions and
              duplicate check-ins directly at the PostgreSQL storage engine level.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Immutable Audit Logging</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Any post-session attendance change requires faculty to record a mandatory reason. The
              original state, new state, user ID, and timestamp are preserved in the audit trail.
            </p>
          </div>
        </div>
      </section>

      {/* Statutory Attendance Regulation Notice */}
      <section className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">University 75% Attendance Requirement</h4>
              <p className="text-xs text-slate-400">
                As per university academic regulations, students with attendance below 75% are ineligible
                for end-semester examinations without sanctioned medical condonation.
              </p>
            </div>
          </div>
          <Link
            href="/sign-in?role=student"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 text-xs font-bold transition-colors whitespace-nowrap"
          >
            Check Status
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>AMS — Smart Attendance Management System • Department of Computer Science and Engineering</p>
          <p>Karunya Institute of Technology and Sciences • Coimbatore, Tamil Nadu</p>
        </div>

        {/* Development Environment Isolated Helper (Hidden in Production) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-slate-600 flex items-center justify-center gap-3">
            <span>[DEV ENVIRONMENT:</span>
            <Link href="/demo-login" className="text-teal-500/80 hover:text-teal-400 underline">
              Switch Test Persona
            </Link>
            <span>•</span>
            <Link href="/admin/login" className="text-amber-500/80 hover:text-amber-400 underline">
              Admin Entry
            </Link>
            <span>]</span>
          </div>
        )}
      </footer>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import {
  QrCode,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
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
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-slate-800">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Software Engineering Project • Karunya Institute
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Smart Attendance{' '}
            <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Engineered with Precision.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal">
            A database-backed attendance management system featuring short-lived cryptographic
            QR sessions, server-side duplicate prevention, live analytics, and automatic 75%
            threshold tracking.
          </p>

          {/* Quick Persona Launchers */}
          <div className="mt-10 max-w-3xl mx-auto p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              One-Click Persona Login (Live Demo)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/demo-login?role=ADMIN"
                className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase">Administrator</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-semibold text-white mt-1">Admin Portal</p>
                <p className="text-[11px] text-slate-400">Manage students, faculty & subjects</p>
              </Link>

              <Link
                href="/demo-login?role=FACULTY"
                className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-teal-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 uppercase">Faculty</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-semibold text-white mt-1">Dr. Sundar Raj</p>
                <p className="text-[11px] text-slate-400">Launch live QR sessions & export CSV</p>
              </Link>

              <Link
                href="/demo-login?role=STUDENT"
                className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-indigo-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase">Student</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-semibold text-white mt-1">Joshua J (URK25CS1140)</p>
                <p className="text-[11px] text-slate-400">Scan QR & track threshold percentage</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live System Metrics from Database */}
      <section className="py-12 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <GraduationCap className="w-6 h-6 text-teal-400 mx-auto mb-2" />
              <div className="text-3xl font-extrabold text-white">{studentCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Enrolled Students</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <Users className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <div className="text-3xl font-extrabold text-white">{facultyCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Faculty Members</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <BookOpen className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-extrabold text-white">{subjectCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Active Courses</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <CalendarCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-3xl font-extrabold text-white">{sessionCount}</div>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Conducted Sessions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Architectural Highlights */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">
            Engineered for Academic Integrity
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
            Beyond standard CRUD assignments.
          </h3>
          <p className="mt-4 text-slate-400 text-sm">
            Built using modern software engineering patterns, strictly adhering to relational
            integrity, zero-trust server validation, and RFC standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Expiring Cryptographic QR</h4>
            <p className="text-sm text-slate-400">
              Generates random 24-byte entropy tokens hashed via SHA-256 with 2-minute rolling
              lifetimes to combat screenshot forwarding.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Relational Uniqueness Guarantees</h4>
            <p className="text-sm text-slate-400">
              PostgreSQL composite unique constraints `(sessionId, studentId)` enforce duplicate
              prevention directly at the database engine level.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Actionable Target Calculator</h4>
            <p className="text-sm text-slate-400">
              Calculates mathematically the exact number of upcoming consecutive classes a student
              with low attendance must attend to hit the 75% threshold.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <p>AMS — Smart Attendance Management System • Software Engineering MVP</p>
        <p className="mt-1">Developed for ODD Semester 2026 • Karunya Institute of Technology and Sciences</p>
      </footer>
    </div>
  );
}

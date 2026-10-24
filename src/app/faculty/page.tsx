import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { SessionStatusBadge } from '@/components/StatusBadge';
import { Role, SessionStatus } from '@prisma/client';
import {
  School,
  BookOpen,
  CalendarCheck,
  Users,
  QrCode,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FacultyDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.FACULTY || !user.facultyProfile) {
    redirect('/unauthorized');
  }

  const facultyProfileId = user.facultyProfile.id;

  // 1. Fetch assigned subjects
  const assignedSubjects = await prisma.subject.findMany({
    where: { facultyId: facultyProfileId },
    include: {
      _count: {
        select: { enrollments: true, attendanceSessions: true },
      },
    },
    orderBy: { code: 'asc' },
  });

  const subjectIds = assignedSubjects.map((s) => s.id);

  // 2. Fetch active and past sessions for these subjects
  const [sessions, totalStudentsCount] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { subjectId: { in: subjectIds } },
      take: 8,
      orderBy: { startsAt: 'desc' },
      include: {
        subject: true,
        _count: { select: { records: true } },
      },
    }),
    prisma.enrollment.count({
      where: { subjectId: { in: subjectIds } },
    }),
  ]);

  const activeSessions = sessions.filter((s) => s.status === SessionStatus.OPEN);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <School className="w-7 h-7 text-teal-400" />
                Faculty Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Instructor:{' '}
                <span className="font-semibold text-white">{user.facultyProfile.name}</span> (
                {user.facultyProfile.employeeId}) • {user.facultyProfile.department}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/faculty/reports"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                Export CSV Sheets
              </Link>
              <Link
                href="/faculty/sessions/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
              >
                <QrCode className="w-4 h-4" />
                Create QR Session
              </Link>
            </div>
          </div>

          {/* Active Sessions Banner if any */}
          {activeSessions.length > 0 && (
            <div className="p-5 rounded-2xl bg-teal-950/30 border border-teal-500/30 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
                  <div>
                    <h3 className="text-sm font-bold text-teal-200">
                      Live Attendance Session In Progress
                    </h3>
                    <p className="text-xs text-teal-400/80">
                      {activeSessions[0].subject.code} — {activeSessions[0].subject.name} (Started{' '}
                      {activeSessions[0].startsAt.toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      )
                    </p>
                  </div>
                </div>

                <Link
                  href={`/faculty/sessions/${activeSessions[0].id}`}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
                >
                  Project QR & Monitor
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Assigned Courses"
              value={assignedSubjects.length}
              subtitle="Current Term"
              icon={BookOpen}
              color="teal"
            />
            <StatCard
              title="Students Enrolled"
              value={totalStudentsCount}
              subtitle="Across All Courses"
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Total Sessions"
              value={sessions.length}
              subtitle="Recorded in Database"
              icon={CalendarCheck}
              color="emerald"
            />
          </div>

          {/* Assigned Subjects Cards */}
          <div>
            <h2 className="text-base font-bold text-white mb-4">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
                        {sub.code}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{sub.name}</h3>
                    </div>

                    <Link
                      href={`/faculty/sessions/new?subjectId=${sub.id}`}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Take Attendance
                    </Link>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {sub._count.enrollments} Enrolled Students
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
                      {sub._count.attendanceSessions} Sessions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Attendance Sessions</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conducted classes and real-time attendance verification logs
                </p>
              </div>
              <Link
                href="/faculty/sessions/new"
                className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                + New Session
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Conducted Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Marked Attendance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        <span className="font-mono text-teal-400 mr-2">{s.subject.code}</span>
                        <span className="text-white">{s.subject.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {s.startsAt.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <SessionStatusBadge status={s.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {s._count.records} Attendees
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/faculty/sessions/${s.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs transition-colors"
                        >
                          View Session
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

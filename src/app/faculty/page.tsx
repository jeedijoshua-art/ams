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
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <School className="w-7 h-7 text-[#C6F36B]" />
                Faculty Portal
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Instructor:{' '}
                <span className="font-semibold text-[#F1F3ED]">{user.facultyProfile.name}</span> (
                {user.facultyProfile.employeeId}) • {user.facultyProfile.department}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/faculty/reports"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171B18] border border-[#303831] text-xs font-semibold text-[#A0A89F] hover:text-[#F1F3ED] hover:bg-[#202622] transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#C6F36B]" />
                Export CSV Sheets
              </Link>
              <Link
                href="/faculty/sessions/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C6F36B] text-[#101211] text-xs font-bold hover:bg-[#b5e855] transition-colors shadow-lg shadow-[#C6F36B]/20"
              >
                <QrCode className="w-4 h-4" />
                Create QR Session
              </Link>
            </div>
          </div>

          {/* Active Sessions Banner if any */}
          {activeSessions.length > 0 && (
            <div className="p-5 rounded-xl bg-[#C6F36B]/10 border border-[#C6F36B]/30 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#C6F36B] animate-ping" />
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F3ED]">
                      Live Attendance Session In Progress
                    </h3>
                    <p className="text-xs text-[#C6F36B]">
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
                  className="px-4 py-2 rounded-xl bg-[#C6F36B] text-[#101211] font-bold text-xs hover:bg-[#b5e855] transition-all flex items-center gap-1.5 shadow-md shadow-[#C6F36B]/20"
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
              color="lime"
            />
            <StatCard
              title="Students Enrolled"
              value={totalStudentsCount}
              subtitle="Across All Courses"
              icon={Users}
              color="lime"
            />
            <StatCard
              title="Total Sessions"
              value={sessions.length}
              subtitle="Recorded in Database"
              icon={CalendarCheck}
              color="lime"
            />
          </div>

          {/* Assigned Subjects Cards */}
          <div>
            <h2 className="text-base font-bold text-[#F1F3ED] mb-4">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedSubjects.length === 0 ? (
                <div className="col-span-full p-8 text-center text-[#A0A89F] text-xs rounded-xl bg-[#171B18] border border-[#303831]">
                  No courses currently assigned to your faculty profile. Please contact your academic administrator.
                </div>
              ) : (
                assignedSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#C6F36B]/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#202622] text-[#C6F36B] border border-[#303831]">
                          {sub.code}
                        </span>
                        <h3 className="text-base font-bold text-[#F1F3ED] mt-2">{sub.name}</h3>
                      </div>

                      <Link
                        href={`/faculty/sessions/new?subjectId=${sub.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#C6F36B]/10 hover:bg-[#C6F36B]/20 text-[#C6F36B] border border-[#C6F36B]/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Take Attendance
                      </Link>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#A0A89F] mt-4 pt-4 border-t border-[#303831]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#A0A89F]" />
                        {sub._count.enrollments} Enrolled Students
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5 text-[#A0A89F]" />
                        {sub._count.attendanceSessions} Sessions
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#303831] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F1F3ED]">Attendance Sessions</h3>
                <p className="text-xs text-[#A0A89F] mt-0.5">
                  Conducted classes and real-time attendance verification logs
                </p>
              </div>
              <Link
                href="/faculty/sessions/new"
                className="text-xs font-bold text-[#C6F36B] hover:text-[#D4FF83] flex items-center gap-1"
              >
                + New Session
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#101211] text-[#A0A89F] font-semibold uppercase tracking-wider border-b border-[#303831]">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Conducted Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Marked Attendance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#A0A89F] text-xs">
                        No attendance sessions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-[#202622]/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium">
                          <span className="font-mono text-[#C6F36B] mr-2">{s.subject.code}</span>
                          <span className="text-[#F1F3ED]">{s.subject.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#A0A89F]">
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
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#F1F3ED]">
                          {s._count.records} Attendees
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/faculty/sessions/${s.id}`}
                            className="px-2.5 py-1 rounded-lg bg-[#202622] hover:bg-[#303831] text-[#C6F36B] font-semibold text-xs transition-colors"
                          >
                            View Session
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

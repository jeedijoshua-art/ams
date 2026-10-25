import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { AttendanceStatusBadge, SessionStatusBadge } from '@/components/StatusBadge';
import { Role, AttendanceStatus, SessionStatus } from '@prisma/client';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Settings,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/admin/login');
  }
  if (user.role !== Role.ADMIN) {
    redirect('/unauthorized?reason=admin_required');
  }

  // Fetch real counts & data
  const [
    studentCount,
    facultyCount,
    subjectCount,
    sessionCount,
    totalRecordsCount,
    attendedRecordsCount,
    recentSessions,
    settings,
  ] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.facultyProfile.count(),
    prisma.subject.count(),
    prisma.attendanceSession.count(),
    prisma.attendanceRecord.count(),
    prisma.attendanceRecord.count({
      where: {
        status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
      },
    }),
    prisma.attendanceSession.findMany({
      take: 6,
      orderBy: { startsAt: 'desc' },
      include: {
        subject: { select: { code: true, name: true } },
        createdBy: {
          select: {
            facultyProfile: { select: { name: true } },
          },
        },
        _count: { select: { records: true } },
      },
    }),
    prisma.systemSetting.findMany(),
  ]);

  const threshold = parseFloat(
    settings.find((s) => s.key === 'attendance_threshold')?.value || '75'
  );

  const institutionAvg =
    totalRecordsCount > 0
      ? Math.round((attendedRecordsCount / totalRecordsCount) * 1000) / 10
      : 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Administrator Control Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Institution-wide telemetry, academic records, and session administration.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Threshold ({threshold}%)
              </Link>
              <Link
                href="/admin/students"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Manage Records
              </Link>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Students"
              value={studentCount}
              subtitle="Registered & Active"
              icon={GraduationCap}
              color="teal"
            />
            <StatCard
              title="Faculty Strength"
              value={facultyCount}
              subtitle="Across Departments"
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Accredited Courses"
              value={subjectCount}
              subtitle="Active Curriculum"
              icon={BookOpen}
              color="amber"
            />
            <StatCard
              title="Institution Avg"
              value={`${institutionAvg}%`}
              subtitle={`Min Required: ${threshold}%`}
              icon={TrendingUp}
              color={institutionAvg >= threshold ? 'emerald' : 'rose'}
            />
          </div>

          {/* Quick Management Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/students"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-teal-500/40 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">
                  Student Directory
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Roll numbers, departments, and enrollment
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-teal-400 transition-all" />
            </Link>

            <Link
              href="/admin/subjects"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                  Subject Allotment
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Course codes and faculty assignment
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
            </Link>

            <Link
              href="/admin/enrollments"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                  Course Enrollment
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign students to active subjects
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
            </Link>
          </div>

          {/* Recent Attendance Sessions Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Latest Attendance Sessions</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time log of sessions conducted across all departments
                </p>
              </div>
              <Link
                href="/reports"
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                View Analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Conducted By</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Attendees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {recentSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <span className="font-mono text-teal-400 mr-2">{s.subject.code}</span>
                        <span className="text-white">{s.subject.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {s.createdBy.facultyProfile?.name || 'Faculty Member'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {s.startsAt.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <SessionStatusBadge status={s.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {s._count.records}
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

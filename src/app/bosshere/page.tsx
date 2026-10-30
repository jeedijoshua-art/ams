import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { SessionStatusBadge } from '@/components/StatusBadge';
import { DatabaseManagement } from '@/components/admin/DatabaseManagement';
import { getApplicationDataCounts } from '@/lib/database-reset';
import { Role, AttendanceStatus } from '@prisma/client';
import {
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BossAdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/bosshere/login');
  }
  if (user.role !== Role.ADMIN) {
    redirect('/unauthorized?reason=admin_required');
  }

  // Fetch real counts, settings, and database reset category counts in parallel
  const [
    dbCategoryCounts,
    attendedRecordsCount,
    recentSessions,
    settings,
    pendingEnrollmentRequestsCount,
  ] = await Promise.all([
    getApplicationDataCounts(),
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
    prisma.enrollmentRequest.count({
      where: { status: 'PENDING' },
    }),
  ]);

  const studentCount = dbCategoryCounts.studentProfiles;
  const facultyCount = dbCategoryCounts.facultyProfiles;
  const subjectCount = dbCategoryCounts.subjects;
  const totalRecordsCount = dbCategoryCounts.attendanceRecords;

  const threshold = parseFloat(
    settings.find((s) => s.key === 'attendance_threshold')?.value || '75'
  );

  const institutionAvg =
    totalRecordsCount > 0
      ? Math.round((attendedRecordsCount / totalRecordsCount) * 1000) / 10
      : null;

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#C6F36B]/10 text-[#C6F36B] border border-[#C6F36B]/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Boss Control Center
                </span>
                <span className="text-[11px] font-mono text-[#A0A89F]/70">/bosshere</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight">
                Administrator Control Center
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Institution-wide telemetry, academic records, database management, and system administration.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/bosshere/settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171B18] border border-[#303831] text-xs font-semibold text-[#A0A89F] hover:text-[#F1F3ED] hover:bg-[#202622] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Threshold ({threshold}%)
              </Link>
              <Link
                href="/bosshere/students"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C6F36B] text-[#101211] text-xs font-bold hover:bg-[#b5e855] transition-colors shadow-lg shadow-[#C6F36B]/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Manage Records
              </Link>
            </div>
          </div>

          {/* Pending Course Registration Alert */}
          {pendingEnrollmentRequestsCount > 0 && (
            <div className="p-4 sm:p-5 rounded-xl bg-[#F0BC65]/10 border border-[#F0BC65]/30 flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#F0BC65] animate-ping shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-[#F1F3ED] flex items-center gap-2">
                    Action Required: {pendingEnrollmentRequestsCount} Student Course Registration Request{pendingEnrollmentRequestsCount > 1 ? 's' : ''} Pending
                  </h3>
                  <p className="text-xs text-[#F0BC65]/90 mt-0.5">
                    Students have applied to enroll in curriculum subjects and require administrative authorization.
                  </p>
                </div>
              </div>

              <Link
                href="/bosshere/enrollments"
                className="px-4 py-2 rounded-lg bg-[#F0BC65] hover:bg-[#F0BC65]/90 text-[#101211] font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-md shadow-[#F0BC65]/20"
              >
                Review Applications
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Students"
              value={studentCount}
              subtitle="Registered & Active"
              icon={GraduationCap}
              color="lime"
            />
            <StatCard
              title="Faculty Strength"
              value={facultyCount}
              subtitle="Across Departments"
              icon={Users}
              color="lime"
            />
            <StatCard
              title="Accredited Courses"
              value={subjectCount}
              subtitle="Active Curriculum"
              icon={BookOpen}
              color="warning"
            />
            <StatCard
              title="Institution Avg"
              value={institutionAvg !== null ? `${institutionAvg}%` : 'N/A'}
              subtitle={institutionAvg !== null ? `Min Required: ${threshold}%` : 'No sessions evaluated'}
              icon={TrendingUp}
              color={institutionAvg !== null ? (institutionAvg >= threshold ? 'success' : 'error') : 'lime'}
            />
          </div>

          {/* Quick Management Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/bosshere/students"
              className="p-5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#C6F36B]/40 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-bold text-[#F1F3ED] group-hover:text-[#C6F36B] transition-colors">
                  Student Directory
                </p>
                <p className="text-xs text-[#A0A89F] mt-0.5">
                  Roll numbers, departments, and enrollment
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A0A89F] group-hover:translate-x-1 group-hover:text-[#C6F36B] transition-all" />
            </Link>

            <Link
              href="/bosshere/subjects"
              className="p-5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#F0BC65]/40 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-bold text-[#F1F3ED] group-hover:text-[#F0BC65] transition-colors">
                  Subject Allotment
                </p>
                <p className="text-xs text-[#A0A89F] mt-0.5">
                  Course codes and faculty assignment
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A0A89F] group-hover:translate-x-1 group-hover:text-[#F0BC65] transition-all" />
            </Link>

            <Link
              href="/bosshere/enrollments"
              className="p-5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#C6F36B]/40 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-bold text-[#F1F3ED] group-hover:text-[#C6F36B] transition-colors">
                  Course Enrollment
                </p>
                <p className="text-xs text-[#A0A89F] mt-0.5">
                  Assign students to active subjects
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A0A89F] group-hover:translate-x-1 group-hover:text-[#C6F36B] transition-all" />
            </Link>
          </div>

          {/* Dedicated Database Management Section */}
          <section>
            <DatabaseManagement initialCounts={dbCategoryCounts} />
          </section>

          {/* Recent Attendance Sessions Table */}
          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#303831] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F1F3ED]">Latest Attendance Sessions</h3>
                <p className="text-xs text-[#A0A89F] mt-0.5">
                  Real-time log of sessions conducted across all departments
                </p>
              </div>
              <Link
                href="/faculty/reports"
                className="text-xs font-semibold text-[#C6F36B] hover:text-[#b5e855] flex items-center gap-1"
              >
                View Reports <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#101211] text-[#A0A89F] font-semibold uppercase tracking-wider border-b border-[#303831]">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Conducted By</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Attendees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                  {recentSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[#A0A89F] text-xs">
                        No attendance sessions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-[#202622]/40 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          <span className="font-mono text-[#C6F36B] mr-2">{s.subject.code}</span>
                          <span className="text-[#F1F3ED]">{s.subject.name}</span>
                        </td>
                        <td className="py-3 px-4 text-[#A0A89F]">
                          {s.createdBy.facultyProfile?.name || 'Faculty Member'}
                        </td>
                        <td className="py-3 px-4 text-[#A0A89F]">
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
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#F1F3ED]">
                          {s._count.records}
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

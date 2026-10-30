import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role, SessionStatus, AttendanceStatus } from '@prisma/client';
import { AttendanceStatusBadge } from '@/components/StatusBadge';
import { History, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface HistoryProps {
  searchParams: Promise<{
    subjectId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function StudentAttendanceHistoryPage({ searchParams }: HistoryProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in?role=student');
  }
  if (user.role !== Role.STUDENT || !user.studentProfile) {
    redirect('/unauthorized?reason=unrecognized_student');
  }

  const studentId = user.studentProfile.id;
  const params = await searchParams;
  const selectedSubjectId = params?.subjectId || '';
  const fromDate = params?.fromDate || '';
  const toDate = params?.toDate || '';

  // 1. Get all subjects the student is enrolled in
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { subject: true },
  });

  const enrolledSubjectIds = enrollments.map((e) => e.subjectId);

  // 2. Build where filter
  const whereFilter: any = {
    subjectId: selectedSubjectId ? selectedSubjectId : { in: enrolledSubjectIds },
    status: { in: [SessionStatus.CLOSED, SessionStatus.OPEN] },
  };

  if (fromDate || toDate) {
    whereFilter.startsAt = {};
    if (fromDate) whereFilter.startsAt.gte = new Date(fromDate);
    if (toDate) whereFilter.startsAt.lte = new Date(`${toDate}T23:59:59.999Z`);
  }

  // 3. Fetch sessions for these subjects
  const sessions = await prisma.attendanceSession.findMany({
    where: whereFilter,
    include: {
      subject: {
        include: { faculty: true },
      },
      records: {
        where: { studentId },
      },
    },
    orderBy: { startsAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.STUDENT} />

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <History className="w-7 h-7 text-[#C6F36B]" />
                Attendance Timeline & History
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Verifiable chronological record of all conducted classes, periods, and your recorded presence.
              </p>
            </div>

            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs text-[#A0A89F] hover:text-[#F1F3ED]"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Hub
            </Link>
          </div>

          {/* Filter Form */}
          <form method="GET" className="p-4 rounded-xl bg-[#171B18] border border-[#303831] flex flex-wrap items-end gap-3 text-xs">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[#A0A89F] font-semibold mb-1">Filter by Course</label>
              <select
                name="subjectId"
                defaultValue={selectedSubjectId}
                className="w-full px-3 py-2 rounded-lg bg-[#202622] border border-[#303831] text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
              >
                <option value="">All Enrolled Courses</option>
                {enrollments.map((e) => (
                  <option key={e.subject.id} value={e.subject.id}>
                    {e.subject.code} — {e.subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-36">
              <label className="block text-[#A0A89F] font-semibold mb-1">From Date</label>
              <input
                type="date"
                name="fromDate"
                defaultValue={fromDate}
                className="w-full px-3 py-2 rounded-lg bg-[#202622] border border-[#303831] text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-mono"
              />
            </div>

            <div className="w-36">
              <label className="block text-[#A0A89F] font-semibold mb-1">To Date</label>
              <input
                type="date"
                name="toDate"
                defaultValue={toDate}
                className="w-full px-3 py-2 rounded-lg bg-[#202622] border border-[#303831] text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#C6F36B] hover:bg-[#D4FF83] active:bg-[#b5e855] text-[#101211] font-bold transition-all shadow-sm"
              >
                Apply Filters
              </button>

              {(selectedSubjectId || fromDate || toDate) && (
                <Link
                  href="/student/history"
                  className="px-3 py-2 rounded-lg bg-[#202622] hover:bg-[#303831] text-[#A0A89F] font-semibold transition-colors"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>

          {/* Sessions Timeline Table */}
          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-[#A0A89F] text-xs">
                No attendance sessions match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101211] text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                    <tr>
                      <th className="py-3 px-4">Date (IST)</th>
                      <th className="py-3 px-4">Course Code & Title</th>
                      <th className="py-3 px-4">Section & Period</th>
                      <th className="py-3 px-4">Faculty Instructor</th>
                      <th className="py-3 px-4 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                    {sessions.map((ses) => {
                      const rec = ses.records[0];
                      const status = rec ? rec.status : AttendanceStatus.ABSENT;

                      return (
                        <tr key={ses.id} className="hover:bg-[#202622]/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-[#F1F3ED] whitespace-nowrap">
                            {ses.startsAt.toLocaleDateString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-[#C6F36B] mr-2">
                              {ses.subject.code}
                            </span>
                            <span className="text-[#F1F3ED] font-medium">{ses.subject.name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#A0A89F] whitespace-nowrap">
                            {ses.classSection || 'CSE-A'} • Period {ses.period || 1}
                          </td>
                          <td className="py-3.5 px-4 text-[#A0A89F]">
                            {ses.subject.faculty?.name || 'Academic Faculty'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <AttendanceStatusBadge status={status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

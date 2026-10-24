import React from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role, SessionStatus, AttendanceStatus } from '@prisma/client';
import { AttendanceStatusBadge } from '@/components/StatusBadge';
import { History, Calendar, BookOpen, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentAttendanceHistoryPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT || !user.studentProfile) {
    redirect('/unauthorized');
  }

  const studentId = user.studentProfile.id;

  // 1. Get all subjects the student is enrolled in
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { subjectId: true },
  });

  const enrolledSubjectIds = enrollments.map((e) => e.subjectId);

  // 2. Fetch all closed sessions for these subjects
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      subjectId: { in: enrolledSubjectIds },
      status: SessionStatus.CLOSED,
    },
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.STUDENT} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <History className="w-7 h-7 text-teal-400" />
              Attendance Timeline & History
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verifiable chronological record of all conducted classes and your recorded presence.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No closed attendance sessions recorded for your enrolled courses yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date (IST)</th>
                      <th className="py-3 px-4">Course Code & Title</th>
                      <th className="py-3 px-4">Faculty Instructor</th>
                      <th className="py-3 px-4">Class Time</th>
                      <th className="py-3 px-4 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {sessions.map((ses) => {
                      const rec = ses.records[0];
                      const status = rec ? rec.status : AttendanceStatus.ABSENT;

                      return (
                        <tr key={ses.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-slate-200">
                            {ses.startsAt.toLocaleDateString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-teal-400 mr-2">
                              {ses.subject.code}
                            </span>
                            <span className="text-white font-medium">{ses.subject.name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {ses.subject.faculty?.name || 'Instructor'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {ses.startsAt.toLocaleTimeString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-right">
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

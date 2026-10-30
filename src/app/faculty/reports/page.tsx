import React from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role, SessionStatus, AttendanceStatus } from '@prisma/client';
import { calculateAttendancePercentage } from '@/lib/attendance';
import {
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FacultyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.FACULTY || !user.facultyProfile) {
    redirect('/unauthorized');
  }

  const { subjectId: querySubjectId } = await searchParams;

  // 1. Fetch assigned subjects
  const subjects = await prisma.subject.findMany({
    where: { facultyId: user.facultyProfile.id },
    orderBy: { code: 'asc' },
  });

  const activeSubjectId = querySubjectId || subjects[0]?.id;
  const currentSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0];

  let rosterWithAttendance: any[] = [];
  let conductedSessions: any[] = [];
  let threshold = 75;

  if (currentSubject) {
    const [settings, sessions, enrollments] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'attendance_threshold' } }),
      prisma.attendanceSession.findMany({
        where: {
          subjectId: currentSubject.id,
          status: SessionStatus.CLOSED,
        },
        orderBy: { startsAt: 'desc' },
        include: {
          _count: { select: { records: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: { subjectId: currentSubject.id },
        include: {
          student: {
            include: { user: { select: { email: true } } },
          },
        },
        orderBy: { student: { rollNumber: 'asc' } },
      }),
    ]);

    if (settings?.value) threshold = parseFloat(settings.value);
    conductedSessions = sessions;

    const totalConducted = sessions.length;
    const closedSessionIds = sessions.map((s) => s.id);

    // Fetch all attendance records for these sessions
    const records = await prisma.attendanceRecord.findMany({
      where: {
        sessionId: { in: closedSessionIds },
        status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
      },
      select: {
        sessionId: true,
        studentId: true,
      },
    });

    const attendedCountByStudent = new Map<string, number>();
    for (const r of records) {
      attendedCountByStudent.set(
        r.studentId,
        (attendedCountByStudent.get(r.studentId) || 0) + 1
      );
    }

    rosterWithAttendance = enrollments.map((enr) => {
      const attended = attendedCountByStudent.get(enr.studentId) || 0;
      const pct = calculateAttendancePercentage(attended, totalConducted);
      return {
        id: enr.student.id,
        rollNumber: enr.student.rollNumber,
        name: enr.student.name,
        email: enr.student.user.email,
        department: enr.student.department,
        classesAttended: attended,
        classesConducted: totalConducted,
        percentage: pct,
        isDefaulter: pct < threshold,
      };
    });
  }

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <FileSpreadsheet className="w-7 h-7 text-[#C6F36B]" />
                Attendance Reports & CSV Export
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Official regulatory sheets with student attendance metrics and RFC 4180 export.
              </p>
            </div>
          </div>

          {/* Subject Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#171B18] border border-[#303831]">
            <span className="text-xs font-semibold text-[#A0A89F] ml-2">Select Course:</span>
            {subjects.map((sub) => {
              const isSelected = sub.id === currentSubject?.id;
              return (
                <a
                  key={sub.id}
                  href={`/faculty/reports?subjectId=${sub.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#C6F36B] text-[#101211] shadow-md shadow-[#C6F36B]/20'
                      : 'bg-[#202622] text-[#A0A89F] hover:text-[#F1F3ED] hover:bg-[#303831]'
                  }`}
                >
                  {sub.code} — {sub.name}
                </a>
              );
            })}
          </div>

          {currentSubject && (
            <div className="space-y-6">
              {/* Course Attendance Roster Summary */}
              <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
                <div className="p-5 border-b border-[#303831] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#F1F3ED]">
                      {currentSubject.code} Student Attendance Breakdown
                    </h3>
                    <p className="text-xs text-[#A0A89F] mt-0.5">
                      Total Closed Sessions Evaluated: {conductedSessions.length} • Required Threshold: {threshold}%
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101211] text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                      <tr>
                        <th className="py-3 px-4">Roll Number</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 text-center">Attended / Conducted</th>
                        <th className="py-3 px-4 text-center">Attendance %</th>
                        <th className="py-3 px-4 text-right">Standing Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                      {rosterWithAttendance.map((std) => (
                        <tr key={std.id} className="hover:bg-[#202622]/40">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#C6F36B]">
                            {std.rollNumber}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#F1F3ED]">{std.name}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium">
                            {std.classesAttended} / {std.classesConducted}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`font-black text-sm ${
                                std.isDefaulter ? 'text-[#FF7777]' : 'text-[#72D6A0]'
                              }`}
                            >
                              {std.percentage}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {std.isDefaulter ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FF7777]/15 text-[#FF7777] border border-[#FF7777]/30">
                                <AlertTriangle className="w-3 h-3" />
                                Defaulter (&lt;{threshold}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#72D6A0]/15 text-[#72D6A0] border border-[#72D6A0]/30">
                                <CheckCircle2 className="w-3 h-3" />
                                In Good Standing
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Individual Session CSV Exports */}
              <div className="rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-[#F1F3ED]">
                  Export Individual Session Sheets (CSV)
                </h3>
                <p className="text-xs text-[#A0A89F]">
                  Download per-session roll call sheets compatible with Excel and institutional databases.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {conductedSessions.map((ses) => (
                    <div
                      key={ses.id}
                      className="p-3.5 rounded-xl bg-[#202622] border border-[#303831] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#F1F3ED]">
                          Session:{' '}
                          {ses.startsAt.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-[11px] text-[#A0A89F]">
                          {ses.startsAt.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {ses._count.records} Attendees
                        </p>
                      </div>

                      <a
                        href={`/api/reports/session-csv?sessionId=${ses.id}`}
                        download
                        className="p-2 rounded-lg bg-[#C6F36B]/10 hover:bg-[#C6F36B]/20 text-[#C6F36B] border border-[#C6F36B]/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

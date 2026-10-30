import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role, AttendanceStatus, SessionStatus } from '@prisma/client';
import { BarChart3, TrendingUp, AlertTriangle, Users, BookOpen } from 'lucide-react';
import { calculateAttendancePercentage } from '@/lib/attendance';

export const dynamic = 'force-dynamic';

export default async function ReportsAnalyticsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/sign-in');
  }
  if (currentUser.role === Role.STUDENT) {
    redirect('/unauthorized?reason=faculty_or_admin_required');
  }

  // 1. Fetch threshold
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'attendance_threshold' },
  });
  const threshold = parseFloat(setting?.value || '75');

  // 2. Compute Subject-Wise Average Attendance
  const subjects = await prisma.subject.findMany({
    include: {
      faculty: true,
      attendanceSessions: {
        where: { status: SessionStatus.CLOSED },
        include: {
          records: true,
        },
      },
      enrollments: true,
    },
  });

  const subjectAnalytics = subjects.map((sub) => {
    const totalSessions = sub.attendanceSessions.length;
    const enrolledCount = sub.enrollments.length;
    const possibleAttendeeSlots = totalSessions * enrolledCount;

    let totalAttended = 0;
    for (const s of sub.attendanceSessions) {
      for (const r of s.records) {
        if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) {
          totalAttended++;
        }
      }
    }

    const avgPct =
      possibleAttendeeSlots > 0
        ? Math.round((totalAttended / possibleAttendeeSlots) * 1000) / 10
        : 100;

    return {
      id: sub.id,
      code: sub.code,
      name: sub.name,
      facultyName: sub.faculty.name,
      totalSessions,
      enrolledCount,
      avgPct,
    };
  });

  // 3. Compute High-Risk / Defaulter Students (< Threshold)
  const students = await prisma.studentProfile.findMany({
    include: {
      user: { select: { email: true } },
      enrollments: {
        include: {
          subject: {
            include: {
              attendanceSessions: {
                where: { status: SessionStatus.CLOSED },
                select: { id: true },
              },
            },
          },
        },
      },
      attendanceRecords: {
        where: {
          session: { status: SessionStatus.CLOSED },
          status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
        },
      },
    },
  });

  const defaultersList = [];

  for (const std of students) {
    let totalEligibleSessions = 0;
    for (const enr of std.enrollments) {
      totalEligibleSessions += enr.subject.attendanceSessions.length;
    }

    const attendedCount = std.attendanceRecords.length;
    const pct = calculateAttendancePercentage(attendedCount, totalEligibleSessions);

    if (pct < threshold && totalEligibleSessions > 0) {
      defaultersList.push({
        rollNumber: std.rollNumber,
        name: std.name,
        department: std.department,
        email: std.user.email,
        attended: attendedCount,
        conducted: totalEligibleSessions,
        percentage: pct,
        deficit: Math.round((threshold - pct) * 10) / 10,
      });
    }
  }

  // Sort by lowest attendance first
  defaultersList.sort((a, b) => a.percentage - b.percentage);

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar currentUser={currentUser} />

      <div className="flex-1 flex">
        <Sidebar role={currentUser?.role || Role.STUDENT} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-[#C6F36B]" />
              Institutional Analytics & Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
              Cross-course attendance distributions, compliance tracking, and defaulter audits.
            </p>
          </div>

          {/* Subject Comparison Section */}
          <div className="rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#F1F3ED]">Course-Wise Attendance Compliance</h2>
              <p className="text-xs text-[#A0A89F] mt-0.5">
                Calculated across all closed sessions and enrolled student rosters. Benchmark threshold:{' '}
                <span className="font-bold text-[#C6F36B]">{threshold}%</span>
              </p>
            </div>

            <div className="space-y-4">
              {subjectAnalytics.length === 0 ? (
                <div className="p-8 text-center text-[#737E75] text-xs">
                  No courses or attendance sessions available in database.
                </div>
              ) : (
                subjectAnalytics.map((sub) => {
                  const isBelow = sub.avgPct < threshold;
                  return (
                    <div key={sub.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-[#C6F36B] mr-2">{sub.code}</span>
                          <span className="font-semibold text-[#F1F3ED]">{sub.name}</span>
                          <span className="text-[#A0A89F] ml-2">({sub.facultyName})</span>
                        </div>
                        <span
                          className={`font-mono font-bold text-sm ${
                            isBelow ? 'text-[#FF7777]' : 'text-[#72D6A0]'
                          }`}
                        >
                          {sub.avgPct}%
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-[#202622] overflow-hidden border border-[#303831]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isBelow
                              ? 'bg-[#FF7777]'
                              : 'bg-[#72D6A0]'
                          }`}
                          style={{ width: `${Math.min(100, sub.avgPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* High-Risk Defaulters Section */}
          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#303831] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F1F3ED] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF7777]" />
                  Academic Defaulter Watchlist (&lt;{threshold}%)
                </h3>
                <p className="text-xs text-[#A0A89F] mt-0.5">
                  Students failing to maintain the statutory minimum attendance threshold
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FF7777]/15 text-[#FF7777] border border-[#FF7777]/30">
                {defaultersList.length} At-Risk Students
              </span>
            </div>

            {defaultersList.length === 0 ? (
              <div className="p-12 text-center text-[#72D6A0] text-xs">
                Zero students below threshold. Full academic compliance achieved!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#202622] text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                    <tr>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Classes Attended</th>
                      <th className="py-3 px-4 text-center">Aggregate Attendance</th>
                      <th className="py-3 px-4 text-right">Shortfall Deficit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                    {defaultersList.map((d) => (
                      <tr key={d.rollNumber} className="hover:bg-[#202622]/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FF7777]">
                          {d.rollNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#F1F3ED]">{d.name}</td>
                        <td className="py-3.5 px-4 text-[#A0A89F]">{d.department}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-[#F1F3ED]">
                          {d.attended} / {d.conducted}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-black text-[#FF7777] text-sm">{d.percentage}%</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#FF7777] font-semibold">
                          -{d.deficit}% below target
                        </td>
                      </tr>
                    ))}
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

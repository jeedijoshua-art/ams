import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { AttendanceCard } from '@/components/AttendanceCard';
import { StatCard } from '@/components/StatCard';
import { Role, SessionStatus } from '@prisma/client';
import { getStudentOverallAttendance } from '@/lib/attendance';
import {
  GraduationCap,
  QrCode,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in?role=student');
  }
  if (user.role !== Role.STUDENT || !user.studentProfile) {
    redirect('/unauthorized?reason=unrecognized_student');
  }

  const student = user.studentProfile;

  // 1. Fetch system threshold
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'attendance_threshold' },
  });
  const threshold = parseFloat(setting?.value || '75');

  // 2. Fetch student's overall & subject-wise attendance using our calculation engine
  const attendanceData = await getStudentOverallAttendance(student.id, threshold);

  // 3. Check if there are any active OPEN attendance sessions for courses the student is enrolled in!
  const enrolledSubjectIds = attendanceData.subjectBreakdown.map((s) => s.subjectId);

  const activeSessions = await prisma.attendanceSession.findMany({
    where: {
      subjectId: { in: enrolledSubjectIds },
      status: SessionStatus.OPEN,
    },
    include: {
      subject: true,
      records: {
        where: { studentId: student.id },
      },
    },
  });

  // Filter out sessions where the student has ALREADY marked attendance
  const pendingActiveSessions = activeSessions.filter((s) => s.records.length === 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.STUDENT} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <GraduationCap className="w-7 h-7 text-indigo-400" />
                Student Academic Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Student:{' '}
                <span className="font-semibold text-white">{student.name}</span> • Roll:{' '}
                <span className="font-mono text-teal-400 font-bold">{student.rollNumber}</span> •{' '}
                {student.department} ({student.academicYear})
              </p>
            </div>

            <Link
              href="/student/scan"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              <QrCode className="w-4 h-4" />
              Scan Attendance QR
            </Link>
          </div>

          {/* Pending Active Attendance Check-In Alert */}
          {pendingActiveSessions.length > 0 && (
            <div className="p-5 rounded-2xl bg-teal-950/40 border border-teal-500/40 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping mt-1" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Live Attendance Session Active Now!
                    </h3>
                    <p className="text-xs text-teal-300 mt-0.5">
                      Your class for{' '}
                      <span className="font-bold text-white">
                        {pendingActiveSessions[0].subject.code} (
                        {pendingActiveSessions[0].subject.name})
                      </span>{' '}
                      is currently taking attendance.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/student/scan?sessionId=${pendingActiveSessions[0].id}`}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
                >
                  Mark Attendance Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Overall Threshold Warning Banner if Below 75% */}
          {attendanceData.isBelowThreshold && (
            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3.5">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-200">
                  Attendance Shortfall Warning — Below Regulatory {threshold}%
                </h3>
                <p className="text-xs text-rose-300/90 mt-1 max-w-3xl">
                  Your aggregate attendance is currently{' '}
                  <span className="font-black text-rose-200">
                    {attendanceData.overallPercentage}%
                  </span>
                  . Under institutional regulations, you may be debarred from semester examinations
                  unless you meet the minimum required {threshold}%. Inspect subject target
                  calculators below.
                </p>
              </div>
            </div>
          )}

          {/* Overview Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Aggregate Attendance"
              value={`${attendanceData.overallPercentage}%`}
              subtitle={`Regulatory Threshold: ${threshold}%`}
              icon={TrendingUp}
              color={attendanceData.overallPercentage >= threshold ? 'emerald' : 'rose'}
            />
            <StatCard
              title="Classes Attended"
              value={`${attendanceData.totalAttended} / ${attendanceData.totalConducted}`}
              subtitle="Closed Sessions Evaluated"
              icon={CalendarCheck}
              color="teal"
            />
            <StatCard
              title="Enrolled Subjects"
              value={attendanceData.subjectBreakdown.length}
              subtitle="Curriculum Load"
              icon={BookOpen}
              color="indigo"
            />
          </div>

          {/* Subject-wise Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Subject-Wise Attendance</h2>
                <p className="text-xs text-slate-400">
                  Real-time percentage calculations and classes required to meet the {threshold}% target
                </p>
              </div>
              <Link
                href="/student/history"
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                Detailed Session Logs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {attendanceData.subjectBreakdown.map((item) => (
                <AttendanceCard
                  key={item.subjectId}
                  code={item.code}
                  name={item.name}
                  facultyName={item.facultyName}
                  stats={item.stats}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

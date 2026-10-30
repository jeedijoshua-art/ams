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
import { getStudentOverallAttendance, getAttendanceThreshold } from '@/lib/attendance';
import {
  GraduationCap,
  QrCode,
  TrendingUp,
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
    console.warn('[AUTH-DIAGNOSTIC] Decision Point 6 Rejection:', {
      role: user?.role,
      hasStudentProfile: Boolean(user?.studentProfile),
      rejectionReasonCode: 'unrecognized_student',
    });
    redirect('/unauthorized?reason=unrecognized_student');
  }

  const student = user.studentProfile;

  // 1. Fetch system threshold (cached in memory)
  const threshold = await getAttendanceThreshold();

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
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex">
        <Sidebar role={Role.STUDENT} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <GraduationCap className="w-7 h-7 text-[#C6F36B]" />
                Student Academic Hub
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Student:{' '}
                <span className="font-semibold text-[#F1F3ED]">{student.name}</span> • Roll:{' '}
                <span className="font-mono text-[#C6F36B] font-bold">{student.rollNumber}</span> •{' '}
                {student.department} ({student.academicYear})
              </p>
            </div>

            <Link
              href="/student/scan"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] text-xs font-bold transition-all shadow-lg shadow-[#C6F36B]/20"
            >
              <QrCode className="w-4 h-4" />
              Scan Attendance QR
            </Link>
          </div>

          {/* Pending Active Attendance Check-In Alert */}
          {pendingActiveSessions.length > 0 && (
            <div className="p-5 rounded-xl bg-[#C6F36B]/10 border border-[#C6F36B]/40 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="w-3 h-3 rounded-full bg-[#C6F36B] animate-ping mt-1" />
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F3ED]">
                      Live Attendance Session Active Now!
                    </h3>
                    <p className="text-xs text-[#A0A89F] mt-0.5">
                      Your class for{' '}
                      <span className="font-bold text-[#F1F3ED]">
                        {pendingActiveSessions[0].subject.code} (
                        {pendingActiveSessions[0].subject.name})
                      </span>{' '}
                      is currently taking attendance.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/student/scan?sessionId=${pendingActiveSessions[0].id}`}
                  className="px-4 py-2 rounded-xl bg-[#C6F36B] text-[#101211] font-bold text-xs hover:bg-[#b5e855] transition-all flex items-center gap-1.5 shadow-md shadow-[#C6F36B]/20"
                >
                  Mark Attendance Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Overall Threshold Warning Banner if Below 75% */}
          {attendanceData.isBelowThreshold && (
            <div className="p-5 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/30 flex items-start gap-3.5">
              <ShieldAlert className="w-6 h-6 text-[#FF7777] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#F1F3ED]">
                  Attendance Shortfall Warning — Below Regulatory {threshold}%
                </h3>
                <p className="text-xs text-[#FF7777] mt-1 max-w-3xl">
                  Your aggregate attendance is currently{' '}
                  <span className="font-black text-[#F1F3ED]">
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
              value={attendanceData.totalConducted === 0 ? '100%' : `${attendanceData.overallPercentage}%`}
              subtitle={
                attendanceData.totalConducted === 0
                  ? '0 attended / 0 eligible classes (In Good Standing)'
                  : `Regulatory Threshold: ${threshold}%`
              }
              icon={TrendingUp}
              color={
                attendanceData.totalConducted === 0
                  ? 'success'
                  : attendanceData.overallPercentage >= threshold
                  ? 'success'
                  : 'error'
              }
            />
            <StatCard
              title="Classes Attended"
              value={
                attendanceData.totalConducted === 0
                  ? '0 / 0'
                  : `${attendanceData.totalAttended} / ${attendanceData.totalConducted}`
              }
              subtitle={
                attendanceData.totalConducted === 0
                  ? 'No classes conducted yet'
                  : 'Closed Sessions Evaluated'
              }
              icon={CalendarCheck}
              color="lime"
            />
            <StatCard
              title="Enrolled Subjects"
              value={attendanceData.subjectBreakdown.length}
              subtitle="Curriculum Load"
              icon={BookOpen}
              color="lime"
            />
          </div>

          {/* Subject-wise Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#F1F3ED]">Subject-Wise Attendance</h2>
                <p className="text-xs text-[#A0A89F]">
                  Real-time percentage calculations and classes required to meet the {threshold}% target
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/student/courses"
                  className="text-xs font-semibold text-[#A0A89F] hover:text-[#F1F3ED] flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#C6F36B]" />
                  Course Registration
                </Link>
                <Link
                  href="/student/history"
                  className="text-xs font-semibold text-[#C6F36B] hover:text-[#b5e855] flex items-center gap-1"
                >
                  Detailed Session Logs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {attendanceData.subjectBreakdown.length === 0 ? (
                <div className="col-span-full p-10 text-center rounded-xl bg-[#171B18] border border-[#303831] space-y-4 shadow-xl">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-[#C6F36B]/10 border border-[#C6F36B]/30 flex items-center justify-center text-[#C6F36B]">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F1F3ED]">No Course Enrollments Yet</h3>
                    <p className="text-xs text-[#A0A89F] max-w-md mx-auto mt-1">
                      You are not enrolled in any academic courses. Browse institutional offerings and submit an enrollment request to begin attending sessions.
                    </p>
                  </div>
                  <Link
                    href="/student/courses"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] font-bold text-xs transition-all shadow-lg shadow-[#C6F36B]/20"
                  >
                    Browse & Register Courses
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                attendanceData.subjectBreakdown.map((item) => (
                  <AttendanceCard
                    key={item.subjectId}
                    code={item.code}
                    name={item.name}
                    facultyName={item.facultyName}
                    stats={item.stats}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

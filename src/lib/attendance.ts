import { AttendanceStatus, SessionStatus } from '@prisma/client';
import prisma from './prisma';

export interface AttendanceStats {
  classesConducted: number;
  classesAttended: number; // PRESENT + LATE
  classesAbsent: number;
  attendancePercentage: number;
  threshold: number;
  isBelowThreshold: boolean;
  classesNeededForThreshold: number;
}

export function calculateAttendancePercentage(
  attended: number,
  conducted: number
): number {
  if (conducted <= 0) {
    return 100.0; // By convention, if no sessions were conducted yet, student is in good standing
  }
  const pct = (attended / conducted) * 100;
  return Math.round(pct * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculates how many consecutive upcoming classes a student must attend
 * to bring their attendance percentage up to targetThreshold (default 75%).
 */
export function calculateClassesNeeded(
  attended: number,
  conducted: number,
  targetThreshold = 75
): number {
  if (conducted <= 0) return 0;
  const currentPct = (attended / conducted) * 100;
  if (currentPct >= targetThreshold) return 0;

  const P = targetThreshold / 100;
  if (P >= 1) {
    // If target is 100% and student already missed at least 1, they can never reach 100%
    return Infinity;
  }

  // Formula: (A + x) / (C + x) >= P
  // A + x >= P*C + P*x
  // x*(1 - P) >= P*C - A
  // x = ceil((P*C - A) / (1 - P))
  const needed = Math.ceil((P * conducted - attended) / (1 - P));
  return Math.max(0, needed);
}

/**
 * Computes attendance metrics for a student in a specific subject.
 */
export async function getStudentSubjectAttendance(
  studentProfileId: string,
  subjectId: string,
  threshold = 75
): Promise<AttendanceStats> {
  // Fetch all eligible sessions (CLOSED, non-cancelled) for this subject
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      subjectId,
      status: SessionStatus.CLOSED,
    },
    select: { id: true },
  });

  const sessionIds = sessions.map((s) => s.id);
  const classesConducted = sessionIds.length;

  if (classesConducted === 0) {
    return {
      classesConducted: 0,
      classesAttended: 0,
      classesAbsent: 0,
      attendancePercentage: 100.0,
      threshold,
      isBelowThreshold: false,
      classesNeededForThreshold: 0,
    };
  }

  // Fetch student's attendance records for these closed sessions
  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId: studentProfileId,
      sessionId: { in: sessionIds },
    },
    select: { status: true },
  });

  let attended = 0;
  let absent = 0;

  // Track records found
  for (const r of records) {
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) {
      attended++;
    } else {
      absent++;
    }
  }

  // Any conducted session without an attendance record counts as absent
  const unrecorded = classesConducted - records.length;
  if (unrecorded > 0) {
    absent += unrecorded;
  }

  const attendancePercentage = calculateAttendancePercentage(attended, classesConducted);
  const isBelowThreshold = attendancePercentage < threshold;
  const classesNeededForThreshold = calculateClassesNeeded(attended, classesConducted, threshold);

  return {
    classesConducted,
    classesAttended: attended,
    classesAbsent: absent,
    attendancePercentage,
    threshold,
    isBelowThreshold,
    classesNeededForThreshold,
  };
}

/**
 * Returns overall attendance across all enrolled subjects for a student.
 */
export async function getStudentOverallAttendance(
  studentProfileId: string,
  threshold = 75
): Promise<{
  totalConducted: number;
  totalAttended: number;
  totalAbsent: number;
  overallPercentage: number;
  threshold: number;
  isBelowThreshold: boolean;
  subjectBreakdown: Array<{
    subjectId: string;
    code: string;
    name: string;
    facultyName: string;
    stats: AttendanceStats;
  }>;
}> {
  // Get all enrolled subjects
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: studentProfileId },
    include: {
      subject: {
        include: {
          faculty: true,
        },
      },
    },
  });

  let totalConducted = 0;
  let totalAttended = 0;
  let totalAbsent = 0;
  const subjectBreakdown = [];

  for (const item of enrollments) {
    const stats = await getStudentSubjectAttendance(studentProfileId, item.subjectId, threshold);
    totalConducted += stats.classesConducted;
    totalAttended += stats.classesAttended;
    totalAbsent += stats.classesAbsent;

    subjectBreakdown.push({
      subjectId: item.subject.id,
      code: item.subject.code,
      name: item.subject.name,
      facultyName: item.subject.faculty.name,
      stats,
    });
  }

  const overallPercentage = calculateAttendancePercentage(totalAttended, totalConducted);

  return {
    totalConducted,
    totalAttended,
    totalAbsent,
    overallPercentage,
    threshold,
    isBelowThreshold: overallPercentage < threshold,
    subjectBreakdown,
  };
}

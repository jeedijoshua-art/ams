import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { AttendanceStatus, Role } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sessionId } = await params;

    const body = await request.json();
    const { studentId, newStatus, reason } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
    }

    if (!newStatus || !['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'Valid attendance status (PRESENT, ABSENT, LATE, EXCUSED) is required.' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 4) {
      return NextResponse.json(
        { error: 'A valid correction reason is required (minimum 4 characters).' },
        { status: 400 }
      );
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    // Authorization: Session creator, or subject faculty, or admin
    const isSubjectFaculty =
      user.role === Role.FACULTY && session.subject.facultyId === user.facultyProfile?.id;
    const isCreator = session.createdById === user.id;
    const isAdmin = user.role === Role.ADMIN;

    if (!isSubjectFaculty && !isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to correct attendance for another faculty member\'s session.' },
        { status: 403 }
      );
    }

    // Verify student is enrolled in this subject
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId: session.subjectId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this course.' },
        { status: 400 }
      );
    }

    // Transactional attendance correction and audit creation
    const result = await prisma.$transaction(async (tx) => {
      const existingRecord = await tx.attendanceRecord.findUnique({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId,
          },
        },
      });

      let recordId = '';
      let originalStatus: AttendanceStatus = AttendanceStatus.ABSENT;

      if (existingRecord) {
        recordId = existingRecord.id;
        originalStatus = existingRecord.status;

        // Update record
        await tx.attendanceRecord.update({
          where: { id: existingRecord.id },
          data: {
            status: newStatus as AttendanceStatus,
            markedMethod: 'MANUAL',
          },
        });
      } else {
        // Create new record
        const newRecord = await tx.attendanceRecord.create({
          data: {
            sessionId,
            studentId,
            status: newStatus as AttendanceStatus,
            markedAt: new Date(),
            markedMethod: 'MANUAL',
          },
        });
        recordId = newRecord.id;
        originalStatus = AttendanceStatus.ABSENT;
      }

      // Record immutable audit entry
      const audit = await tx.attendanceCorrectionAudit.create({
        data: {
          recordId,
          originalStatus,
          newStatus: newStatus as AttendanceStatus,
          changedById: user.id,
          reason: reason.trim(),
        },
        include: {
          changedBy: {
            select: {
              email: true,
              facultyProfile: { select: { name: true } },
            },
          },
        },
      });

      return { recordId, originalStatus, newStatus, audit };
    });

    return NextResponse.json({
      success: true,
      message: `Attendance updated from ${result.originalStatus} to ${result.newStatus}. Audit logged.`,
      result,
    });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.message?.includes('UNAUTHORIZED')
      ? 401
      : 500;
    return NextResponse.json({ error: error.message || 'Correction failed' }, { status });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatSessionAttendanceCsv } from '@/lib/csv';
import { Role, AttendanceStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new NextResponse('Missing sessionId query parameter', { status: 400 });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: {
          include: { faculty: true },
        },
        records: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!session) {
      return new NextResponse('Session not found', { status: 404 });
    }

    // Authorization: Admin or Faculty creator of subject
    const isOwner =
      user.role === Role.ADMIN ||
      (user.role === Role.FACULTY && session.subject.facultyId === user.facultyProfile?.id);

    if (!isOwner) {
      return new NextResponse('Forbidden: You are not authorized to export this report', {
        status: 403,
      });
    }

    // Get all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { subjectId: session.subjectId },
      include: { student: true },
      orderBy: { student: { rollNumber: 'asc' } },
    });

    const recordMap = new Map(session.records.map((r) => [r.studentId, r]));

    const reportRows = enrollments.map((e) => {
      const rec = recordMap.get(e.studentId);
      return {
        rollNumber: e.student.rollNumber,
        studentName: e.student.name,
        department: e.student.department,
        status: rec ? rec.status : AttendanceStatus.ABSENT,
        markedAt: rec ? rec.markedAt : null,
        sessionDate: session.startsAt,
      };
    });

    const csvContent = formatSessionAttendanceCsv(
      session.subject.code,
      session.subject.name,
      reportRows
    );

    const safeDate = session.startsAt.toISOString().split('T')[0];
    const filename = `AMS_Attendance_${session.subject.code}_${safeDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, requireFaculty } from '@/lib/auth';
import { generateSecureToken, hashToken, generateQrDataUrl } from '@/lib/qr';
import { Role, SessionStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        subject: {
          include: {
            faculty: true,
          },
        },
        records: {
          include: {
            student: {
              include: { user: { select: { email: true } } },
            },
          },
          orderBy: { markedAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check authorization: faculty who owns the subject, or admin, or enrolled student
    const isOwnerFaculty =
      user.role === Role.FACULTY && session.subject.facultyId === user.facultyProfile?.id;
    const isAdmin = user.role === Role.ADMIN;
    const isStudent = user.role === Role.STUDENT;

    // Get all enrolled students for this subject
    const enrolledStudents = await prisma.enrollment.findMany({
      where: { subjectId: session.subjectId },
      include: {
        student: {
          include: { user: { select: { email: true } } },
        },
      },
      orderBy: { student: { rollNumber: 'asc' } },
    });

    // Compute list of absent students (enrolled students who don't have a record)
    const attendedStudentIds = new Set(session.records.map((r) => r.studentId));
    const absentStudents = enrolledStudents
      .filter((e) => !attendedStudentIds.has(e.studentId))
      .map((e) => e.student);

    // If session is OPEN and caller is owner faculty or admin, return active QR info if needed
    let qrInfo = null;
    if (session.status === SessionStatus.OPEN && (isOwnerFaculty || isAdmin)) {
      // If we don't have a raw token saved in memory, the faculty can trigger refresh-qr
      qrInfo = {
        expiresAt: session.qrExpiresAt,
        isExpired: session.qrExpiresAt ? new Date() > session.qrExpiresAt : false,
      };
    }

    return NextResponse.json({
      session,
      enrolledTotal: enrolledStudents.length,
      attendedTotal: session.records.length,
      absentTotal: absentStudents.length,
      absentStudents,
      isOwner: isOwnerFaculty || isAdmin,
      qrInfo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isOwner =
      (user.role === Role.FACULTY && session.subject.facultyId === user.facultyProfile?.id) ||
      user.role === Role.ADMIN;

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You are not authorized to manage this session.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, expiryMinutes = 2 } = body;

    if (action === 'refresh-qr') {
      if (session.status !== SessionStatus.OPEN) {
        return NextResponse.json(
          { error: 'Cannot refresh QR on a closed or cancelled session.' },
          { status: 400 }
        );
      }

      const newToken = generateSecureToken();
      const tokenHash = hashToken(newToken);
      const newExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      await prisma.attendanceSession.update({
        where: { id },
        data: {
          qrTokenHash: tokenHash,
          qrExpiresAt: newExpiresAt,
        },
      });

      const qrPayload = JSON.stringify({
        type: 'AMS_ATTENDANCE',
        sessionId: session.id,
        token: newToken,
      });

      const qrDataUrl = await generateQrDataUrl(qrPayload);

      return NextResponse.json({
        success: true,
        message: 'QR code refreshed successfully',
        qr: {
          token: newToken,
          expiresAt: newExpiresAt,
          dataUrl: qrDataUrl,
          payload: qrPayload,
        },
      });
    }

    if (action === 'close') {
      const updated = await prisma.attendanceSession.update({
        where: { id },
        data: {
          status: SessionStatus.CLOSED,
          endsAt: new Date(),
          qrTokenHash: null,
          qrExpiresAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Attendance session closed.',
        session: updated,
      });
    }

    if (action === 'cancel') {
      const updated = await prisma.attendanceSession.update({
        where: { id },
        data: {
          status: SessionStatus.CANCELLED,
          endsAt: new Date(),
          qrTokenHash: null,
          qrExpiresAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Attendance session cancelled.',
        session: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

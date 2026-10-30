import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFaculty, getCurrentUser } from '@/lib/auth';
import { CreateSessionSchema } from '@/lib/validators';
import { generateSecureToken, generateShortCode, hashToken, generateQrDataUrl } from '@/lib/qr';
import { Role, SessionStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const statusParam = searchParams.get('status');

    const whereClause: any = {};

    if (subjectId) {
      whereClause.subjectId = subjectId;
    }
    if (statusParam) {
      whereClause.status = statusParam as SessionStatus;
    }

    // Faculty only sees their subjects/sessions unless admin
    if (user.role === Role.FACULTY) {
      whereClause.subject = {
        facultyId: user.facultyProfile?.id,
      };
    } else if (user.role === Role.STUDENT) {
      // Students only see sessions for subjects they are enrolled in
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: user.studentProfile?.id },
        select: { subjectId: true },
      });
      whereClause.subjectId = { in: enrollments.map((e) => e.subjectId) };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            faculty: { select: { name: true } },
          },
        },
        _count: {
          select: { records: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const facultyUser = await requireFaculty();

    const body = await request.json();
    const validated = CreateSessionSchema.parse(body);

    // 1. Verify that this subject belongs to this faculty member
    const subject = await prisma.subject.findFirst({
      where: {
        id: validated.subjectId,
        facultyId: facultyUser.facultyProfile.id,
      },
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'You are not authorized to create sessions for this subject.' },
        { status: 403 }
      );
    }

    // 2. Generate random cryptographically secure token, human-friendly shortCode & hash
    const rawToken = generateSecureToken();
    const shortCode = generateShortCode();
    const tokenHash = `${hashToken(rawToken)}:${hashToken(shortCode)}`;

    const now = new Date();
    const endsAt = new Date(now.getTime() + validated.durationMinutes * 60 * 1000);
    const qrExpiresAt = new Date(now.getTime() + validated.qrExpiryMinutes * 60 * 1000);

    // 3. Create session in DB
    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: validated.subjectId,
        createdById: facultyUser.id,
        status: SessionStatus.OPEN,
        startsAt: now,
        endsAt,
        period: validated.period || 1,
        classSection: validated.classSection || 'CSE-A',
        qrTokenHash: tokenHash,
        qrExpiresAt,
      },
      include: {
        subject: true,
      },
    });

    // 4. Generate QR payload and DataURL for immediate display
    // Payload contains standard JSON with sessionId, rawToken, and shortCode
    const qrPayload = JSON.stringify({
      type: 'AMS_ATTENDANCE',
      sessionId: session.id,
      token: rawToken,
      shortCode,
    });

    const qrDataUrl = await generateQrDataUrl(qrPayload);

    return NextResponse.json(
      {
        success: true,
        session,
        qr: {
          token: rawToken,
          shortCode,
          expiresAt: qrExpiresAt,
          dataUrl: qrDataUrl,
          payload: qrPayload,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.name === 'ZodError'
      ? 400
      : 500;
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status });
  }
}

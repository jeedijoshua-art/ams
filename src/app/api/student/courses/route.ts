import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireStudent } from '@/lib/auth';
import { EnrollmentRequestStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const studentUser = await requireStudent();
    const studentId = studentUser.studentProfile.id;

    // Fetch all active subjects with nested student enrollment and request states in a single optimized query
    const subjects = await prisma.subject.findMany({
      include: {
        faculty: {
          select: {
            id: true,
            name: true,
            department: true,
            employeeId: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            attendanceSessions: true,
          },
        },
        enrollments: {
          where: { studentId },
          select: { enrolledAt: true },
        },
        enrollmentRequests: {
          where: { studentId },
          select: {
            id: true,
            status: true,
            requestedAt: true,
            reviewedAt: true,
            reviewNotes: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const courses = subjects.map((sub) => {
      const isEnrolled = sub.enrollments.length > 0;
      const enrolledAt = sub.enrollments[0]?.enrolledAt || null;
      const existingReq = sub.enrollmentRequests[0] || null;

      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        faculty: sub.faculty,
        enrolledCount: sub._count.enrollments,
        sessionsCount: sub._count.attendanceSessions,
        isEnrolled,
        enrolledAt,
        request: existingReq,
      };
    });

    return NextResponse.json({ courses });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED')
      ? 401
      : error.message?.includes('FORBIDDEN')
      ? 403
      : 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch courses' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const studentUser = await requireStudent();
    const studentId = studentUser.studentProfile.id;

    const body = await request.json();
    const { subjectId } = body;

    if (!subjectId || typeof subjectId !== 'string') {
      return NextResponse.json({ error: 'Valid course subjectId is required.' }, { status: 400 });
    }

    // Verify course exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { faculty: true },
    });

    if (!subject) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    // Check if student is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: `You are already enrolled in ${subject.code}: ${subject.name}.` },
        { status: 400 }
      );
    }

    // Check existing request
    const existingRequest = await prisma.enrollmentRequest.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
    });

    if (existingRequest && existingRequest.status === EnrollmentRequestStatus.PENDING) {
      return NextResponse.json(
        { error: 'An enrollment request for this course is already pending administrator approval.' },
        { status: 400 }
      );
    }

    // Upsert or create enrollment request
    const enrollmentRequest = await prisma.enrollmentRequest.upsert({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
      update: {
        status: EnrollmentRequestStatus.PENDING,
        requestedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        reviewNotes: null,
      },
      create: {
        studentId,
        subjectId,
        status: EnrollmentRequestStatus.PENDING,
      },
      include: {
        subject: {
          select: { code: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Enrollment request submitted for ${subject.code}: ${subject.name}. Awaiting administrator approval.`,
        request: enrollmentRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED')
      ? 401
      : error.message?.includes('FORBIDDEN')
      ? 403
      : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to submit enrollment request' },
      { status }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const studentUser = await requireStudent();
    const studentId = studentUser.studentProfile.id;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) {
      return NextResponse.json({ error: 'Course subjectId is required.' }, { status: 400 });
    }

    const existingRequest = await prisma.enrollmentRequest.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'No enrollment request found.' }, { status: 404 });
    }

    if (existingRequest.status !== EnrollmentRequestStatus.PENDING) {
      return NextResponse.json(
        { error: `Cannot cancel request with status ${existingRequest.status}.` },
        { status: 400 }
      );
    }

    await prisma.enrollmentRequest.update({
      where: { id: existingRequest.id },
      data: { status: EnrollmentRequestStatus.CANCELLED },
    });

    return NextResponse.json({
      success: true,
      message: 'Enrollment request cancelled successfully.',
    });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED')
      ? 401
      : error.message?.includes('FORBIDDEN')
      ? 403
      : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to cancel enrollment request' },
      { status }
    );
  }
}

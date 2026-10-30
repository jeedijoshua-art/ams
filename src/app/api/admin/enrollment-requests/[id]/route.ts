import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { EnrollmentRequestStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { action, reviewNotes } = body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action (APPROVE or REJECT) is required.' },
        { status: 400 }
      );
    }

    const enrollmentRequest = await prisma.enrollmentRequest.findUnique({
      where: { id },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollmentRequest) {
      return NextResponse.json({ error: 'Enrollment request not found.' }, { status: 404 });
    }

    // Execute review inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const newStatus =
        action === 'APPROVE'
          ? EnrollmentRequestStatus.APPROVED
          : EnrollmentRequestStatus.REJECTED;

      const updatedRequest = await tx.enrollmentRequest.update({
        where: { id },
        data: {
          status: newStatus,
          reviewedAt: now,
          reviewedById: adminUser.id,
          reviewNotes: reviewNotes?.trim() || null,
        },
      });

      if (action === 'APPROVE') {
        // Create actual enrollment if not already enrolled
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            studentId_subjectId: {
              studentId: enrollmentRequest.studentId,
              subjectId: enrollmentRequest.subjectId,
            },
          },
        });

        if (!existingEnrollment) {
          await tx.enrollment.create({
            data: {
              studentId: enrollmentRequest.studentId,
              subjectId: enrollmentRequest.subjectId,
              enrolledAt: now,
            },
          });
        }
      } else if (action === 'REJECT') {
        // If student had an enrollment, remove it
        await tx.enrollment.deleteMany({
          where: {
            studentId: enrollmentRequest.studentId,
            subjectId: enrollmentRequest.subjectId,
          },
        });
      }

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      message: `Request ${action === 'APPROVE' ? 'approved' : 'rejected'} for student ${
        enrollmentRequest.student.rollNumber
      } in ${enrollmentRequest.subject.code}.`,
      request: result,
    });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED')
      ? 401
      : error.message?.includes('FORBIDDEN')
      ? 403
      : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to review enrollment request' },
      { status }
    );
  }
}

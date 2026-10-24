import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { EnrollStudentSchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const studentId = searchParams.get('studentId');

    const enrollments = await prisma.enrollment.findMany({
      where: {
        ...(subjectId ? { subjectId } : {}),
        ...(studentId ? { studentId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            rollNumber: true,
            name: true,
            department: true,
            academicYear: true,
          },
        },
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            faculty: { select: { name: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return NextResponse.json({ enrollments });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED') ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = EnrollStudentSchema.parse(body);

    // Verify student and subject exist
    const student = await prisma.studentProfile.findUnique({ where: { id: validated.studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const subject = await prisma.subject.findUnique({ where: { id: validated.subjectId } });
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Check duplicate
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: validated.studentId,
          subjectId: validated.subjectId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Student is already enrolled in this subject.' },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: validated.studentId,
        subjectId: validated.subjectId,
      },
      include: {
        student: true,
        subject: true,
      },
    });

    return NextResponse.json({ success: true, enrollment }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.name === 'ZodError'
      ? 400
      : 500;
    return NextResponse.json({ error: error.message || 'Enrollment failed' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
    }

    await prisma.enrollment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Enrollment removed' });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

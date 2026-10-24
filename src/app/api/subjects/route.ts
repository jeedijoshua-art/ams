import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { CreateSubjectSchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('facultyId');

    const subjects = await prisma.subject.findMany({
      where: facultyId ? { facultyId } : undefined,
      include: {
        faculty: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            department: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            attendanceSessions: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ subjects });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED') ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = CreateSubjectSchema.parse(body);

    const existingCode = await prisma.subject.findUnique({
      where: { code: validated.code },
    });
    if (existingCode) {
      return NextResponse.json(
        { error: 'A subject with this course code already exists.' },
        { status: 400 }
      );
    }

    const faculty = await prisma.facultyProfile.findUnique({
      where: { id: validated.facultyId },
    });
    if (!faculty) {
      return NextResponse.json(
        { error: 'Selected faculty profile does not exist.' },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        code: validated.code,
        name: validated.name,
        facultyId: validated.facultyId,
      },
      include: {
        faculty: true,
      },
    });

    return NextResponse.json({ success: true, subject }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.name === 'ZodError'
      ? 400
      : 500;
    return NextResponse.json({ error: error.message || 'Validation failed' }, { status });
  }
}

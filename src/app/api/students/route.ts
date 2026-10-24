import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { CreateStudentSchema } from '@/lib/validators';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    const students = await prisma.studentProfile.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { rollNumber: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        user: { select: { email: true } },
        enrollments: {
          include: {
            subject: { select: { id: true, code: true, name: true } },
          },
        },
        _count: {
          select: { attendanceRecords: true, enrollments: true },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return NextResponse.json({ students });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED') ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = CreateStudentSchema.parse(body);

    // Check duplicate email or rollNumber
    const existingEmail = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    const existingRoll = await prisma.studentProfile.findUnique({
      where: { rollNumber: validated.rollNumber },
    });
    if (existingRoll) {
      return NextResponse.json(
        { error: 'A student with this roll number already exists.' },
        { status: 400 }
      );
    }

    const authUserId = `auth_${validated.rollNumber.toLowerCase()}_${Date.now()}`;

    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        authUserId,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            name: validated.name,
            rollNumber: validated.rollNumber,
            department: validated.department,
            academicYear: validated.academicYear,
          },
        },
      },
      include: { studentProfile: true },
    });

    return NextResponse.json({ success: true, student: newUser.studentProfile }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.name === 'ZodError'
      ? 400
      : 500;
    return NextResponse.json({ error: error.message || 'Validation failed' }, { status });
  }
}

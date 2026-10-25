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
        user: { select: { email: true, isActive: true } },
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
        isActive: true,
        studentProfile: {
          create: {
            name: validated.name,
            rollNumber: validated.rollNumber,
            department: validated.department,
            academicYear: validated.academicYear,
            isActive: true,
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

export async function PATCH(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { id, isActive, name, department, academicYear, classSection } = body;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    // Update StudentProfile and linked User
    const updated = await prisma.$transaction(async (tx) => {
      if (typeof isActive === 'boolean') {
        await tx.user.update({
          where: { id: student.userId },
          data: { isActive },
        });
      }

      return tx.studentProfile.update({
        where: { id },
        data: {
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
          ...(name ? { name } : {}),
          ...(department ? { department } : {}),
          ...(academicYear ? { academicYear } : {}),
          ...(classSection ? { classSection } : {}),
        },
        include: {
          user: { select: { email: true, isActive: true } },
        },
      });
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Update failed' }, { status });
  }
}

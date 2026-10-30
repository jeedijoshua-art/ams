import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { CreateStudentSchema } from '@/lib/validators';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { invalidateUserSessionCache } from '@/auth';

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    const [setting, students] = await Promise.all([
      prisma.systemSetting.findUnique({
        where: { key: 'attendance_threshold' },
      }),
      prisma.studentProfile.findMany({
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
              subject: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  attendanceSessions: {
                    where: { status: 'CLOSED' },
                    select: { id: true },
                  },
                },
              },
            },
          },
          attendanceRecords: {
            where: {
              status: { in: ['PRESENT', 'LATE'] },
              session: { status: 'CLOSED' },
            },
            select: { id: true },
          },
        },
        orderBy: { rollNumber: 'asc' },
      }),
    ]);

    const threshold = parseFloat(setting?.value || '75');

    const enrichedStudents = students.map((std) => {
      let totalConducted = 0;
      for (const enr of std.enrollments) {
        totalConducted += enr.subject.attendanceSessions.length;
      }
      const totalAttended = std.attendanceRecords.length;
      const attendancePercentage =
        totalConducted > 0
          ? Math.round((totalAttended / totalConducted) * 1000) / 10
          : 100.0;

      return {
        id: std.id,
        userId: std.userId,
        rollNumber: std.rollNumber,
        name: std.name,
        department: std.department,
        academicYear: std.academicYear,
        isActive: std.isActive,
        user: std.user,
        enrollments: std.enrollments.map((e) => ({
          id: e.subject.id,
          code: e.subject.code,
          name: e.subject.name,
        })),
        totalConducted,
        totalAttended,
        attendancePercentage,
        isBelowThreshold: attendancePercentage < threshold && totalConducted > 0,
      };
    });

    return NextResponse.json({ students: enrichedStudents, threshold });
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
    const passwordHash = validated.password
      ? await bcrypt.hash(validated.password, 10)
      : null;

    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        authUserId,
        role: Role.STUDENT,
        isActive: true,
        passwordHash,
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
    const { id, isActive, name, department, academicYear, classSection, email, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
    }

    if (password !== undefined && typeof password === 'string' && password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
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
      const userUpdates: any = {};
      if (typeof isActive === 'boolean') {
        userUpdates.isActive = isActive;
      }
      if (password && typeof password === 'string') {
        userUpdates.passwordHash = await bcrypt.hash(password, 10);
      }
      if (email && typeof email === 'string') {
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await tx.user.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: 'insensitive' },
            id: { not: student.userId },
          },
        });
        if (existing) {
          throw new Error('A user with this email address already exists.');
        }
        userUpdates.email = normalizedEmail;
      }

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: student.userId },
          data: userUpdates,
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

    invalidateUserSessionCache(student.userId);

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Update failed' }, { status });
  }
}

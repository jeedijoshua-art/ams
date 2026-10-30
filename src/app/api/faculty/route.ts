import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { CreateFacultySchema } from '@/lib/validators';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { invalidateUserSessionCache } from '@/auth';

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    const faculty = await prisma.facultyProfile.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        user: { select: { email: true, isActive: true, forcePasswordChange: true } },
        subjects: {
          select: {
            id: true,
            code: true,
            name: true,
            _count: { select: { enrollments: true, attendanceSessions: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ faculty });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED') ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = CreateFacultySchema.parse(body);

    const existingEmail = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    const existingEmp = await prisma.facultyProfile.findUnique({
      where: { employeeId: validated.employeeId },
    });
    if (existingEmp) {
      return NextResponse.json(
        { error: 'A faculty member with this Employee ID already exists.' },
        { status: 400 }
      );
    }

    const generatedPassword = crypto.randomBytes(8).toString('base64url');
    const rawPassword = validated.password?.trim() || generatedPassword;
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const authUserId = `auth_fac_${validated.employeeId.toLowerCase()}_${Date.now()}`;

    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        authUserId,
        role: Role.FACULTY,
        isActive: true,
        passwordHash,
        forcePasswordChange: !validated.password,
        facultyProfile: {
          create: {
            name: validated.name,
            employeeId: validated.employeeId,
            department: validated.department,
            isActive: true,
          },
        },
      },
      include: { facultyProfile: true },
    });

    return NextResponse.json(
      {
        success: true,
        faculty: newUser.facultyProfile,
        temporaryPassword: !validated.password ? rawPassword : null,
      },
      { status: 201 }
    );
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
    const { id, isActive, name, department, subjectIds, newPassword, resetPassword } = body;

    if (!id) {
      return NextResponse.json({ error: 'Faculty ID is required.' }, { status: 400 });
    }

    const faculty = await prisma.facultyProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!faculty) {
      return NextResponse.json({ error: 'Faculty record not found.' }, { status: 404 });
    }

    let finalPassword: string | null = null;
    if (newPassword && typeof newPassword === 'string' && newPassword.trim().length >= 6) {
      finalPassword = newPassword.trim();
    } else if (resetPassword === true) {
      finalPassword = crypto.randomBytes(8).toString('base64url');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const userUpdates: any = {};
      if (typeof isActive === 'boolean') {
        userUpdates.isActive = isActive;
      }
      if (finalPassword) {
        userUpdates.passwordHash = await bcrypt.hash(finalPassword, 10);
        userUpdates.forcePasswordChange = true;
      }

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: faculty.userId },
          data: userUpdates,
        });
      }

      return tx.facultyProfile.update({
        where: { id },
        data: {
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
          ...(name ? { name } : {}),
          ...(department ? { department } : {}),
          ...(Array.isArray(subjectIds)
            ? {
                subjects: {
                  set: subjectIds.map((subId: string) => ({ id: subId })),
                },
              }
            : {}),
        },
        include: {
          user: { select: { email: true, isActive: true, forcePasswordChange: true } },
          subjects: true,
        },
      });
    });

    invalidateUserSessionCache(faculty.userId);

    return NextResponse.json({
      success: true,
      faculty: updated,
      temporaryPassword: finalPassword,
    });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

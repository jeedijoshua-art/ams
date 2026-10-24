import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { CreateFacultySchema } from '@/lib/validators';
import { Role } from '@prisma/client';

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
        user: { select: { email: true } },
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

    const authUserId = `auth_fac_${validated.employeeId.toLowerCase()}_${Date.now()}`;

    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        authUserId,
        role: Role.FACULTY,
        facultyProfile: {
          create: {
            name: validated.name,
            employeeId: validated.employeeId,
            department: validated.department,
          },
        },
      },
      include: { facultyProfile: true },
    });

    return NextResponse.json({ success: true, faculty: newUser.facultyProfile }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.name === 'ZodError'
      ? 400
      : 500;
    return NextResponse.json({ error: error.message || 'Validation failed' }, { status });
  }
}

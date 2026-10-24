import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isClerkConfigured } from '@/lib/auth';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && isClerkConfigured()) {
    return NextResponse.json(
      { error: 'Development user switching is disabled in production with Clerk.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userId } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        facultyProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.studentProfile?.name || user.facultyProfile?.name || 'Administrator',
      },
    });

    // Set cookie
    response.cookies.set('ams_dev_user_id', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      studentProfile: true,
      facultyProfile: true,
    },
    orderBy: { role: 'asc' },
  });

  return NextResponse.json({ users });
}

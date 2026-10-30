import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { invalidateUserSessionCache } from '@/auth';

export async function PATCH(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { studentProfileId, newPassword } = body;

    // Validate studentProfileId
    if (!studentProfileId || typeof studentProfileId !== 'string' || studentProfileId.trim().length === 0) {
      return NextResponse.json(
        { error: 'studentProfileId is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Validate newPassword
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'newPassword is required and must be a string.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'newPassword must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: 'newPassword must not exceed 128 characters.' },
        { status: 400 }
      );
    }

    // Look up the StudentProfile by ID, include the linked User
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: true },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    const { user } = studentProfile;

    // Verify the user has role STUDENT
    if (user.role !== Role.STUDENT) {
      return NextResponse.json(
        { error: 'The associated user does not have the STUDENT role.' },
        { status: 403 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password hash
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate the user's session cache
    await invalidateUserSessionCache(user.id);

    return NextResponse.json({
      success: true,
      studentEmail: user.email,
    });
  } catch (error: any) {
    // If requireAdmin() throws a redirect or auth Response, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    const status = error?.message?.includes('FORBIDDEN')
      ? 403
      : error?.message?.includes('UNAUTHORIZED')
      ? 401
      : 500;

    return NextResponse.json(
      { error: error?.message || 'Internal server error.' },
      { status }
    );
  }
}

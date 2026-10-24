import { cookies, headers } from 'next/headers';
import prisma from './prisma';
import { Role, User, StudentProfile, FacultyProfile } from '@prisma/client';

export type AuthUser = User & {
  studentProfile?: StudentProfile | null;
  facultyProfile?: FacultyProfile | null;
};

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_')
  );
}

/**
 * Returns the currently authenticated user from the database,
 * resolving via Clerk in production (or when configured),
 * or via the dev-authenticated session cookie in development.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const clerkEnabled = isClerkConfigured();

  if (clerkEnabled) {
    try {
      const { auth, currentUser: clerkCurrentUser } = await import('@clerk/nextjs/server');
      const authSession = await auth();
      if (!authSession || !authSession.userId) {
        return null;
      }

      // Try finding user by authUserId
      let dbUser = await prisma.user.findUnique({
        where: { authUserId: authSession.userId },
        include: {
          studentProfile: true,
          facultyProfile: true,
        },
      });

      // If user exists in Clerk but not in DB yet, attempt to synchronize
      if (!dbUser) {
        const clerkUser = await clerkCurrentUser();
        const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

        if (primaryEmail) {
          // Check if an existing profile exists with this email
          const existingByEmail = await prisma.user.findUnique({
            where: { email: primaryEmail },
            include: {
              studentProfile: true,
              facultyProfile: true,
            },
          });

          if (existingByEmail) {
            dbUser = await prisma.user.update({
              where: { id: existingByEmail.id },
              data: { authUserId: authSession.userId },
              include: {
                studentProfile: true,
                facultyProfile: true,
              },
            });
          }
        }
      }

      return dbUser;
    } catch (err) {
      console.error('Error verifying Clerk session:', err);
      return null;
    }
  }

  // Development / Demo Mode Adapter
  if (process.env.NODE_ENV === 'production') {
    // NEVER enable fake authentication in production
    console.error('CRITICAL: Clerk authentication is not configured in production environment.');
    return null;
  }

  // In development, resolve user from cookie or request header
  const cookieStore = await cookies();
  const reqHeaders = await headers();
  const devUserId =
    cookieStore.get('ams_dev_user_id')?.value ||
    reqHeaders.get('x-ams-user-id');

  if (devUserId) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: devUserId }, { authUserId: devUserId }, { email: devUserId }],
      },
      include: {
        studentProfile: true,
        facultyProfile: true,
      },
    });
    if (user) return user;
  }

  // Fallback to primary demo student if none chosen
  const defaultStudent = await prisma.user.findFirst({
    where: { role: Role.STUDENT },
    include: {
      studentProfile: true,
      facultyProfile: true,
    },
  });

  return defaultStudent;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: You must be signed in to perform this action.');
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== Role.ADMIN) {
    throw new Error('FORBIDDEN: Administrator access required.');
  }
  return user;
}

export async function requireFaculty(): Promise<AuthUser & { facultyProfile: FacultyProfile }> {
  const user = await requireAuth();
  if (user.role !== Role.FACULTY) {
    throw new Error('FORBIDDEN: Faculty access required.');
  }
  if (!user.facultyProfile) {
    throw new Error('FORBIDDEN: No faculty profile associated with this account.');
  }
  return user as AuthUser & { facultyProfile: FacultyProfile };
}

export async function requireStudent(): Promise<AuthUser & { studentProfile: StudentProfile }> {
  const user = await requireAuth();
  if (user.role !== Role.STUDENT) {
    throw new Error('FORBIDDEN: Student access required.');
  }
  if (!user.studentProfile) {
    throw new Error('FORBIDDEN: No student profile associated with this account.');
  }
  return user as AuthUser & { studentProfile: StudentProfile };
}

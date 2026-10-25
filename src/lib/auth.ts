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
 * Returns the currently authenticated user from the database.
 * Resolves via Clerk when configured, or via the dev session cookie/header in development.
 * Never creates arbitrary unapproved student or faculty accounts.
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

      // 1. Try finding database user linked to this Clerk userId
      let dbUser = await prisma.user.findUnique({
        where: { authUserId: authSession.userId },
        include: {
          studentProfile: true,
          facultyProfile: true,
        },
      });

      if (dbUser) {
        if (!dbUser.isActive) {
          console.warn(`User account ${dbUser.email} is deactivated.`);
          return null;
        }
        return dbUser;
      }

      // 2. If not linked yet, match verified email from Clerk against pre-approved DB records
      const clerkUser = await clerkCurrentUser();
      const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

      if (!primaryEmail) {
        return null;
      }

      // Check if this email matches the configured initial admin
      const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').toLowerCase();
      if (initialAdminEmail && primaryEmail === initialAdminEmail) {
        const adminUser = await prisma.user.upsert({
          where: { email: primaryEmail },
          update: {
            authUserId: authSession.userId,
            role: Role.ADMIN,
            isActive: true,
          },
          create: {
            email: primaryEmail,
            authUserId: authSession.userId,
            role: Role.ADMIN,
            isActive: true,
          },
          include: {
            studentProfile: true,
            facultyProfile: true,
          },
        });
        return adminUser;
      }

      // Match against pre-registered user in AMS database
      const existingByEmail = await prisma.user.findUnique({
        where: { email: primaryEmail },
        include: {
          studentProfile: true,
          facultyProfile: true,
        },
      });

      if (existingByEmail) {
        if (!existingByEmail.isActive) {
          console.warn(`Pre-registered user ${existingByEmail.email} is marked inactive.`);
          return null;
        }

        // Link verified Clerk account with existing approved database profile
        dbUser = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { authUserId: authSession.userId },
          include: {
            studentProfile: true,
            facultyProfile: true,
          },
        });
        return dbUser;
      }

      // If user signed in to Clerk but has no approved student/faculty profile in AMS DB:
      // Return null so authorization redirects them to an informative /unauthorized screen.
      console.warn(`Unregistered account signed in via Clerk: ${primaryEmail}. No matching student/faculty record.`);
      return null;
    } catch (err) {
      console.error('Error verifying Clerk session:', err);
      return null;
    }
  }

  // Development / Test Environment Session Adapter
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Clerk authentication is not configured in production environment.');
    return null;
  }

  // In development/test, resolve user from cookie or request header
  try {
    const cookieStore = await cookies();
    const reqHeaders = await headers();
    const devUserId =
      cookieStore.get('ams_dev_user_id')?.value ||
      reqHeaders.get('x-ams-user-id');

    if (devUserId) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: devUserId }, { authUserId: devUserId }, { email: devUserId }],
          isActive: true,
        },
        include: {
          studentProfile: true,
          facultyProfile: true,
        },
      });
      if (user) return user;
    }
  } catch {
    // Outside active Next.js request context (e.g. unit test runner)
  }

  // When no session cookie or header is provided, return null (unauthenticated)
  return null;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: You must be signed in to perform this action.');
  }
  if (!user.isActive) {
    throw new Error('FORBIDDEN: Your account has been deactivated. Please contact administration.');
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
  if (!user.facultyProfile || !user.facultyProfile.isActive) {
    throw new Error('FORBIDDEN: No active faculty profile associated with this account.');
  }
  return user as AuthUser & { facultyProfile: FacultyProfile };
}

export async function requireStudent(): Promise<AuthUser & { studentProfile: StudentProfile }> {
  const user = await requireAuth();
  if (user.role !== Role.STUDENT) {
    throw new Error('FORBIDDEN: Student access required.');
  }
  if (!user.studentProfile || !user.studentProfile.isActive) {
    throw new Error('FORBIDDEN: No active student profile associated with this account.');
  }
  return user as AuthUser & { studentProfile: StudentProfile };
}

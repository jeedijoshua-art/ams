import { redirect } from 'next/navigation';
import { cache } from 'react';
import prisma from './prisma';
import { Role, User, StudentProfile, FacultyProfile } from '@prisma/client';
import { auth, getCachedDbUser } from '@/auth';

export type AuthUser = User & {
  studentProfile?: StudentProfile | null;
  facultyProfile?: FacultyProfile | null;
};

export type StudentAuthUser = User & {
  studentProfile: StudentProfile;
  facultyProfile?: FacultyProfile | null;
};

export type FacultyAuthUser = User & {
  studentProfile?: StudentProfile | null;
  facultyProfile: FacultyProfile;
};

/**
 * Returns the currently authenticated user from the database.
 * Resolves via Auth.js session, cached per-request in React Server Components.
 * Seamlessly resolves both LAN HTTP session cookies (`authjs.session-token`)
 * and HTTPS tunnel session cookies (`__Secure-authjs.session-token`).
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const session = await auth();

    // Fast-path: When auth() resolves an active database-backed session,
    // reuse the canonical user object with its attached profiles directly
    if (session?.user?.id && (session.user as any).isActive) {
      return session.user as unknown as AuthUser;
    }

    let sessionUserId = session?.user?.id;
    let sessionUserEmail = session?.user?.email;

    // Dual-mode fallback: If auth() returned null due to salt mismatch (e.g. LAN HTTP vs Tunnel HTTPS),
    // extract and verify the JWT session token with cryptographic decode
    if (!sessionUserId && !sessionUserEmail) {
      try {
        const { headers } = await import('next/headers');
        const reqHeaders = await headers();
        const cookieHeader = reqHeaders.get('cookie') || '';

        const tunnelMatch = cookieHeader.match(/(?:^|;\s*)__Secure-authjs\.session-token=([^;]+)/);
        const lanMatch = cookieHeader.match(/(?:^|;\s*)authjs\.session-token=([^;]+)/);

        const rawToken = tunnelMatch?.[1] || lanMatch?.[1];
        const salt = tunnelMatch ? '__Secure-authjs.session-token' : 'authjs.session-token';

        if (rawToken) {
          const { decode } = await import('@auth/core/jwt');
          const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
          if (secret) {
            const decoded = await decode({ token: rawToken, secret, salt });
            if (decoded && (decoded.id || decoded.email)) {
              sessionUserId = (decoded.id as string) || undefined;
              sessionUserEmail = (decoded.email as string) || undefined;
            }
          }
        }
      } catch {
        // Headers called outside request scope (e.g. during certain test suites)
      }
    }

    if (sessionUserId) {
      const dbUser = await getCachedDbUser(sessionUserId);
      if (dbUser && dbUser.isActive) {
        return dbUser as unknown as AuthUser;
      }
      return null;
    }

    if (sessionUserEmail) {
      const email = sessionUserEmail.toLowerCase().trim();
      const dbUser = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' as const },
        },
        include: {
          studentProfile: true,
          facultyProfile: true,
        },
      });

      if (dbUser) {
        if (!dbUser.isActive) {
          console.warn(`[AUTH-DIAGNOSTIC] User account is deactivated for domain=@${dbUser.email.split('@')[1]}`);
          return null;
        }
        return dbUser as unknown as AuthUser;
      }
    }
  } catch (err) {
    // Can occur if called outside Next.js request context
    console.error('Auth.js session verification error:', err);
  }

  return null;
});

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

export async function requireFaculty(): Promise<FacultyAuthUser> {
  const user = await requireAuth();
  if (user.role !== Role.FACULTY) {
    throw new Error('FORBIDDEN: Faculty access required.');
  }
  if (!user.facultyProfile || !user.facultyProfile.isActive) {
    throw new Error('FORBIDDEN: Active faculty profile required.');
  }
  return user as FacultyAuthUser;
}

export async function requireStudent(): Promise<StudentAuthUser> {
  const user = await requireAuth();
  if (user.role !== Role.STUDENT) {
    throw new Error('FORBIDDEN: Student access required.');
  }
  if (!user.studentProfile || !user.studentProfile.isActive) {
    throw new Error('FORBIDDEN: Active student profile required.');
  }
  return user as StudentAuthUser;
}

export async function requireAdminPage(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/bosshere/login?callbackUrl=%2Fbosshere');
  }
  if (user.role !== Role.ADMIN) {
    redirect('/unauthorized?reason=admin_required');
  }
  return user;
}

export async function requireFacultyPage(): Promise<FacultyAuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in?role=faculty&callbackUrl=%2Ffaculty');
  }
  if (user.role !== Role.FACULTY) {
    redirect('/unauthorized?reason=faculty_required');
  }
  if (!user.facultyProfile || !user.facultyProfile.isActive) {
    redirect('/unauthorized?reason=inactive_profile');
  }
  return user as FacultyAuthUser;
}

export async function requireStudentPage(): Promise<StudentAuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in?role=student&callbackUrl=%2Fstudent');
  }
  if (user.role !== Role.STUDENT) {
    redirect('/unauthorized?reason=student_required');
  }
  if (!user.studentProfile || !user.studentProfile.isActive) {
    redirect('/unauthorized?reason=inactive_profile');
  }
  return user as StudentAuthUser;
}

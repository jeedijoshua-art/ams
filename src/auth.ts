import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/rate-limit';

const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!authSecret && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: AUTH_SECRET or NEXTAUTH_SECRET is required.');
}

// In-memory active user session cache to eliminate redundant WAN queries on concurrent requests
interface CachedUserRecord {
  user: any;
  expiresAt: number;
}

const userSessionCache = new Map<string, CachedUserRecord>();
const inFlightUserLookups = new Map<string, Promise<any>>();

export function invalidateUserSessionCache(userId?: string) {
  if (userId) {
    userSessionCache.delete(userId);
  } else {
    userSessionCache.clear();
  }
}

export async function getCachedDbUser(userId: string) {
  const cached = userSessionCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }

  let inFlight = inFlightUserLookups.get(userId);
  if (!inFlight) {
    inFlight = (async () => {
      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            id: userId,
            isActive: true,
          },
          select: {
            id: true,
            authUserId: true,
            email: true,
            role: true,
            isActive: true,
            forcePasswordChange: true,
            createdAt: true,
            updatedAt: true,
            studentProfile: true,
            facultyProfile: true,
          },
        });

        if (dbUser) {
          userSessionCache.set(userId, {
            user: dbUser,
            expiresAt: Date.now() + 15000, // 15s TTL
          });
        } else {
          userSessionCache.delete(userId);
        }
        return dbUser;
      } finally {
        inFlightUserLookups.delete(userId);
      }
    })();
    inFlightUserLookups.set(userId, inFlight);
  }

  return inFlight;
}

export const authConfig: NextAuthConfig = {
  secret: authSecret,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    Credentials({
      name: 'Institutional Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rawIdentifier = String(credentials.email || (credentials as any).username || '').toLowerCase().trim();
        const password = String(credentials.password);

        if (!rawIdentifier || !password) {
          return null;
        }

        if (isRateLimited(rawIdentifier)) {
          throw new Error('Too many failed attempts. Login throttled for 5 minutes.');
        }

        const envAdminUsername = (process.env.ADMIN_USERNAME || 'boss').toLowerCase().trim();
        const envAdminPassword = process.env.ADMIN_PASSWORD || 'Boss@123';
        const envAdminEmail = (process.env.ADMIN_EMAIL || 'boss@ams.local').toLowerCase().trim();

        // 1. Check for dedicated Administrator Credentials (boss / Boss@123)
        const isAdminIdentifier =
          rawIdentifier === envAdminUsername ||
          rawIdentifier === envAdminEmail;

        if (isAdminIdentifier) {
          let adminUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: envAdminEmail },
                { authUserId: `admin-${envAdminUsername}` },
              ],
            },
          });

          if (!adminUser) {
            adminUser = await prisma.user.findFirst({
              where: { role: Role.ADMIN },
            });
          }

          let passwordValid = false;
          if (password === envAdminPassword) {
            passwordValid = true;
          } else if (adminUser?.passwordHash) {
            passwordValid = await bcrypt.compare(password, adminUser.passwordHash);
          }

          if (!passwordValid) {
            recordFailedAttempt(rawIdentifier);
            return null;
          }

          // Ensure Admin user exists in DB with canonical role and valid UUID
          if (!adminUser) {
            const passwordHash = await bcrypt.hash(envAdminPassword, 10);
            adminUser = await prisma.user.create({
              data: {
                authUserId: `admin-${envAdminUsername}`,
                email: envAdminEmail,
                role: Role.ADMIN,
                isActive: true,
                passwordHash,
              },
            });
          } else if (!adminUser.isActive) {
            adminUser = await prisma.user.update({
              where: { id: adminUser.id },
              data: { isActive: true },
            });
          }

          clearFailedAttempts(rawIdentifier);
          return {
            id: adminUser.id,
            email: adminUser.email,
            name: 'Administrator (Boss)',
            role: Role.ADMIN,
          };
        }

        // 2. Standard Institutional Credentials (Faculty / Staff / Students)
        const user = await prisma.user.findFirst({
          where: {
            email: { equals: rawIdentifier, mode: 'insensitive' },
          },
          include: {
            facultyProfile: true,
            studentProfile: true,
          },
        });

        if (!user || !user.isActive || !user.passwordHash) {
          recordFailedAttempt(rawIdentifier);
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          recordFailedAttempt(rawIdentifier);
          return null;
        }

        if (user.role === Role.FACULTY) {
          if (!user.facultyProfile || !user.facultyProfile.isActive) {
            recordFailedAttempt(rawIdentifier);
            return null;
          }
        }

        clearFailedAttempts(rawIdentifier);

        return {
          id: user.id,
          email: user.email,
          name:
            user.facultyProfile?.name ||
            (user.role === Role.ADMIN ? 'Administrator' : user.studentProfile?.name || 'User'),
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        // 1. Explicitly require verified email claim from Google identity provider
        const isVerified = (profile as any)?.email_verified === true;
        if (!isVerified) {
          console.warn('[AUTH-AUDIT] Google sign-in rejected: unverified email or missing email_verified claim');
          return '/unauthorized?reason=unverified_email';
        }

        const rawEmail = user.email || (profile as any)?.email;
        if (!rawEmail || typeof rawEmail !== 'string') {
          console.warn('[AUTH-AUDIT] Google sign-in rejected: missing email in provider profile');
          return '/unauthorized?reason=missing_email';
        }

        const normalizedEmail = rawEmail.trim().toLowerCase();

        // 2. Strict, exact registered-email matching against AMS database
        const dbUser = await prisma.user.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: 'insensitive' },
          },
          include: { studentProfile: true },
        });

        const databaseUserMatched = Boolean(dbUser);
        const matchedUserActive = Boolean(dbUser?.isActive);
        const isStudentRole = dbUser?.role === Role.STUDENT;
        const studentProfileExistsAndActive = Boolean(
          dbUser?.studentProfile && dbUser.studentProfile.isActive
        );
        const isValidUUID = dbUser?.id
          ? /^[0-9a-f-]{36}$/i.test(dbUser.id)
          : false;

        console.log('[AUTH-AUDIT] Google Sign-In Authorization Check:', {
          googleReturnedVerifiedEmail: isVerified,
          databaseUserMatched,
          matchedUserActive,
          isStudentRole,
          studentProfileExistsAndActive,
          resolvedInternalUserIdValidUUID: isValidUUID,
          rejectionReasonCode: !databaseUserMatched
            ? 'unrecognized_student'
            : !matchedUserActive
            ? 'account_deactivated'
            : !isStudentRole || !studentProfileExistsAndActive
            ? 'unrecognized_student'
            : 'none',
        });

        if (!dbUser) {
          return '/unauthorized?reason=unrecognized_student';
        }

        if (!dbUser.isActive) {
          return '/unauthorized?reason=account_deactivated';
        }

        if (dbUser.role !== Role.STUDENT) {
          return '/unauthorized?reason=unrecognized_student';
        }

        if (!dbUser.studentProfile || !dbUser.studentProfile.isActive) {
          return '/unauthorized?reason=unrecognized_student';
        }

        // Link verified providerAccountId only if not already linked and not in conflict
        if (account.providerAccountId && dbUser.authUserId !== account.providerAccountId) {
          const conflict = await prisma.user.findUnique({
            where: { authUserId: account.providerAccountId },
          });
          if (!conflict) {
            try {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { authUserId: account.providerAccountId },
              });
              console.log('[AUTH-AUDIT] Linked verified Google provider account ID to internal student record');
            } catch (linkErr) {
              console.warn('[AUTH-AUDIT] Provider account linking skipped:', linkErr);
            }
          }
        }

        // Bind canonical internal database UUID and role to user object
        user.id = dbUser.id;
        (user as any).role = dbUser.role;
        return true;
      }

      // Institutional credentials sign-in
      return true;
    },
    async jwt({ token, user }) {
      // 1. Initial sign-in: bind user attributes from signIn/authorize callback
      if (user) {
        token.id = user.id;
        token.email = user.email;
        if ((user as any).role) {
          token.role = (user as any).role;
        }
        if ((user as any).isActive !== undefined) {
          token.isActive = (user as any).isActive;
        }
        if ((user as any).forcePasswordChange !== undefined) {
          token.forcePasswordChange = (user as any).forcePasswordChange;
        }
      }

      // 2. Only resolve from database if id or role is not yet populated
      if (!token.id || !token.role) {
        const lookupEmail = (user?.email || token.email)?.toLowerCase().trim();
        const lookupId = (user?.id || token.id) as string | undefined;

        if (lookupId || lookupEmail) {
          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                ...(lookupId ? [{ id: lookupId }] : []),
                ...(lookupEmail ? [{ email: { equals: lookupEmail, mode: 'insensitive' as const } }] : []),
              ],
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
              forcePasswordChange: true,
            },
          });

          if (dbUser) {
            // Store ONLY internal PostgreSQL UUID and verified role
            token.id = dbUser.id;
            token.email = dbUser.email;
            token.role = dbUser.role;
            token.isActive = dbUser.isActive;
            token.forcePasswordChange = dbUser.forcePasswordChange;
          } else {
            // Lookup failed: Do NOT substitute Google provider sub for token.id!
            delete token.id;
            delete (token as any).role;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        const dbUser = await getCachedDbUser(token.id as string);

        if (dbUser) {
          session.user.id = dbUser.id; // Canonical internal PostgreSQL UUID
          (session.user as any).authUserId = dbUser.authUserId;
          session.user.email = dbUser.email;
          (session.user as any).role = dbUser.role;
          (session.user as any).isActive = dbUser.isActive;
          (session.user as any).forcePasswordChange = dbUser.forcePasswordChange;
          (session.user as any).createdAt = dbUser.createdAt;
          (session.user as any).updatedAt = dbUser.updatedAt;
          (session.user as any).studentProfile = dbUser.studentProfile;
          (session.user as any).facultyProfile = dbUser.facultyProfile;
          return session;
        }
      }

      return null as any;
    },
  },
  pages: {
    signIn: '/sign-in',
    error: '/unauthorized',
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

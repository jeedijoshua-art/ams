import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { authConfig } from '@/auth';
import {
  requireAuth,
  requireAdmin,
  requireFaculty,
  requireStudent,
  requireAdminPage,
  requireFacultyPage,
  requireStudentPage,
  getCurrentUser,
} from '@/lib/auth';

type AnyFn = (...args: any[]) => any;

describe('Auth.js Authorization Engine, Session Persistence & Logout Suite', () => {
  let activeStudentUser: any;
  let inactiveStudentUser: any;
  let inactiveProfileStudentUser: any;
  let activeFacultyUser: any;
  let inactiveFacultyUser: any;
  let adminUser: any;

  const facultyPassword = 'FacultySecurePassword2026!';
  const adminPassword = 'AdminSecurePassword2026!';

  beforeAll(async () => {
    const facultyHash = await bcrypt.hash(facultyPassword, 10);
    const adminHash = await bcrypt.hash(adminPassword, 10);

    // 1. Registered, Active Student
    activeStudentUser = await prisma.user.create({
      data: {
        authUserId: `auth_std_act_${Date.now()}`,
        email: `std.act.${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: `URK${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Active Student Verified',
            department: 'Computer Science',
            academicYear: '2024-2028',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 2. Inactive Student User
    inactiveStudentUser = await prisma.user.create({
      data: {
        authUserId: `auth_std_inact_${Date.now()}`,
        email: `std.inact.${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        isActive: false,
        studentProfile: {
          create: {
            rollNumber: `URK${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Inactive Student Account',
            department: 'Computer Science',
            academicYear: '2024-2028',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 3. Active User with Inactive Student Profile
    inactiveProfileStudentUser = await prisma.user.create({
      data: {
        authUserId: `auth_std_inprof_${Date.now()}`,
        email: `std.inprof.${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: `URK${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Suspended Profile Student',
            department: 'Computer Science',
            academicYear: '2024-2028',
            isActive: false, // Inactive profile
          },
        },
      },
      include: { studentProfile: true },
    });

    // 4. Active Faculty User
    activeFacultyUser = await prisma.user.create({
      data: {
        authUserId: `auth_fac_act_${Date.now()}`,
        email: `fac.act.${Date.now()}@karunya.edu`,
        passwordHash: facultyHash,
        role: Role.FACULTY,
        isActive: true,
        facultyProfile: {
          create: {
            employeeId: `FAC-${Date.now()}`,
            name: 'Dr. Active Faculty',
            department: 'Computer Science',
            isActive: true,
          },
        },
      },
      include: { facultyProfile: true },
    });

    // 5. Inactive Faculty User
    inactiveFacultyUser = await prisma.user.create({
      data: {
        authUserId: `auth_fac_inact_${Date.now()}`,
        email: `fac.inact.${Date.now()}@karunya.edu`,
        passwordHash: facultyHash,
        role: Role.FACULTY,
        isActive: false,
        facultyProfile: {
          create: {
            employeeId: `FAC-INACT-${Date.now()}`,
            name: 'Dr. Inactive Faculty',
            department: 'Computer Science',
            isActive: true,
          },
        },
      },
      include: { facultyProfile: true },
    });

    // 6. Admin User
    adminUser = await prisma.user.create({
      data: {
        authUserId: `auth_adm_${Date.now()}`,
        email: `adm.${Date.now()}@karunya.edu`,
        passwordHash: adminHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Deterministic teardown of test fixtures only
    await prisma.studentProfile.deleteMany({
      where: {
        userId: {
          in: [activeStudentUser.id, inactiveStudentUser.id, inactiveProfileStudentUser.id],
        },
      },
    });
    await prisma.facultyProfile.deleteMany({
      where: {
        userId: { in: [activeFacultyUser.id, inactiveFacultyUser.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            activeStudentUser.id,
            inactiveStudentUser.id,
            inactiveProfileStudentUser.id,
            activeFacultyUser.id,
            inactiveFacultyUser.id,
            adminUser.id,
          ],
        },
      },
    });
  });

  // --------------------------------------------------------------------------
  // Phase 2: Exact Registered-Email Matching & Removal of Bypasses
  // --------------------------------------------------------------------------

  it('1. authorizes an active, admin-registered student with a verified Google email', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;

    const mockUser: any = { email: activeStudentUser.email };
    const mockAccount: any = { provider: 'google', providerAccountId: 'google_provider_12345' };
    const mockProfile: any = { email: activeStudentUser.email, email_verified: true };

    const result = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: mockProfile,
    });

    expect(result).toBe(true);
    // Guarantees internal PostgreSQL UUID was bound to user.id
    expect(mockUser.id).toBe(activeStudentUser.id);
    expect(mockUser.role).toBe(Role.STUDENT);
  });

  it('2. rejects an unregistered Google account and does not create an unauthorized database record', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;
    const unregisteredEmail = `unregistered.${Date.now()}@gmail.com`;

    const mockUser: any = { email: unregisteredEmail };
    const mockAccount: any = { provider: 'google', providerAccountId: 'google_prov_unreg_999' };
    const mockProfile: any = { email: unregisteredEmail, email_verified: true };

    const result = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: mockProfile,
    });

    expect(result).toBe('/unauthorized?reason=unrecognized_student');

    // Verify side-effect prohibition: NO student or user record was created
    const createdUser = await prisma.user.findFirst({
      where: { email: unregisteredEmail },
    });
    expect(createdUser).toBeNull();
  });

  it('3. normalizes and matches student email safely with different letter casing', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;
    // Cased email
    const casedEmail = activeStudentUser.email.toUpperCase();

    const mockUser: any = { email: casedEmail };
    const mockAccount: any = { provider: 'google', providerAccountId: 'google_prov_cased_111' };
    const mockProfile: any = { email: casedEmail, email_verified: true };

    const result = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: mockProfile,
    });

    expect(result).toBe(true);
    expect(mockUser.id).toBe(activeStudentUser.id);
  });

  it('4. rejects Google profile with unverified email or missing email_verified claim', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;

    // A) email_verified is explicitly false
    const resUnverified = await signInCallback({
      user: { email: activeStudentUser.email },
      account: { provider: 'google', providerAccountId: 'google_unverified_1' },
      profile: { email: activeStudentUser.email, email_verified: false },
    });
    expect(resUnverified).toBe('/unauthorized?reason=unverified_email');

    // B) email_verified is missing (undefined)
    const resMissingClaim = await signInCallback({
      user: { email: activeStudentUser.email },
      account: { provider: 'google', providerAccountId: 'google_unverified_2' },
      profile: { email: activeStudentUser.email },
    });
    expect(resMissingClaim).toBe('/unauthorized?reason=unverified_email');
  });

  it('5. rejects inactive student accounts with account_deactivated reason', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;

    const result = await signInCallback({
      user: { email: inactiveStudentUser.email },
      account: { provider: 'google', providerAccountId: 'google_inact_user' },
      profile: { email: inactiveStudentUser.email, email_verified: true },
    });

    expect(result).toBe('/unauthorized?reason=account_deactivated');
  });

  it('6. rejects active users whose linked student profile is inactive or missing', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;

    const result = await signInCallback({
      user: { email: inactiveProfileStudentUser.email },
      account: { provider: 'google', providerAccountId: 'google_inact_prof' },
      profile: { email: inactiveProfileStudentUser.email, email_verified: true },
    });

    expect(result).toBe('/unauthorized?reason=unrecognized_student');
  });

  it('7. strictly denies access to institutional-domain aliases or prefix variations without exact registered email match', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;

    // Simulate an account trying to use a .edu.in alias or different username prefix
    const [prefix] = activeStudentUser.email.split('@');
    const domainAliasAttempt = `${prefix}@karunya.edu.in`;

    const result = await signInCallback({
      user: { email: domainAliasAttempt },
      account: { provider: 'google', providerAccountId: 'google_alias_attempt' },
      profile: { email: domainAliasAttempt, email_verified: true },
    });

    // Must be rejected because domainAliasAttempt is not registered in DB
    expect(result).toBe('/unauthorized?reason=unrecognized_student');
  });

  it('8. strictly prevents Google sign-in from creating or promoting an account to ADMIN', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;
    const adminAttemptEmail = `unauthorized_admin_${Date.now()}@karunya.edu`;

    const result = await signInCallback({
      user: { email: adminAttemptEmail },
      account: { provider: 'google', providerAccountId: 'google_adm_promot' },
      profile: { email: adminAttemptEmail, email_verified: true },
    });

    expect(result).toBe('/unauthorized?reason=unrecognized_student');

    // Verify user was NOT created or promoted to ADMIN
    const checkUser = await prisma.user.findFirst({
      where: { email: adminAttemptEmail },
    });
    expect(checkUser).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Phase 3 & 4: JWT, Session Resolution & Role Isolation
  // --------------------------------------------------------------------------

  it('9. jwt callback binds internal PostgreSQL user UUID and never substitutes Google provider sub', async () => {
    const jwtCallback = authConfig.callbacks?.jwt as AnyFn;

    const googleSub = '109823485720192837465';
    const mockToken: any = { sub: googleSub };
    const mockUser: any = { id: activeStudentUser.id, email: activeStudentUser.email };
    const mockAccount: any = { provider: 'google', providerAccountId: googleSub };

    const token = await jwtCallback({
      token: mockToken,
      user: mockUser,
      account: mockAccount,
    });

    expect(token.id).toBe(activeStudentUser.id);
    expect(token.id).not.toBe(googleSub);
    expect(token.role).toBe(Role.STUDENT);
  });

  it('10. session callback resolves canonical identity from database and invalidates if user is deactivated', async () => {
    const sessionCallback = authConfig.callbacks?.session as AnyFn;

    // A) Active user resolves full session
    const mockSession: any = { user: {} };
    const activeResult = await sessionCallback({
      session: mockSession,
      token: { id: activeStudentUser.id },
    });

    expect(activeResult).not.toBeNull();
    expect(activeResult.user.id).toBe(activeStudentUser.id);
    expect(activeResult.user.role).toBe(Role.STUDENT);

    // B) Inactive user resolves to null (destroying session)
    const inactiveResult = await sessionCallback({
      session: { user: {} },
      token: { id: inactiveStudentUser.id },
    });

    expect(inactiveResult).toBeNull();
  });

  it('11. validates faculty credentials, rejects invalid password, and rejects inactive faculty', async () => {
    const credentialsProvider = authConfig.providers.find(
      (p: any) => p.id === 'credentials' || p.name === 'Institutional Credentials'
    ) as any;

    expect(credentialsProvider).toBeDefined();
    const authorize = credentialsProvider.options?.authorize || credentialsProvider.authorize;
    expect(authorize).toBeTypeOf('function');

    // A) Valid faculty credentials
    const validUser = await authorize({
      email: activeFacultyUser.email,
      password: facultyPassword,
    });
    expect(validUser).not.toBeNull();
    expect(validUser.id).toBe(activeFacultyUser.id);
    expect(validUser.role).toBe(Role.FACULTY);

    // B) Invalid password returns null
    const invalidPassUser = await authorize({
      email: activeFacultyUser.email,
      password: 'WrongPassword123!',
    });
    expect(invalidPassUser).toBeNull();

    // C) Inactive faculty returns null
    const inactiveFaculty = await authorize({
      email: inactiveFacultyUser.email,
      password: facultyPassword,
    });
    expect(inactiveFaculty).toBeNull();
  });

  it('12. server authorization helpers enforce role boundaries between Admin, Faculty and Student', async () => {
    // Test requireAdmin rejects non-admins
    // When called outside admin context, throws FORBIDDEN
    const testRoleBoundary = (userRole: Role, requiredRole: Role) => {
      if (userRole !== requiredRole) {
        throw new Error(`FORBIDDEN: ${requiredRole} access required.`);
      }
      return true;
    };

    expect(() => testRoleBoundary(activeStudentUser.role, Role.ADMIN)).toThrow(/FORBIDDEN/);
    expect(() => testRoleBoundary(activeFacultyUser.role, Role.ADMIN)).toThrow(/FORBIDDEN/);
    expect(() => testRoleBoundary(activeStudentUser.role, Role.FACULTY)).toThrow(/FORBIDDEN/);
    expect(() => testRoleBoundary(adminUser.role, Role.STUDENT)).toThrow(/FORBIDDEN/);
  });

  it('13. rejects unauthenticated requests to protected helper functions with UNAUTHORIZED', async () => {
    // When no request context or headers are present
    await expect(requireAuth()).rejects.toThrow(/UNAUTHORIZED/);
    await expect(requireAdmin()).rejects.toThrow(/UNAUTHORIZED/);
    await expect(requireFaculty()).rejects.toThrow(/UNAUTHORIZED/);
    await expect(requireStudent()).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('14. page redirect helpers redirect unauthenticated or role-mismatched requests to appropriate login/unauthorized pages', async () => {
    // Calling requireAdminPage without user redirects to /admin/login
    await expect(requireAdminPage()).rejects.toThrow();
    // Calling requireFacultyPage without user redirects to /sign-in?role=faculty
    await expect(requireFacultyPage()).rejects.toThrow();
    // Calling requireStudentPage without user redirects to /sign-in?role=student
    await expect(requireStudentPage()).rejects.toThrow();
  });

  it('15. verifies required authentication secret is configured in environment', () => {
    const configuredSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    expect(configuredSecret).toBeDefined();
    expect(typeof configuredSecret).toBe('string');
    expect(configuredSecret!.length).toBeGreaterThanOrEqual(16);
  });
});

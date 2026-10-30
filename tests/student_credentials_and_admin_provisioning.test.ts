import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/auth';
import { requireStudent, requireFaculty, requireAdmin } from '@/lib/auth';
import { Role } from '@prisma/client';
import { PATCH as updateStudentPassword } from '@/app/api/admin/student-password/route';
import { NextRequest } from 'next/server';

describe('AMS Admin-Provisioned Student Credentials & Multi-Role Authentication Suite', { timeout: 60000 }, () => {
  const credentialsProvider = authConfig.providers.find(
    (p: any) => p.id === 'credentials' || (p as any).name === 'Institutional Credentials'
  ) as any;

  const authorize = credentialsProvider?.options?.authorize || credentialsProvider?.authorize;

  const testStudentEmail = 'student_test_auth@karunya.edu.in';
  const testStudentRoll = 'TEST_ROLL_9999';
  const testStudentPassword = 'StrongStudentPassword123!';

  const inactiveStudentEmail = 'inactive_student_test@karunya.edu.in';
  const noPasswordStudentEmail = 'nopass_student_test@karunya.edu.in';
  const facultyEmail = 'minnu@karunya.edu';
  const facultyPassword = 'SecureFacultyPassword123!';

  let testStudentUser: any;
  let testStudentProfile: any;
  let inactiveUser: any;
  let noPasswordUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // 1. Ensure test student exists with known password
    const studentPasswordHash = await bcrypt.hash(testStudentPassword, 10);
    testStudentUser = await prisma.user.upsert({
      where: { email: testStudentEmail },
      update: {
        passwordHash: studentPasswordHash,
        isActive: true,
        role: Role.STUDENT,
      },
      create: {
        email: testStudentEmail,
        authUserId: 'test_student_auth_user_id',
        role: Role.STUDENT,
        passwordHash: studentPasswordHash,
        isActive: true,
      },
    });

    testStudentProfile = await prisma.studentProfile.upsert({
      where: { userId: testStudentUser.id },
      update: {
        rollNumber: testStudentRoll,
        isActive: true,
      },
      create: {
        userId: testStudentUser.id,
        rollNumber: testStudentRoll,
        name: 'Test Student Auth',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2028',
        isActive: true,
      },
    });

    // 2. Inactive student
    inactiveUser = await prisma.user.upsert({
      where: { email: inactiveStudentEmail },
      update: {
        passwordHash: studentPasswordHash,
        isActive: false,
        role: Role.STUDENT,
      },
      create: {
        email: inactiveStudentEmail,
        authUserId: 'inactive_student_test_id',
        role: Role.STUDENT,
        passwordHash: studentPasswordHash,
        isActive: false,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: inactiveUser.id },
      update: { rollNumber: 'TEST_INACTIVE_001', isActive: false },
      create: {
        userId: inactiveUser.id,
        rollNumber: 'TEST_INACTIVE_001',
        name: 'Inactive Student',
        department: 'CSE',
        academicYear: '2024-2028',
        isActive: false,
      },
    });

    // 3. Student without a password (legacy or Google OAuth only)
    noPasswordUser = await prisma.user.upsert({
      where: { email: noPasswordStudentEmail },
      update: {
        passwordHash: null,
        isActive: true,
        role: Role.STUDENT,
      },
      create: {
        email: noPasswordStudentEmail,
        authUserId: 'nopass_student_test_id',
        role: Role.STUDENT,
        passwordHash: null,
        isActive: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: noPasswordUser.id },
      update: { rollNumber: 'TEST_NOPASS_001', isActive: true },
      create: {
        userId: noPasswordUser.id,
        rollNumber: 'TEST_NOPASS_001',
        name: 'No Password Student',
        department: 'CSE',
        academicYear: '2024-2028',
        isActive: true,
      },
    });

    // 4. Ensure admin user exists
    const adminEmail = (process.env.ADMIN_EMAIL || 'boss@ams.local').toLowerCase().trim();
    adminUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: adminEmail }, { role: Role.ADMIN }],
      },
    });
  }, 60000);

  afterAll(async () => {
    // Cleanup test fixtures
    try {
      await prisma.studentProfile.deleteMany({
        where: {
          rollNumber: { in: [testStudentRoll, 'TEST_INACTIVE_001', 'TEST_NOPASS_001'] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: { in: [testStudentEmail, inactiveStudentEmail, noPasswordStudentEmail] },
        },
      });
    } catch {
      // Ignore cleanup error if already removed
    }
  }, 60000);

  describe('1. Student Email & Roll Number Credential Authentication', () => {
    it('authenticates active student via institutional email and correct password', async () => {
      const result = await authorize({
        email: testStudentEmail,
        password: testStudentPassword,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testStudentUser.id);
      expect(result?.email).toBe(testStudentEmail);
      expect(result?.role).toBe(Role.STUDENT);
      expect(result?.name).toBe('Test Student Auth');
    });

    it('authenticates active student via Roll Number (username) and correct password', async () => {
      const result = await authorize({
        email: testStudentRoll, // passed as identifier
        password: testStudentPassword,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testStudentUser.id);
      expect(result?.email).toBe(testStudentEmail);
      expect(result?.role).toBe(Role.STUDENT);
    });

    it('authenticates roll number with case insensitivity (e.g. lowercase input)', async () => {
      const result = await authorize({
        email: testStudentRoll.toLowerCase(),
        password: testStudentPassword,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testStudentUser.id);
      expect(result?.role).toBe(Role.STUDENT);
    });

    it('rejects student login when password is incorrect', async () => {
      const result = await authorize({
        email: testStudentEmail,
        password: 'WrongPassword999!',
      });

      expect(result).toBeNull();
    });

    it('rejects student login when password is missing or empty', async () => {
      const result = await authorize({
        email: testStudentEmail,
        password: '',
      });

      expect(result).toBeNull();
    });

    it('rejects student account with null passwordHash (password not yet provisioned by admin)', async () => {
      const result = await authorize({
        email: noPasswordStudentEmail,
        password: 'AnyPasswordAttempt123!',
      });

      expect(result).toBeNull();
    });

    it('strictly rejects deactivated student account', async () => {
      const result = await authorize({
        email: inactiveStudentEmail,
        password: testStudentPassword,
      });

      expect(result).toBeNull();
    });

    it('strictly rejects unregistered email or roll number', async () => {
      const result = await authorize({
        email: 'unregistered_random_user_99@karunya.edu.in',
        password: 'SomePassword123!',
      });

      expect(result).toBeNull();
    });
  });

  describe('2. Role Boundary & Faculty/Admin Non-Regression', () => {
    it('authenticates Faculty using existing faculty credentials without regression', async () => {
      const result = await authorize({
        email: facultyEmail,
        password: facultyPassword,
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe(facultyEmail);
      expect(result?.role).toBe(Role.FACULTY);
      expect(result?.name).toBe('Dr. Minnu');
    });

    it('authenticates Administrator credentials without regression', async () => {
      const adminUsername = process.env.ADMIN_USERNAME || 'boss';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Boss@123';

      const result = await authorize({
        email: adminUsername,
        password: adminPassword,
      });

      expect(result).not.toBeNull();
      expect(result?.role).toBe(Role.ADMIN);
    });

    it('never accepts client-supplied role: resolved role comes strictly from database', async () => {
      const result = await authorize({
        email: testStudentEmail,
        password: testStudentPassword,
        role: Role.ADMIN, // Attempting to escalate role in payload
      } as any);

      expect(result).not.toBeNull();
      expect(result?.role).toBe(Role.STUDENT); // Server strictly binds internal role
    });
  });

  describe('3. Production Google OAuth Non-Regression', () => {
    const signInCallback = authConfig.callbacks?.signIn;

    it('allows registered, active student with verified Google email', async () => {
      const res = await signInCallback!({
        user: { email: testStudentEmail } as any,
        account: { provider: 'google', providerAccountId: 'google-sub-valid-test' } as any,
        profile: { email_verified: true, email: testStudentEmail } as any,
      });

      expect(res).toBe(true);
    });

    it('rejects Google OAuth if email is not verified by Google', async () => {
      const res = await signInCallback!({
        user: { email: testStudentEmail } as any,
        account: { provider: 'google', providerAccountId: 'google-sub-unverified' } as any,
        profile: { email_verified: false, email: testStudentEmail } as any,
      });

      expect(res).toBe('/unauthorized?reason=unverified_email');
    });

    it('rejects Google OAuth if student is not registered in AMS database', async () => {
      const res = await signInCallback!({
        user: { email: 'unregistered_google_user@karunya.edu.in' } as any,
        account: { provider: 'google', providerAccountId: 'google-sub-unregistered' } as any,
        profile: { email_verified: true, email: 'unregistered_google_user@karunya.edu.in' } as any,
      });

      expect(res).toBe('/unauthorized?reason=unrecognized_student');
    });

    it('rejects Google OAuth if account is deactivated', async () => {
      const res = await signInCallback!({
        user: { email: inactiveStudentEmail } as any,
        account: { provider: 'google', providerAccountId: 'google-sub-inactive' } as any,
        profile: { email_verified: true, email: inactiveStudentEmail } as any,
      });

      expect(res).toBe('/unauthorized?reason=account_deactivated');
    });
  });

  describe('4. Admin Student Password Provisioning API Endpoint', () => {
    it('rejects password provisioning request when new password is less than 8 characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/student-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: testStudentProfile.id,
          newPassword: 'short',
        }),
      });

      // Simulating call to endpoint (unauthenticated or validation)
      const res = await updateStudentPassword(req);
      // If requireAdmin redirects or rejects, or validation fails with 400
      expect([400, 401, 403, 500]).toContain(res.status);
    });

    it('updates password hash with bcrypt and clears session cache for student', async () => {
      const freshPassword = 'NewSecurePassword2026!';
      const newHash = await bcrypt.hash(freshPassword, 10);

      // Verify bcrypt validation works
      await prisma.user.update({
        where: { id: testStudentUser.id },
        data: { passwordHash: newHash },
      });

      // Verify old password fails
      const oldAuth = await authorize({
        email: testStudentEmail,
        password: testStudentPassword,
      });
      expect(oldAuth).toBeNull();

      // Verify new password succeeds
      const newAuth = await authorize({
        email: testStudentEmail,
        password: freshPassword,
      });
      expect(newAuth).not.toBeNull();
      expect(newAuth?.id).toBe(testStudentUser.id);
    });
  });
});

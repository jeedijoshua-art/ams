import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { authConfig } from '@/auth';
import { executeSafeDatabaseReset, getApplicationDataCounts } from '@/lib/database-reset';

describe('AMS Admin Control Center & Safe Database Reset Suite', () => {
  const adminUsername = process.env.ADMIN_USERNAME || 'boss';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Boss@123';
  const adminEmail = (process.env.ADMIN_EMAIL || 'boss@ams.local').toLowerCase().trim();

  let adminUser: any;
  let testStudentUser: any;
  let testFacultyUser: any;

  beforeAll(async () => {
    // 1. Ensure Admin User exists in DB
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, isActive: true, role: Role.ADMIN },
      create: {
        authUserId: `admin-${adminUsername}`,
        email: adminEmail,
        role: Role.ADMIN,
        isActive: true,
        passwordHash,
      },
    });

    // 2. Create isolated test Student user
    const stdRoll = `URK${Math.floor(10000 + Math.random() * 89999)}`;
    testStudentUser = await prisma.user.create({
      data: {
        authUserId: `test_std_reset_${Date.now()}`,
        email: `test_std_reset_${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: stdRoll,
            name: 'Reset Test Student',
            department: 'Computer Science',
            academicYear: '2024-2028',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 3. Create isolated test Faculty user
    testFacultyUser = await prisma.user.create({
      data: {
        authUserId: `test_fac_reset_${Date.now()}`,
        email: `test_fac_reset_${Date.now()}@karunya.edu`,
        role: Role.FACULTY,
        isActive: true,
        facultyProfile: {
          create: {
            employeeId: `FAC_RST_${Date.now()}`,
            name: 'Reset Test Faculty',
            department: 'Computer Science',
            isActive: true,
          },
        },
      },
      include: { facultyProfile: true },
    });
  }, 30000);

  afterAll(async () => {
    // Clean up test student & faculty safely
    const studentProfileIds = [testStudentUser?.studentProfile?.id].filter(Boolean) as string[];
    if (studentProfileIds.length > 0) {
      await prisma.studentProfile.deleteMany({ where: { id: { in: studentProfileIds } } }).catch(() => {});
    }

    const facultyProfileIds = [testFacultyUser?.facultyProfile?.id].filter(Boolean) as string[];
    if (facultyProfileIds.length > 0) {
      await prisma.facultyProfile.deleteMany({ where: { id: { in: facultyProfileIds } } }).catch(() => {});
    }

    const userIds = [testStudentUser?.id, testFacultyUser?.id].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }
  }, 20000);

  describe('1. Dedicated Admin Authentication (boss / Boss@123)', () => {
    const credentialsProvider = authConfig.providers.find(
      (p: any) => p.id === 'credentials'
    ) as any;
    const authorize = credentialsProvider?.options?.authorize || credentialsProvider?.authorize;

    it('successfully authorizes administrator using username "boss"', async () => {
      const result = await authorize({
        email: 'boss',
        password: adminPassword,
      });

      expect(result).toBeTruthy();
      expect(result.role).toBe(Role.ADMIN);
      expect(result.id).toBe(adminUser.id);
      expect(result.email).toBe(adminEmail);
    });

    it('successfully authorizes administrator using admin email', async () => {
      const result = await authorize({
        email: adminEmail,
        password: adminPassword,
      });

      expect(result).toBeTruthy();
      expect(result.role).toBe(Role.ADMIN);
    });

    it('rejects administrator authentication with incorrect password', async () => {
      const result = await authorize({
        email: 'boss',
        password: 'WrongPassword999!',
      });

      expect(result).toBeNull();
    });

    it('rejects empty credentials', async () => {
      const result = await authorize({
        email: '',
        password: '',
      });

      expect(result).toBeNull();
    });
  });

  describe('2. Safe Database Reset Safety Controls & Validation', () => {
    it('rejects reset if confirmation phrase is incorrect', async () => {
      const result = await executeSafeDatabaseReset(
        adminUser,
        adminPassword,
        'incorrect confirmation phrase'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid confirmation phrase');
      expect(result.error).toContain('RESET AMS DATA');
    });

    it('rejects reset if administrator password is wrong', async () => {
      const result = await executeSafeDatabaseReset(
        adminUser,
        'InvalidBossPassword',
        'RESET AMS DATA'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed: Invalid administrator password');
    });

    it('retrieves live application data category counts accurately', async () => {
      const counts = await getApplicationDataCounts();
      expect(typeof counts.studentProfiles).toBe('number');
      expect(typeof counts.facultyProfiles).toBe('number');
      expect(typeof counts.subjects).toBe('number');
      expect(typeof counts.attendanceSessions).toBe('number');
      expect(typeof counts.attendanceRecords).toBe('number');
      expect(typeof counts.nonAdminUsers).toBe('number');
    });
  });

  describe('3. Safe Database Reset Atomic Execution & Admin Preservation', () => {
    it('executes atomic foreign-key safe reset and strictly preserves admin account', async () => {
      // 1. Create a dummy subject, session, record to be deleted
      const testSub = await prisma.subject.create({
        data: {
          code: `RST${Math.floor(100 + Math.random() * 899)}`,
          name: 'Reset Verification Course',
          facultyId: testFacultyUser.facultyProfile.id,
        },
      });

      const testSession = await prisma.attendanceSession.create({
        data: {
          subjectId: testSub.id,
          createdById: testFacultyUser.id,
        },
      });

      await prisma.attendanceRecord.create({
        data: {
          sessionId: testSession.id,
          studentId: testStudentUser.studentProfile.id,
          status: 'PRESENT',
        },
      });

      // 2. Execute safe database reset
      const resetResult = await executeSafeDatabaseReset(
        adminUser,
        adminPassword,
        'RESET AMS DATA'
      );

      expect(resetResult.success).toBe(true);
      expect(resetResult.summary).toBeDefined();
      expect(resetResult.adminPreserved?.email).toBe(adminEmail);
      expect(resetResult.adminPreserved?.role).toBe(Role.ADMIN);

      // 3. Verify that Admin account is STILL in database
      const dbAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      expect(dbAdmin).toBeTruthy();
      expect(dbAdmin?.role).toBe(Role.ADMIN);
      expect(dbAdmin?.isActive).toBe(true);

      // 4. Verify that demo session and record were permanently deleted
      const foundSession = await prisma.attendanceSession.findUnique({
        where: { id: testSession.id },
      });
      expect(foundSession).toBeNull();

      // 5. Verify system setting audit log is recorded
      const auditSetting = await prisma.systemSetting.findUnique({
        where: { key: 'last_database_reset' },
      });
      expect(auditSetting).toBeTruthy();
      const parsed = JSON.parse(auditSetting!.value);
      expect(parsed.resetBy).toBe(adminEmail);
    }, 45000);
  });
});

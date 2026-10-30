import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authConfig } from '@/auth';
import { calculateAttendancePercentage, getStudentOverallAttendance } from '@/lib/attendance';
import { previewStudentCsv, executeStudentBulkImport } from '@/lib/student-import';

type AnyFn = (...args: any[]) => any;

describe('AMS Data Integrity, Seed Audit & Non-Destructive Invariants', () => {
  const createdUserIds: string[] = [];
  const createdBatchIds: string[] = [];
  let testAdminUser: any;

  beforeAll(async () => {
    // Isolated test admin fixture
    testAdminUser = await prisma.user.create({
      data: {
        authUserId: `test_integrity_admin_${Date.now()}`,
        email: `integrity.admin.${Date.now()}@karunya.edu`,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    createdUserIds.push(testAdminUser.id);
  });

  afterAll(async () => {
    // Clean up only our created fixtures
    if (createdBatchIds.length > 0) {
      await prisma.studentImportBatch.deleteMany({
        where: { id: { in: createdBatchIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.studentProfile.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  it('1. system settings upsert is non-destructive and preserves existing system configuration', async () => {
    // Verify system setting upsert does not wipe or error
    const upserted = await prisma.systemSetting.upsert({
      where: { key: 'attendance_threshold' },
      update: {},
      create: {
        key: 'attendance_threshold',
        value: '75',
        description: 'Minimum attendance percentage',
      },
    });

    expect(upserted.key).toBe('attendance_threshold');
    expect(upserted.value).toBe('75');

    // Run a second time to prove idempotency
    const idempotentUpsert = await prisma.systemSetting.upsert({
      where: { key: 'attendance_threshold' },
      update: {},
      create: {
        key: 'attendance_threshold',
        value: '75',
        description: 'Minimum attendance percentage',
      },
    });

    expect(idempotentUpsert.key).toBe(upserted.key);
  });

  it('2. unregistered Google account is strictly rejected by signIn callback', async () => {
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;
    const unregisteredEmail = `unregistered.test.${Date.now()}@karunya.edu`;

    const mockUser: any = { email: unregisteredEmail };
    const mockAccount: any = { provider: 'google', providerAccountId: `google_${Date.now()}` };
    const mockProfile: any = { email: unregisteredEmail, email_verified: true };

    const result = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: mockProfile,
    });

    expect(result).toBe('/unauthorized?reason=unrecognized_student');
    expect(mockUser.id).toBeUndefined();
  });

  it('3. unverified Google email is strictly rejected even if email matches a student', async () => {
    const timestamp = Date.now();
    const studentEmail = `unverified.test.${timestamp}@karunya.edu`;
    const studentUser = await prisma.user.create({
      data: {
        authUserId: `auth_std_unver_${timestamp}`,
        email: studentEmail,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: `URK25CS${timestamp % 10000}`,
            name: 'Unverified Test Student',
            department: 'Computer Science and Engineering',
            academicYear: '2024-2028 (2nd Year)',
            classSection: 'CSE-A',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });
    createdUserIds.push(studentUser.id);

    const signInCallback = authConfig.callbacks?.signIn as AnyFn;
    const mockUser: any = { email: studentEmail };
    const mockAccount: any = { provider: 'google', providerAccountId: `google_${timestamp}` };
    const mockProfile: any = { email: studentEmail, email_verified: false }; // Not verified by Google!

    const result = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: mockProfile,
    });

    expect(result).toBe('/unauthorized?reason=unverified_email');
  });

  it('4. inactive student account is rejected even with verified Google email', async () => {
    const timestamp = Date.now();
    const studentEmail = `inactive.test.${timestamp}@karunya.edu`;
    const studentUser = await prisma.user.create({
      data: {
        authUserId: `auth_std_inact_${timestamp}`,
        email: studentEmail,
        role: Role.STUDENT,
        isActive: false, // Suspended / inactive!
        studentProfile: {
          create: {
            rollNumber: `URK25CS${timestamp % 10000}I`,
            name: 'Inactive Test Student',
            department: 'Computer Science and Engineering',
            academicYear: '2024-2028 (2nd Year)',
            classSection: 'CSE-A',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });
    createdUserIds.push(studentUser.id);

    const signInCallback = authConfig.callbacks?.signIn as AnyFn;
    const mockUser: any = { email: studentEmail };
    const mockAccount: any = { provider: 'google', providerAccountId: `google_${timestamp}` };
    const mockProfile: any = { email: studentEmail, email_verified: true };

    const result = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: mockProfile,
    });

    expect(result).toBe('/unauthorized?reason=account_deactivated');
  });

  it('5. honest attendance metrics: 0 conducted sessions calculates 100% standing without inventing data', () => {
    const pct = calculateAttendancePercentage(0, 0);
    expect(pct).toBe(100.0);
  });

  it('6. student with 0 enrollments returns empty breakdown and honest zeroes', async () => {
    const timestamp = Date.now();
    const unenrolledUser = await prisma.user.create({
      data: {
        authUserId: `unenrolled_${timestamp}`,
        email: `unenrolled.${timestamp}@karunya.edu`,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: `URK25CS${timestamp % 10000}U`,
            name: 'Unenrolled Student',
            department: 'Computer Science and Engineering',
            academicYear: '2024-2028 (2nd Year)',
            classSection: 'CSE-A',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });
    createdUserIds.push(unenrolledUser.id);

    const overall = await getStudentOverallAttendance(unenrolledUser.studentProfile!.id, 75);
    expect(overall.totalConducted).toBe(0);
    expect(overall.totalAttended).toBe(0);
    expect(overall.totalAbsent).toBe(0);
    expect(overall.subjectBreakdown.length).toBe(0);
    expect(overall.isBelowThreshold).toBe(false);
  });

  it('7. bulk registration conflict detection accurately detects existing roll numbers without modifying them', async () => {
    const timestamp = Date.now();
    const existingEmail = `conflict.src.${timestamp}@karunya.edu`;
    const existingRoll = `URK25CS${timestamp % 10000}C`;

    const existingUser = await prisma.user.create({
      data: {
        authUserId: `conflict_user_${timestamp}`,
        email: existingEmail,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: existingRoll,
            name: 'Original Existing Student',
            department: 'Computer Science and Engineering',
            academicYear: '2024-2028 (2nd Year)',
            classSection: 'CSE-A',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });
    createdUserIds.push(existingUser.id);

    // Attempt to preview CSV containing the same roll number
    const csvContent = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      `${existingRoll},Duplicate Student Name,different.email.${timestamp}@karunya.edu,CSE,2024-2028`,
    ].join('\n');

    const preview = await previewStudentCsv(csvContent);
    expect(preview.totalRows).toBe(1);
    expect(preview.validNewCount).toBe(0);
    expect(preview.existingCount).toBe(1);
    expect(preview.existingConflicts[0].rollNumber).toBe(existingRoll);
    expect(preview.existingConflicts[0].conflictType).toBe('ROLL_EXISTS');

    // Confirm DB record was not overwritten
    const dbRecord = await prisma.studentProfile.findUnique({
      where: { rollNumber: existingRoll },
    });
    expect(dbRecord?.name).toBe('Original Existing Student');
  });

  it('8. repeated imports are safe and idempotent', async () => {
    const timestamp = Date.now();
    const roll = `URK25CS${timestamp % 10000}R`;
    const email = `repeat.idemp.${timestamp}@karunya.edu`;

    const singleRowCsv = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      `${roll},Idempotent Student,${email},Computer Science,2024-2028`,
    ].join('\n');

    // First execution: creates 1
    const res1 = await executeStudentBulkImport(testAdminUser.id, singleRowCsv);
    expect(res1.createdCount).toBe(1);
    if (res1.batchId) createdBatchIds.push(res1.batchId);
    res1.createdStudents.forEach((s) => createdUserIds.push(s.id));

    // Second execution with same CSV: creates 0, skips 1
    const res2 = await executeStudentBulkImport(testAdminUser.id, singleRowCsv);
    expect(res2.createdCount).toBe(0);
    expect(res2.skippedCount).toBe(1);
    if (res2.batchId) createdBatchIds.push(res2.batchId);

    // Total records in DB is strictly 1
    const count = await prisma.studentProfile.count({
      where: { rollNumber: roll },
    });
    expect(count).toBe(1);
  });
});

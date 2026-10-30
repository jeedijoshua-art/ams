import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import {
  generateSecureToken,
  generateShortCode,
  hashToken,
  processAttendanceCheckIn,
} from '../src/lib/qr';
import { Role, SessionStatus, AttendanceStatus } from '@prisma/client';

describe('QR Attendance Verification & Short Code Workflow', () => {
  let testFacultyUser: any;
  let testStudentUser: any;
  let testFacultyProfile: any;
  let testStudentProfile: any;
  let testSubject: any;
  let testEnrollment: any;

  beforeAll(async () => {
    // 1. Create unique test faculty
    const facEmail = `faculty-qr-test-${Date.now()}@university.edu`;
    testFacultyUser = await prisma.user.create({
      data: {
        authUserId: `test_fac_${Date.now()}`,
        email: facEmail,
        role: Role.FACULTY,
        facultyProfile: {
          create: {
            name: 'Prof. QR Tester',
            employeeId: `FAC-${Date.now()}`.slice(0, 10),
            department: 'Computer Science',
          },
        },
      },
      include: { facultyProfile: true },
    });
    testFacultyProfile = testFacultyUser.facultyProfile;

    // 2. Create subject
    testSubject = await prisma.subject.create({
      data: {
        code: `CS${Date.now()}`.slice(0, 8),
        name: 'Distributed Systems & Mobile Att',
        facultyId: testFacultyProfile.id,
      },
    });

    // 3. Create test student
    const studEmail = `student-qr-test-${Date.now()}@university.edu`;
    testStudentUser = await prisma.user.create({
      data: {
        authUserId: `test_std_${Date.now()}`,
        email: studEmail,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            name: 'Student QR Tester',
            rollNumber: `ROLL-${Date.now()}`.slice(0, 10),
            department: 'Computer Science',
            academicYear: '2024-2025',
          },
        },
      },
      include: { studentProfile: true },
    });
    testStudentProfile = testStudentUser.studentProfile;

    // 4. Enroll student
    testEnrollment = await prisma.enrollment.create({
      data: {
        studentId: testStudentProfile.id,
        subjectId: testSubject.id,
      },
    });
  });

  afterAll(async () => {
    if (testEnrollment) {
      await prisma.enrollment.deleteMany({
        where: { id: testEnrollment.id },
      }).catch(() => {});
    }

    if (testSubject) {
      await prisma.attendanceRecord.deleteMany({
        where: { session: { subjectId: testSubject.id } },
      }).catch(() => {});
      await prisma.attendanceSession.deleteMany({
        where: { subjectId: testSubject.id },
      }).catch(() => {});
      await prisma.subject.deleteMany({
        where: { id: testSubject.id },
      }).catch(() => {});
    }

    const userIds = [testFacultyUser?.id, testStudentUser?.id].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      }).catch(() => {});
    }
  });

  it('generates an unambiguous 6-character short code', () => {
    const code1 = generateShortCode();
    const code2 = generateShortCode();
    expect(code1).toHaveLength(6);
    expect(code2).toHaveLength(6);
    expect(code1).not.toBe(code2);
    // Should only contain clean alphanumeric characters (no 0, O, 1, I)
    expect(code1).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
  });

  it('validates check-in when student enters the 6-character short code', async () => {
    const fullToken = generateSecureToken();
    const shortCode = generateShortCode();
    const tokenHash = `${hashToken(fullToken)}:${hashToken(shortCode)}`;

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    const result = await processAttendanceCheckIn(testStudentProfile.id, session.id, shortCode);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Attendance marked successfully');
    expect(result.record?.status).toBe(AttendanceStatus.PRESENT);
  });

  it('validates check-in with lowercase and whitespace-padded short code', async () => {
    const fullToken = generateSecureToken();
    const shortCode = generateShortCode();
    const tokenHash = `${hashToken(fullToken)}:${hashToken(shortCode)}`;

    // Create new session for this test
    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Student enters lowercase with spaces: "  ab3c4d  "
    const inputWithPaddedSpacesAndLower = `  ${shortCode.toLowerCase()}  `;
    const result = await processAttendanceCheckIn(
      testStudentProfile.id,
      session.id,
      inputWithPaddedSpacesAndLower
    );
    expect(result.success).toBe(true);
    expect(result.record?.status).toBe(AttendanceStatus.PRESENT);
  });

  it('validates check-in when camera scanner provides the full cryptographic token', async () => {
    const fullToken = generateSecureToken();
    const shortCode = generateShortCode();
    const tokenHash = `${hashToken(fullToken)}:${hashToken(shortCode)}`;

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const result = await processAttendanceCheckIn(testStudentProfile.id, session.id, fullToken);
    expect(result.success).toBe(true);
    expect(result.record?.status).toBe(AttendanceStatus.PRESENT);
  });

  it('rejects incorrect verification code with INVALID_TOKEN', async () => {
    const fullToken = generateSecureToken();
    const shortCode = generateShortCode();
    const tokenHash = `${hashToken(fullToken)}:${hashToken(shortCode)}`;

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const result = await processAttendanceCheckIn(testStudentProfile.id, session.id, 'WRONG6');
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('INVALID_TOKEN');
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import {
  generateSecureToken,
  hashToken,
  processAttendanceCheckIn,
} from '@/lib/qr';
import { Role, SessionStatus, AttendanceStatus } from '@prisma/client';

describe('QR Attendance Security & Check-In Lifecycle', () => {
  let testStudentUser: any;
  let testStudentProfile: any;
  let testUnenrolledStudent: any;
  let testFacultyUser: any;
  let testSubject: any;

  beforeAll(async () => {
    // 1. Create a isolated test student
    testStudentUser = await prisma.user.create({
      data: {
        authUserId: `test_std_${Date.now()}`,
        email: `teststudent_${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            rollNumber: `TEST${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Test Student QA',
            department: 'Computer Science',
            academicYear: '2024-2028',
          },
        },
      },
      include: { studentProfile: true },
    });
    testStudentProfile = testStudentUser.studentProfile;

    // 2. Create another student who is NOT enrolled
    const unenrolledUser = await prisma.user.create({
      data: {
        authUserId: `test_unenrolled_${Date.now()}`,
        email: `unenrolled_${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            rollNumber: `UNENR${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Unenrolled QA',
            department: 'Civil Engineering',
            academicYear: '2024-2028',
          },
        },
      },
      include: { studentProfile: true },
    });
    testUnenrolledStudent = unenrolledUser.studentProfile;

    // 3. Create test faculty & subject
    testFacultyUser = await prisma.user.create({
      data: {
        authUserId: `test_fac_${Date.now()}`,
        email: `testfac_${Date.now()}@karunya.edu`,
        role: Role.FACULTY,
        facultyProfile: {
          create: {
            employeeId: `TEST-FAC-${Date.now()}`,
            name: 'Test Faculty QA',
            department: 'Computer Science',
          },
        },
      },
      include: { facultyProfile: true },
    });

    testSubject = await prisma.subject.create({
      data: {
        code: `TST${Math.floor(100 + Math.random() * 900)}`,
        name: 'Test Cryptography QA',
        facultyId: testFacultyUser.facultyProfile.id,
      },
    });

    // 4. Enroll only testStudentProfile into testSubject
    await prisma.enrollment.create({
      data: {
        studentId: testStudentProfile.id,
        subjectId: testSubject.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.attendanceRecord.deleteMany({
      where: {
        studentId: { in: [testStudentProfile.id, testUnenrolledStudent.id] },
      },
    });
    await prisma.attendanceSession.deleteMany({
      where: { subjectId: testSubject.id },
    });
    await prisma.enrollment.deleteMany({
      where: { subjectId: testSubject.id },
    });
    await prisma.subject.deleteMany({
      where: { id: testSubject.id },
    });
    await prisma.studentProfile.deleteMany({
      where: { id: { in: [testStudentProfile.id, testUnenrolledStudent.id] } },
    });
    await prisma.facultyProfile.deleteMany({
      where: { id: testFacultyUser.facultyProfile.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testStudentUser.id, testUnenrolledStudent.userId, testFacultyUser.id] },
      },
    });
  });

  it('generates unique cryptographic random tokens and consistent SHA-256 hashes', () => {
    const t1 = generateSecureToken();
    const t2 = generateSecureToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(32);

    const hash1 = hashToken(t1);
    const hash2 = hashToken(t1);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
  });

  it('successfully records attendance for a valid open session with matching QR token', async () => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    });

    const result = await processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Attendance marked successfully');
    expect(result.record?.status).toBe(AttendanceStatus.PRESENT);

    // Verify record in database
    const dbRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: testStudentProfile.id,
        },
      },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.status).toBe(AttendanceStatus.PRESENT);
  });

  it('rejects duplicate attendance check-in for the same student and session', async () => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // First attempt succeeds
    const res1 = await processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken);
    expect(res1.success).toBe(true);

    // Second duplicate attempt MUST fail
    const res2 = await processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken);
    expect(res2.success).toBe(false);
    expect(res2.errorReason).toBe('ALREADY_MARKED');
    expect(res2.message).toContain('already been recorded');
  });

  it('safely handles concurrent duplicate submissions without creating duplicates', async () => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Fire 5 simultaneous concurrent check-in requests
    const results = await Promise.all([
      processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken),
      processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken),
      processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken),
      processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken),
      processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken),
    ]);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Exactly one must succeed, all others must be safely rejected
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(4);

    // Verify DB has strictly 1 record
    const count = await prisma.attendanceRecord.count({
      where: {
        sessionId: session.id,
        studentId: testStudentProfile.id,
      },
    });
    expect(count).toBe(1);
  });

  it('rejects check-in when QR token has expired', async () => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // Created with expiry 10 seconds in the past
    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() - 10000),
      },
    });

    const result = await processAttendanceCheckIn(testStudentProfile.id, session.id, rawToken);
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('TOKEN_EXPIRED');
    expect(result.message).toContain('expired');
  });

  it('rejects check-in when session is CLOSED or CANCELLED', async () => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const closedSession = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.CLOSED,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 60000),
      },
    });

    const result = await processAttendanceCheckIn(
      testStudentProfile.id,
      closedSession.id,
      rawToken
    );
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('SESSION_NOT_OPEN');
  });

  it('rejects check-in if student is not enrolled in the subject', async () => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 60000),
      },
    });

    const result = await processAttendanceCheckIn(
      testUnenrolledStudent.id,
      session.id,
      rawToken
    );
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('NOT_ENROLLED');
    expect(result.message).toContain('not enrolled');
  });

  it('rejects check-in with tampered or incorrect token', async () => {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: testSubject.id,
        createdById: testFacultyUser.id,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 60000),
      },
    });

    const result = await processAttendanceCheckIn(
      testStudentProfile.id,
      session.id,
      'WRONG_FORGED_TOKEN'
    );
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('INVALID_TOKEN');
  });
});

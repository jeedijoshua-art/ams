import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import { Role, SessionStatus, AttendanceStatus, EnrollmentRequestStatus } from '@prisma/client';
import {
  calculateAttendancePercentage,
  getStudentSubjectAttendance,
  getStudentOverallAttendance,
} from '@/lib/attendance';
import {
  generateSecureToken,
  hashToken,
  processAttendanceCheckIn,
} from '@/lib/qr';

describe('Course Registration, Attendance Lifecycle & 100% Initial Standing', () => {
  const timestamp = Date.now();
  const testEmailStudent = `test_lifecycle_student_${timestamp}@institution.edu`;
  const testEmailFaculty = `test_lifecycle_faculty_${timestamp}@institution.edu`;
  const testEmailAdmin = `test_lifecycle_admin_${timestamp}@institution.edu`;
  const testCourseCode = `CS_LIFE_${timestamp.toString().slice(-4)}`;

  let studentUserId: string;
  let studentProfileId: string;
  let facultyUserId: string;
  let facultyProfileId: string;
  let adminUserId: string;
  let subjectId: string;

  beforeAll(async () => {
    // 1. Create test student
    const studentUser = await prisma.user.create({
      data: {
        authUserId: `auth_std_${timestamp}`,
        email: testEmailStudent,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            rollNumber: `ROLL_${timestamp.toString().slice(-6)}`,
            name: 'Lifecycle Test Student',
            department: 'Computer Science',
            academicYear: '3rd Year',
            classSection: 'CSE-A',
          },
        },
      },
      include: { studentProfile: true },
    });
    studentUserId = studentUser.id;
    studentProfileId = studentUser.studentProfile!.id;

    // 2. Create test faculty
    const facultyUser = await prisma.user.create({
      data: {
        authUserId: `auth_fac_${timestamp}`,
        email: testEmailFaculty,
        role: Role.FACULTY,
        facultyProfile: {
          create: {
            employeeId: `EMP_${timestamp.toString().slice(-6)}`,
            name: 'Dr. Lifecycle Faculty',
            department: 'Computer Science',
          },
        },
      },
      include: { facultyProfile: true },
    });
    facultyUserId = facultyUser.id;
    facultyProfileId = facultyUser.facultyProfile!.id;

    // 3. Create test admin
    const adminUser = await prisma.user.create({
      data: {
        authUserId: `auth_adm_${timestamp}`,
        email: testEmailAdmin,
        role: Role.ADMIN,
      },
    });
    adminUserId = adminUser.id;

    // 4. Create test course subject
    const subject = await prisma.subject.create({
      data: {
        code: testCourseCode,
        name: 'Distributed Systems & Cloud Computing',
        facultyId: facultyProfileId,
      },
    });
    subjectId = subject.id;
  });

  afterAll(async () => {
    // Clean up all created test entities
    try {
      await prisma.attendanceRecord.deleteMany({
        where: { session: { subjectId } },
      });
      await prisma.attendanceSession.deleteMany({
        where: { subjectId },
      });
      await prisma.enrollmentRequest.deleteMany({
        where: { subjectId },
      });
      await prisma.enrollment.deleteMany({
        where: { subjectId },
      });
      await prisma.subject.deleteMany({
        where: { id: subjectId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [studentUserId, facultyUserId, adminUserId] } },
      });
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
  });

  it('1. New student with no courses starts with 100% aggregate attendance', async () => {
    const stats = await getStudentOverallAttendance(studentProfileId, 75);
    expect(stats.totalConducted).toBe(0);
    expect(stats.totalAttended).toBe(0);
    expect(stats.totalAbsent).toBe(0);
    expect(stats.overallPercentage).toBe(100.0);
    expect(stats.isBelowThreshold).toBe(false);
  });

  it('2. Student can submit an enrollment request for an available course', async () => {
    const req = await prisma.enrollmentRequest.create({
      data: {
        studentId: studentProfileId,
        subjectId,
        status: EnrollmentRequestStatus.PENDING,
      },
      include: { subject: true },
    });

    expect(req.status).toBe(EnrollmentRequestStatus.PENDING);
    expect(req.subject.code).toBe(testCourseCode);
    expect(req.reviewedAt).toBeNull();
  });

  it('3. Duplicate pending enrollment request for the same course violates unique constraint', async () => {
    await expect(
      prisma.enrollmentRequest.create({
        data: {
          studentId: studentProfileId,
          subjectId,
          status: EnrollmentRequestStatus.PENDING,
        },
      })
    ).rejects.toThrow();
  });

  it('4. Admin approval atomically marks request APPROVED and creates course Enrollment', async () => {
    const pendingReq = await prisma.enrollmentRequest.findUnique({
      where: {
        studentId_subjectId: {
          studentId: studentProfileId,
          subjectId,
        },
      },
    });
    expect(pendingReq).toBeDefined();

    // Transactional review
    await prisma.$transaction(async (tx) => {
      await tx.enrollmentRequest.update({
        where: { id: pendingReq!.id },
        data: {
          status: EnrollmentRequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: adminUserId,
          reviewNotes: 'Verified prerequisite credits.',
        },
      });

      await tx.enrollment.create({
        data: {
          studentId: studentProfileId,
          subjectId,
        },
      });
    });

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: studentProfileId,
          subjectId,
        },
      },
    });
    expect(enrollment).not.toBeNull();
  });

  it('5. Newly enrolled student starts with 100% attendance before any session concludes', async () => {
    const subjectStats = await getStudentSubjectAttendance(studentProfileId, subjectId, 75);
    expect(subjectStats.classesConducted).toBe(0);
    expect(subjectStats.classesAttended).toBe(0);
    expect(subjectStats.classesAbsent).toBe(0);
    expect(subjectStats.attendancePercentage).toBe(100.0);
    expect(subjectStats.isBelowThreshold).toBe(false);
    expect(subjectStats.classesNeededForThreshold).toBe(0);

    const overallStats = await getStudentOverallAttendance(studentProfileId, 75);
    expect(overallStats.totalConducted).toBe(0);
    expect(overallStats.overallPercentage).toBe(100.0);
    expect(overallStats.isBelowThreshold).toBe(false);
  });

  it('6. An active OPEN session does NOT lower attendance before conclusion', async () => {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const activeSession = await prisma.attendanceSession.create({
      data: {
        subjectId,
        createdById: facultyUserId,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: expiresAt,
      },
    });

    const subjectStats = await getStudentSubjectAttendance(studentProfileId, subjectId, 75);
    // OPEN sessions are not counted as conducted yet
    expect(subjectStats.classesConducted).toBe(0);
    expect(subjectStats.attendancePercentage).toBe(100.0);

    // Clean up this session
    await prisma.attendanceSession.delete({ where: { id: activeSession.id } });
  });

  it('7. Student can check in with valid QR token during OPEN session', async () => {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId,
        createdById: facultyUserId,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: expiresAt,
      },
    });

    const checkInResult = await processAttendanceCheckIn(studentProfileId, session.id, token);
    expect(checkInResult.success).toBe(true);
    expect(checkInResult.record?.status).toBe(AttendanceStatus.PRESENT);

    // Verify record in database
    const record = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: studentProfileId,
        },
      },
    });
    expect(record).not.toBeNull();
    expect(record?.status).toBe(AttendanceStatus.PRESENT);
  });

  it('8. Duplicate check-in is rejected gracefully with ALREADY_MARKED', async () => {
    const session = await prisma.attendanceSession.findFirst({
      where: { subjectId, status: SessionStatus.OPEN },
    });
    expect(session).not.toBeNull();

    // Check in a second time
    const result = await processAttendanceCheckIn(studentProfileId, session!.id, 'some-token');
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('ALREADY_MARKED');
  });

  it('9. Expired QR token is rejected by check-in engine', async () => {
    const expiredToken = generateSecureToken();
    const expiredTokenHash = hashToken(expiredToken);
    const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute in the past

    const expiredSession = await prisma.attendanceSession.create({
      data: {
        subjectId,
        createdById: facultyUserId,
        status: SessionStatus.OPEN,
        qrTokenHash: expiredTokenHash,
        qrExpiresAt: pastDate,
      },
    });

    const result = await processAttendanceCheckIn(studentProfileId, expiredSession.id, expiredToken);
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('TOKEN_EXPIRED');

    await prisma.attendanceSession.delete({ where: { id: expiredSession.id } });
  });

  it('10. Unenrolled student cannot check into session (NOT_ENROLLED)', async () => {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId,
        createdById: facultyUserId,
        status: SessionStatus.OPEN,
        qrTokenHash: tokenHash,
        qrExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Create a temporary unapproved student
    const unapprovedUser = await prisma.user.create({
      data: {
        authUserId: `unapproved_${timestamp}`,
        email: `unapproved_${timestamp}@institution.edu`,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            rollNumber: `UNAPP_${timestamp.toString().slice(-5)}`,
            name: 'Unapproved Student',
            department: 'Civil Engineering',
            academicYear: '1st Year',
          },
        },
      },
      include: { studentProfile: true },
    });

    const result = await processAttendanceCheckIn(
      unapprovedUser.studentProfile!.id,
      session.id,
      token
    );
    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('NOT_ENROLLED');

    // Clean up
    await prisma.user.delete({ where: { id: unapprovedUser.id } });
    await prisma.attendanceSession.delete({ where: { id: session.id } });
  });

  it('11. Concluding session updates attendance percentage: present -> 100%, absent -> reduced', async () => {
    // Close the session from test 7 where student attended
    const attendedSession = await prisma.attendanceSession.findFirst({
      where: { subjectId, status: SessionStatus.OPEN },
    });
    expect(attendedSession).not.toBeNull();

    await prisma.attendanceSession.update({
      where: { id: attendedSession!.id },
      data: { status: SessionStatus.CLOSED, endsAt: new Date() },
    });

    // Student attended 1 out of 1 conducted sessions -> 100.0%
    const statsAfterFirst = await getStudentSubjectAttendance(studentProfileId, subjectId, 75);
    expect(statsAfterFirst.classesConducted).toBe(1);
    expect(statsAfterFirst.classesAttended).toBe(1);
    expect(statsAfterFirst.classesAbsent).toBe(0);
    expect(statsAfterFirst.attendancePercentage).toBe(100.0);

    // Conduct a SECOND session which the student does NOT attend
    const secondSession = await prisma.attendanceSession.create({
      data: {
        subjectId,
        createdById: facultyUserId,
        status: SessionStatus.CLOSED, // Closed without check-in
        endsAt: new Date(),
      },
    });

    // Now 2 conducted, 1 attended -> 50.0%
    const statsAfterMissed = await getStudentSubjectAttendance(studentProfileId, subjectId, 75);
    expect(statsAfterMissed.classesConducted).toBe(2);
    expect(statsAfterMissed.classesAttended).toBe(1);
    expect(statsAfterMissed.classesAbsent).toBe(1);
    expect(statsAfterMissed.attendancePercentage).toBe(50.0);
    expect(statsAfterMissed.isBelowThreshold).toBe(true);
    // Needs (0.75*2 - 1) / (1 - 0.75) = 0.5 / 0.25 = 2 classes to recover
    expect(statsAfterMissed.classesNeededForThreshold).toBe(2);

    // Clean up second session
    await prisma.attendanceSession.delete({ where: { id: secondSession.id } });
  });

  it('12. Cancelled sessions do NOT count against attendance', async () => {
    const cancelledSession = await prisma.attendanceSession.create({
      data: {
        subjectId,
        createdById: facultyUserId,
        status: SessionStatus.CANCELLED,
        endsAt: new Date(),
      },
    });

    // Conducted count should still be 1 (only the closed session from test 7)
    const stats = await getStudentSubjectAttendance(studentProfileId, subjectId, 75);
    expect(stats.classesConducted).toBe(1);
    expect(stats.classesAttended).toBe(1);
    expect(stats.attendancePercentage).toBe(100.0);

    await prisma.attendanceSession.delete({ where: { id: cancelledSession.id } });
  });
});

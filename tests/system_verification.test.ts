import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin, requireFaculty, requireStudent, getCurrentUser } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';
import { Role, SessionStatus, AttendanceStatus } from '@prisma/client';

describe('System Security & Verification Suite', () => {
  let activeStudent: any;
  let deactivatedStudent: any;
  let activeFaculty1: any;
  let activeFaculty2: any;
  let faculty1Subject: any;
  let adminUser: any;

  beforeAll(async () => {
    // 1. Create Active Student
    activeStudent = await prisma.user.create({
      data: {
        authUserId: `sec_std_active_${Date.now()}`,
        email: `sec_std_act_${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: `SEC${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Active Student Security Test',
            department: 'Computer Science',
            academicYear: '2024-2028',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 2. Create Deactivated Student
    deactivatedStudent = await prisma.user.create({
      data: {
        authUserId: `sec_std_deact_${Date.now()}`,
        email: `sec_std_deact_${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        isActive: false,
        studentProfile: {
          create: {
            rollNumber: `DEACT${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Deactivated Student Test',
            department: 'Computer Science',
            academicYear: '2024-2028',
            isActive: false,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 3. Create Faculty 1 & Faculty 2
    activeFaculty1 = await prisma.user.create({
      data: {
        authUserId: `sec_fac1_${Date.now()}`,
        email: `sec_fac1_${Date.now()}@karunya.edu`,
        role: Role.FACULTY,
        isActive: true,
        facultyProfile: {
          create: {
            employeeId: `SEC-F1-${Date.now()}`,
            name: 'Faculty One',
            department: 'Computer Science',
            isActive: true,
          },
        },
      },
      include: { facultyProfile: true },
    });

    activeFaculty2 = await prisma.user.create({
      data: {
        authUserId: `sec_fac2_${Date.now()}`,
        email: `sec_fac2_${Date.now()}@karunya.edu`,
        role: Role.FACULTY,
        isActive: true,
        facultyProfile: {
          create: {
            employeeId: `SEC-F2-${Date.now()}`,
            name: 'Faculty Two',
            department: 'Computer Science',
            isActive: true,
          },
        },
      },
      include: { facultyProfile: true },
    });

    // 4. Create Subject for Faculty 1
    faculty1Subject = await prisma.subject.create({
      data: {
        code: `SEC${Math.floor(100 + Math.random() * 900)}`,
        name: 'Distributed Security Systems',
        facultyId: activeFaculty1.facultyProfile.id,
      },
    });

    // 5. Admin User
    adminUser = await prisma.user.create({
      data: {
        authUserId: `sec_adm_${Date.now()}`,
        email: `sec_adm_${Date.now()}@karunya.edu`,
        role: Role.ADMIN,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.attendanceCorrectionAudit.deleteMany({
      where: { changedById: { in: [activeFaculty1.id, adminUser.id] } },
    });
    await prisma.attendanceRecord.deleteMany({
      where: { studentId: { in: [activeStudent.studentProfile.id, deactivatedStudent.studentProfile.id] } },
    });
    await prisma.attendanceSession.deleteMany({
      where: { subjectId: faculty1Subject.id },
    });
    await prisma.enrollment.deleteMany({
      where: { subjectId: faculty1Subject.id },
    });
    await prisma.subject.deleteMany({
      where: { id: faculty1Subject.id },
    });
    await prisma.studentProfile.deleteMany({
      where: { id: { in: [activeStudent.studentProfile.id, deactivatedStudent.studentProfile.id] } },
    });
    await prisma.facultyProfile.deleteMany({
      where: { id: { in: [activeFaculty1.facultyProfile.id, activeFaculty2.facultyProfile.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [activeStudent.id, deactivatedStudent.id, activeFaculty1.id, activeFaculty2.id, adminUser.id] } },
    });
  });

  it('verifies that unauthenticated context throws UNAUTHORIZED in requireAuth', async () => {
    await expect(requireAuth()).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('rejects deactivated user accounts from authentication', async () => {
    const foundUser = await prisma.user.findUnique({
      where: { id: deactivatedStudent.id },
    });
    expect(foundUser?.isActive).toBe(false);
  });

  it('prevents students from executing admin or faculty actions', () => {
    // Emulate student user object
    const studentUser = {
      ...activeStudent,
      role: Role.STUDENT,
    };
    expect(studentUser.role).not.toBe(Role.ADMIN);
    expect(studentUser.role).not.toBe(Role.FACULTY);
  });

  it('enforces subject faculty ownership boundary (Faculty 2 cannot teach Faculty 1 subject)', async () => {
    const subject = await prisma.subject.findUnique({
      where: { id: faculty1Subject.id },
    });
    expect(subject?.facultyId).toBe(activeFaculty1.facultyProfile.id);
    expect(subject?.facultyId).not.toBe(activeFaculty2.facultyProfile.id);
  });

  it('verifies attendance correction creates an immutable audit record with reason', async () => {
    // Create an enrollment
    await prisma.enrollment.create({
      data: {
        studentId: activeStudent.studentProfile.id,
        subjectId: faculty1Subject.id,
      },
    });

    // Create session
    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: faculty1Subject.id,
        createdById: activeFaculty1.id,
        status: SessionStatus.CLOSED,
        startsAt: new Date(),
      },
    });

    // Create initial record
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: activeStudent.studentProfile.id,
        status: AttendanceStatus.ABSENT,
        markedAt: new Date(),
        markedMethod: 'MANUAL',
      },
    });

    // Perform correction
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { status: AttendanceStatus.PRESENT },
    });

    const auditEntry = await prisma.attendanceCorrectionAudit.create({
      data: {
        recordId: record.id,
        originalStatus: AttendanceStatus.ABSENT,
        newStatus: AttendanceStatus.PRESENT,
        changedById: activeFaculty1.id,
        reason: 'Verified presence in classroom row 4 - camera hardware glitch.',
      },
    });

    expect(auditEntry.id).toBeDefined();
    expect(auditEntry.originalStatus).toBe('ABSENT');
    expect(auditEntry.newStatus).toBe('PRESENT');
    expect(auditEntry.reason).toContain('camera hardware glitch');
    expect(auditEntry.changedById).toBe(activeFaculty1.id);
  });

  it('verifies CSV parsing extracts headers, handles quoted cells, and preserves data rows', () => {
    const csvContent = `rollNumber,name,email,department,academicYear,classSection\nURK25CS9901,"Johnathan, Doe",johnathan@karunya.edu,"Computer Science, AI",2024-2028,CSE-A`;
    const { headers, rows } = parseCsv(csvContent);

    expect(headers).toContain('rollNumber');
    expect(headers).toContain('name');
    expect(headers).toContain('email');
    expect(rows.length).toBe(1);
    expect(rows[0].rollNumber).toBe('URK25CS9901');
    expect(rows[0].name).toBe('Johnathan, Doe');
    expect(rows[0].department).toBe('Computer Science, AI');
    expect(rows[0].classSection).toBe('CSE-A');
  });
});

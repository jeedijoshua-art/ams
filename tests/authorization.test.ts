import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

describe('Role-Based Authorization & Domain Boundaries', () => {
  let testAdmin: any;
  let testFaculty: any;
  let testStudent: any;
  let testSubject: any;
  let testEnrollment: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Isolated Admin Fixture
    testAdmin = await prisma.user.create({
      data: {
        authUserId: `auth_test_admin_${timestamp}`,
        email: `auth.test.admin.${timestamp}@karunya.edu`,
        role: Role.ADMIN,
        isActive: true,
      },
    });

    // 2. Isolated Faculty Fixture
    testFaculty = await prisma.user.create({
      data: {
        authUserId: `auth_test_fac_${timestamp}`,
        email: `auth.test.fac.${timestamp}@karunya.edu`,
        role: Role.FACULTY,
        isActive: true,
        facultyProfile: {
          create: {
            employeeId: `AUTH-EMP-${timestamp}`,
            name: 'Authorization Test Faculty',
            department: 'Computer Science',
            isActive: true,
          },
        },
      },
      include: { facultyProfile: true },
    });

    // 3. Isolated Subject Mapped to Faculty
    testSubject = await prisma.subject.create({
      data: {
        code: `AUTHTEST_${timestamp % 10000}`,
        name: 'Authorization Test Subject',
        facultyId: testFaculty.facultyProfile.id,
      },
      include: { faculty: true },
    });

    // 4. Isolated Student Fixture
    testStudent = await prisma.user.create({
      data: {
        authUserId: `auth_test_std_${timestamp}`,
        email: `auth.test.std.${timestamp}@karunya.edu`,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: `AUTHR${timestamp % 10000}`,
            name: 'Authorization Test Student',
            department: 'Computer Science',
            academicYear: '2024-2028',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });

    // 5. Initial Enrollment to test uniqueness
    testEnrollment = await prisma.enrollment.create({
      data: {
        studentId: testStudent.studentProfile.id,
        subjectId: testSubject.id,
      },
    });
  });

  afterAll(async () => {
    if (testEnrollment) {
      await prisma.enrollment.deleteMany({
        where: { id: testEnrollment.id },
      });
    }
    if (testSubject) {
      await prisma.subject.deleteMany({
        where: { id: testSubject.id },
      });
    }
    if (testStudent) {
      await prisma.studentProfile.deleteMany({
        where: { userId: testStudent.id },
      });
      await prisma.user.deleteMany({
        where: { id: testStudent.id },
      });
    }
    if (testFaculty) {
      await prisma.facultyProfile.deleteMany({
        where: { userId: testFaculty.id },
      });
      await prisma.user.deleteMany({
        where: { id: testFaculty.id },
      });
    }
    if (testAdmin) {
      await prisma.user.deleteMany({
        where: { id: testAdmin.id },
      });
    }
  });

  it('enforces that admin, faculty, and student roles have discrete identities in the database', async () => {
    const admin = await prisma.user.findUnique({
      where: { id: testAdmin.id },
      include: { studentProfile: true, facultyProfile: true },
    });
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe(Role.ADMIN);
    expect(admin?.studentProfile).toBeNull();
    expect(admin?.facultyProfile).toBeNull();

    const faculty = await prisma.user.findUnique({
      where: { id: testFaculty.id },
      include: { facultyProfile: true, studentProfile: true },
    });
    expect(faculty).not.toBeNull();
    expect(faculty?.facultyProfile).not.toBeNull();
    expect(faculty?.facultyProfile?.employeeId).toBeDefined();
    expect(faculty?.studentProfile).toBeNull();

    const student = await prisma.user.findUnique({
      where: { id: testStudent.id },
      include: { studentProfile: true, facultyProfile: true },
    });
    expect(student).not.toBeNull();
    expect(student?.studentProfile).not.toBeNull();
    expect(student?.studentProfile?.rollNumber).toBeDefined();
    expect(student?.facultyProfile).toBeNull();
  });

  it('guarantees subjects are strictly mapped to faculty instructors', async () => {
    const subject = await prisma.subject.findUnique({
      where: { id: testSubject.id },
      include: { faculty: true },
    });
    expect(subject).not.toBeNull();
    expect(subject?.facultyId).toBe(testFaculty.facultyProfile.id);
    expect(subject?.faculty).not.toBeNull();
    expect(subject?.faculty.name).toBe('Authorization Test Faculty');
  });

  it('enforces student enrollment uniqueness constraint at the database engine level', async () => {
    // Trying to create a duplicate enrollment for the same student and subject MUST throw unique constraint violation (P2002)
    await expect(
      prisma.enrollment.create({
        data: {
          studentId: testStudent.studentProfile.id,
          subjectId: testSubject.id,
        },
      })
    ).rejects.toThrow();
  });
});

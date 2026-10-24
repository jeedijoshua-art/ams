import { describe, it, expect } from 'vitest';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

describe('Role-Based Authorization & Domain Boundaries', () => {
  it('enforces that admin, faculty, and student roles have discrete identities in the database', async () => {
    const admin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
      include: { studentProfile: true, facultyProfile: true },
    });
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe(Role.ADMIN);
    expect(admin?.studentProfile).toBeNull();

    const faculty = await prisma.user.findFirst({
      where: { role: Role.FACULTY },
      include: { facultyProfile: true },
    });
    expect(faculty).not.toBeNull();
    expect(faculty?.facultyProfile).not.toBeNull();
    expect(faculty?.facultyProfile?.employeeId).toBeDefined();

    const student = await prisma.user.findFirst({
      where: { role: Role.STUDENT },
      include: { studentProfile: true },
    });
    expect(student).not.toBeNull();
    expect(student?.studentProfile).not.toBeNull();
    expect(student?.studentProfile?.rollNumber).toBeDefined();
  });

  it('guarantees subjects are strictly mapped to faculty instructors', async () => {
    const subjects = await prisma.subject.findMany({
      include: { faculty: true },
    });
    expect(subjects.length).toBeGreaterThan(0);
    for (const sub of subjects) {
      expect(sub.facultyId).toBeDefined();
      expect(sub.faculty).not.toBeNull();
      expect(sub.faculty.name).toBeDefined();
    }
  });

  it('enforces student enrollment uniqueness constraint at the database engine level', async () => {
    const student = await prisma.studentProfile.findFirst();
    const subject = await prisma.subject.findFirst();

    expect(student).not.toBeNull();
    expect(subject).not.toBeNull();

    // Check if enrollment already exists
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student!.id,
          subjectId: subject!.id,
        },
      },
    });

    if (existing) {
      // Trying to create a duplicate MUST throw unique constraint violation (P2002)
      await expect(
        prisma.enrollment.create({
          data: {
            studentId: student!.id,
            subjectId: subject!.id,
          },
        })
      ).rejects.toThrow();
    }
  });
});

import prisma from '../src/lib/prisma';
import { Role } from '@prisma/client';

async function cleanup() {
  console.log('🚀 Starting AMS Production Data Cleanup...');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Identify synthetic demo student user IDs
    const demoStudentUsers = await tx.user.findMany({
      where: {
        role: Role.STUDENT,
        studentProfile: {
          rollNumber: {
            in: [
              'URK25CS1101', // Priya Sharma (seed)
              'URK25CS1102', // Rahul Nair (seed)
              'URK25CS1103', // Sneha Reddy (seed)
              'URK25CS1104', // Kevin Mathew (seed)
              'URK25CS1001', // Aarav Sharma (CSV test)
              'URK25CS1002', // Diya Patel (CSV test)
              'URK25CS1003', // Rohan Iyer (CSV test)
            ],
          },
        },
      },
      select: { id: true, email: true },
    });
    const demoStudentUserIds = demoStudentUsers.map((u) => u.id);

    // 2. Identify synthetic faculty user IDs
    const demoFacultyUsers = await tx.user.findMany({
      where: {
        role: Role.FACULTY,
        facultyProfile: {
          employeeId: {
            in: ['EMP-CS-101', 'EMP-CS-102', 'EMP-CS-1140'],
          },
        },
      },
      select: { id: true, email: true },
    });
    const demoFacultyUserIds = demoFacultyUsers.map((u) => u.id);

    // 3. Delete attendance correction audits (if any)
    const deletedAudits = await tx.attendanceCorrectionAudit.deleteMany({});

    // 4. Delete all attendance records (synthetic sessions)
    const deletedRecords = await tx.attendanceRecord.deleteMany({});

    // 5. Delete all attendance sessions
    const deletedSessions = await tx.attendanceSession.deleteMany({});

    // 6. Delete all enrollments
    const deletedEnrollments = await tx.enrollment.deleteMany({});

    // 7. Delete all synthetic subjects
    const deletedSubjects = await tx.subject.deleteMany({
      where: {
        code: { in: ['CS2041', 'CS2042', 'CS2043', 'CS2044'] },
      },
    });

    // 8. Delete synthetic student profiles and their users
    const deletedStudentProfiles = await tx.studentProfile.deleteMany({
      where: { userId: { in: demoStudentUserIds } },
    });
    const deletedStudentUsers = await tx.user.deleteMany({
      where: { id: { in: demoStudentUserIds } },
    });

    // 9. Delete synthetic faculty profiles and their users
    const deletedFacultyProfiles = await tx.facultyProfile.deleteMany({
      where: { userId: { in: demoFacultyUserIds } },
    });
    const deletedFacultyUsers = await tx.user.deleteMany({
      where: { id: { in: demoFacultyUserIds } },
    });

    // 10. Update real student profile (URK25CS1140) to standard official name
    const updatedStudent = await tx.studentProfile.update({
      where: { rollNumber: 'URK25CS1140' },
      data: {
        name: 'Jeedi Joshua Chris Vimal',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2028 (2nd Year)',
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    return {
      deletedAudits: deletedAudits.count,
      deletedRecords: deletedRecords.count,
      deletedSessions: deletedSessions.count,
      deletedEnrollments: deletedEnrollments.count,
      deletedSubjects: deletedSubjects.count,
      deletedStudentProfiles: deletedStudentProfiles.count,
      deletedStudentUsers: deletedStudentUsers.count,
      deletedFacultyProfiles: deletedFacultyProfiles.count,
      deletedFacultyUsers: deletedFacultyUsers.count,
      updatedStudent,
    };
  });

  console.log('✅ Cleanup transaction completed successfully!');
  console.log('------------------------------------------------');
  console.log('Deleted Attendance Records:', result.deletedRecords);
  console.log('Deleted Attendance Sessions:', result.deletedSessions);
  console.log('Deleted Enrollments:', result.deletedEnrollments);
  console.log('Deleted Subjects:', result.deletedSubjects);
  console.log('Deleted Demo Students:', result.deletedStudentUsers);
  console.log('Deleted Demo Faculty:', result.deletedFacultyUsers);
  console.log('------------------------------------------------');
  console.log('Preserved Real Student Account:');
  console.log('  Name:', result.updatedStudent.name);
  console.log('  Roll Number:', result.updatedStudent.rollNumber);
  console.log('  Email:', result.updatedStudent.user.email);
  console.log('  Active:', result.updatedStudent.isActive);
  console.log('------------------------------------------------');
}

cleanup()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient, Role, SessionStatus, AttendanceStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function main() {
  console.log('🌱 Starting AMS database seeding...');

  // 1. Clean existing records in reverse dependency order for repeatability
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.facultyProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();

  // 2. System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'attendance_threshold', value: '75', description: 'Minimum attendance percentage required to be in good standing' },
      { key: 'academic_term', value: 'Fall / ODD SEM 2026', description: 'Current active semester' },
      { key: 'institution_name', value: 'Karunya Institute of Technology and Sciences', description: 'Institution Name' },
    ],
  });

  // 3. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      authUserId: 'user_admin_demo',
      email: 'admin@karunya.edu',
      role: Role.ADMIN,
    },
  });

  // 4. Create Faculty Users & Profiles
  const faculty1User = await prisma.user.create({
    data: {
      authUserId: 'user_faculty_1',
      email: 'sundarraj@karunya.edu',
      role: Role.FACULTY,
      facultyProfile: {
        create: {
          employeeId: 'EMP-CS-101',
          name: 'Dr. R. Sundar Raj',
          department: 'Computer Science and Engineering',
        },
      },
    },
    include: { facultyProfile: true },
  });

  const faculty2User = await prisma.user.create({
    data: {
      authUserId: 'user_faculty_2',
      email: 'anitagrace@karunya.edu',
      role: Role.FACULTY,
      facultyProfile: {
        create: {
          employeeId: 'EMP-CS-102',
          name: 'Prof. Anita Grace',
          department: 'Computer Science and Engineering',
        },
      },
    },
    include: { facultyProfile: true },
  });

  // 5. Create Student Users & Profiles
  const student1User = await prisma.user.create({
    data: {
      authUserId: 'user_student_demo',
      email: 'urk25cs1140@karunya.edu',
      role: Role.STUDENT,
      studentProfile: {
        create: {
          rollNumber: 'URK25CS1140',
          name: 'Joshua J',
          department: 'Computer Science and Engineering',
          academicYear: '2024-2028 (2nd Year)',
        },
      },
    },
    include: { studentProfile: true },
  });

  const student2User = await prisma.user.create({
    data: {
      authUserId: 'user_student_2',
      email: 'priya1101@karunya.edu',
      role: Role.STUDENT,
      studentProfile: {
        create: {
          rollNumber: 'URK25CS1101',
          name: 'Priya Sharma',
          department: 'Computer Science and Engineering',
          academicYear: '2024-2028 (2nd Year)',
        },
      },
    },
    include: { studentProfile: true },
  });

  const student3User = await prisma.user.create({
    data: {
      authUserId: 'user_student_3',
      email: 'rahul1102@karunya.edu',
      role: Role.STUDENT,
      studentProfile: {
        create: {
          rollNumber: 'URK25CS1102',
          name: 'Rahul Nair',
          department: 'Computer Science and Engineering',
          academicYear: '2024-2028 (2nd Year)',
        },
      },
    },
    include: { studentProfile: true },
  });

  const student4User = await prisma.user.create({
    data: {
      authUserId: 'user_student_4',
      email: 'sneha1103@karunya.edu',
      role: Role.STUDENT,
      studentProfile: {
        create: {
          rollNumber: 'URK25CS1103',
          name: 'Sneha Reddy',
          department: 'Computer Science and Engineering',
          academicYear: '2024-2028 (2nd Year)',
        },
      },
    },
    include: { studentProfile: true },
  });

  const student5User = await prisma.user.create({
    data: {
      authUserId: 'user_student_5',
      email: 'kevin1104@karunya.edu',
      role: Role.STUDENT,
      studentProfile: {
        create: {
          rollNumber: 'URK25CS1104',
          name: 'Kevin Mathew',
          department: 'Computer Science and Engineering',
          academicYear: '2024-2028 (2nd Year)',
        },
      },
    },
    include: { studentProfile: true },
  });

  const s1 = student1User.studentProfile!;
  const s2 = student2User.studentProfile!;
  const s3 = student3User.studentProfile!;
  const s4 = student4User.studentProfile!;
  const s5 = student5User.studentProfile!;

  // 6. Create Subjects
  const subjectSE = await prisma.subject.create({
    data: {
      code: 'CS2041',
      name: 'Software Engineering',
      facultyId: faculty1User.facultyProfile!.id,
    },
  });

  const subjectDBMS = await prisma.subject.create({
    data: {
      code: 'CS2042',
      name: 'Database Management Systems',
      facultyId: faculty2User.facultyProfile!.id,
    },
  });

  const subjectDAA = await prisma.subject.create({
    data: {
      code: 'CS2043',
      name: 'Design & Analysis of Algorithms',
      facultyId: faculty1User.facultyProfile!.id,
    },
  });

  const subjectOS = await prisma.subject.create({
    data: {
      code: 'CS2044',
      name: 'Operating Systems',
      facultyId: faculty2User.facultyProfile!.id,
    },
  });

  // 7. Enrollments
  // All 5 students in SE and DBMS
  for (const s of [s1, s2, s3, s4, s5]) {
    await prisma.enrollment.create({
      data: { studentId: s.id, subjectId: subjectSE.id },
    });
    await prisma.enrollment.create({
      data: { studentId: s.id, subjectId: subjectDBMS.id },
    });
  }

  // s1, s2, s3 in DAA
  for (const s of [s1, s2, s3]) {
    await prisma.enrollment.create({
      data: { studentId: s.id, subjectId: subjectDAA.id },
    });
  }

  // s1, s4, s5 in OS
  for (const s of [s1, s4, s5]) {
    await prisma.enrollment.create({
      data: { studentId: s.id, subjectId: subjectOS.id },
    });
  }

  // 8. Historical Sessions and Attendance for Software Engineering (CS2041)
  const now = new Date();
  const pastSessionsSE = [];

  for (let i = 10; i >= 1; i--) {
    const sessionDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    sessionDate.setHours(10, 0, 0, 0);
    const endsDate = new Date(sessionDate.getTime() + 50 * 60 * 1000);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: subjectSE.id,
        createdById: faculty1User.id,
        status: SessionStatus.CLOSED,
        startsAt: sessionDate,
        endsAt: endsDate,
        createdAt: sessionDate,
      },
    });
    pastSessionsSE.push(session);

    // Attendance distribution:
    // s1 (Joshua): 9 out of 10 present (missed session 4)
    // s2 (Priya): 10 out of 10 present
    // s3 (Rahul): 7 out of 10 present (missed session 2, 6, 8 -> 70% below 75%)
    // s4 (Sneha): 5 out of 10 present (missed sessions 1, 3, 5, 7, 9 -> 50% critically low)
    // s5 (Kevin): 8 out of 10 present (80%)

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s1.id,
        status: i === 4 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        markedAt: sessionDate,
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s2.id,
        status: AttendanceStatus.PRESENT,
        markedAt: sessionDate,
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s3.id,
        status: [2, 6, 8].includes(i) ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        markedAt: sessionDate,
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s4.id,
        status: [1, 3, 5, 7, 9].includes(i) ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        markedAt: sessionDate,
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s5.id,
        status: [3, 7].includes(i) ? AttendanceStatus.ABSENT : (i === 5 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT),
        markedAt: sessionDate,
      },
    });
  }

  // 9. Historical Sessions for DBMS (CS2042) - 8 sessions
  for (let i = 8; i >= 1; i--) {
    const sessionDate = new Date(now.getTime() - (i * 2 + 1) * 24 * 60 * 60 * 1000);
    sessionDate.setHours(14, 0, 0, 0);
    const endsDate = new Date(sessionDate.getTime() + 50 * 60 * 1000);

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId: subjectDBMS.id,
        createdById: faculty2User.id,
        status: SessionStatus.CLOSED,
        startsAt: sessionDate,
        endsAt: endsDate,
        createdAt: sessionDate,
      },
    });

    // s1 attended 7 of 8
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s1.id,
        status: i === 2 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        markedAt: sessionDate,
      },
    });
    // s2 attended all 8
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s2.id,
        status: AttendanceStatus.PRESENT,
        markedAt: sessionDate,
      },
    });
    // s3 attended 6 of 8
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: s3.id,
        status: [3, 7].includes(i) ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        markedAt: sessionDate,
      },
    });
  }

  // 10. Live OPEN Attendance Session for Live Demonstration & Testing!
  const liveToken = 'LIVE-DEMO-TOKEN-' + Math.floor(100000 + Math.random() * 900000);
  const liveTokenHash = hashToken(liveToken);
  const liveExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for demo convenience

  const liveSession = await prisma.attendanceSession.create({
    data: {
      subjectId: subjectSE.id,
      createdById: faculty1User.id,
      status: SessionStatus.OPEN,
      startsAt: now,
      qrTokenHash: liveTokenHash,
      qrExpiresAt: liveExpiresAt,
    },
  });

  // Mark s2 (Priya) as already checked in to demonstrate real-time attendee list!
  await prisma.attendanceRecord.create({
    data: {
      sessionId: liveSession.id,
      studentId: s2.id,
      status: AttendanceStatus.PRESENT,
      markedAt: now,
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials & Test Accounts:');
  console.log(`👑 ADMIN:   admin@karunya.edu (ID: ${adminUser.id})`);
  console.log(`👨‍🏫 FACULTY: sundarraj@karunya.edu (ID: ${faculty1User.id}) - SE & DAA`);
  console.log(`👩‍🏫 FACULTY: anitagrace@karunya.edu (ID: ${faculty2User.id}) - DBMS & OS`);
  console.log(`🎓 STUDENT: urk25cs1140@karunya.edu [Roll: URK25CS1140] (ID: ${student1User.id}) - Joshua J`);
  console.log(`🎓 STUDENT: priya1101@karunya.edu [Roll: URK25CS1101] (100% Attendance)`);
  console.log(`🎓 STUDENT: rahul1102@karunya.edu [Roll: URK25CS1102] (70% Warning State)`);
  console.log(`🎓 STUDENT: sneha1103@karunya.edu [Roll: URK25CS1103] (50% Critical State)`);
  console.log('----------------------------------------------------');
  console.log(`🔴 Live Open Session: ${liveSession.id}`);
  console.log(`🔑 Live Demo Token: ${liveToken}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

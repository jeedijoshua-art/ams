import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import {
  previewStudentCsv,
  executeStudentBulkImport,
  validateEmail,
  validateRollNumber,
  validateName,
} from '@/lib/student-import';
import { generateCsv, generateStudentRegistrationTemplateCsv } from '@/lib/csv';
import { authConfig } from '@/auth';

type AnyFn = (...args: any[]) => any;

describe('AMS Bulk Student Registration & Validation Engine', () => {
  let adminUser: any;
  let existingStudentUser: any;
  const createdUserIds: string[] = [];
  const createdBatchIds: string[] = [];

  beforeAll(async () => {
    // 1. Create an admin user fixture to represent the importing administrator
    adminUser = await prisma.user.create({
      data: {
        authUserId: `auth_adm_test_${Date.now()}`,
        email: `admin.test.${Date.now()}@karunya.edu`,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    createdUserIds.push(adminUser.id);

    // 2. Create an existing student user fixture to test conflict detection
    existingStudentUser = await prisma.user.create({
      data: {
        authUserId: `auth_std_exist_${Date.now()}`,
        email: `existing.student.${Date.now()}@karunya.edu`,
        role: Role.STUDENT,
        isActive: true,
        studentProfile: {
          create: {
            rollNumber: `URK25CS9999`,
            name: 'Existing Database Student',
            department: 'Computer Science and Engineering',
            academicYear: '2024-2028 (2nd Year)',
            classSection: 'CSE-A',
            isActive: true,
          },
        },
      },
      include: { studentProfile: true },
    });
    createdUserIds.push(existingStudentUser.id);
  });

  afterAll(async () => {
    // Clean up created student profiles, batches, and users
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

  // --------------------------------------------------------------------------
  // 1. CSV Template & Sanitization
  // --------------------------------------------------------------------------

  it('1. generates a valid RFC 4180 student registration template with formula injection defense', () => {
    const template = generateStudentRegistrationTemplateCsv();
    expect(template).toContain('Roll Number,Student Name,Institutional Email,Department,Academic Year');
    expect(template).not.toContain('Class Section');

    // Test formula injection defense in generateCsv
    const maliciousCsv = generateCsv(
      ['Command', 'Name'],
      [
        ['=cmd|/C calc!A0', 'Normal Name'],
        ['+cmd|/C calc!A0', '@admin'],
      ]
    );
    expect(maliciousCsv).toContain("'=cmd|/C calc!A0");
    expect(maliciousCsv).toContain("'+cmd|/C calc!A0");
    expect(maliciousCsv).toContain("'@admin");
  });

  // --------------------------------------------------------------------------
  // 2. Field Validators
  // --------------------------------------------------------------------------

  it('2. validates student email, roll number, and name formats accurately', () => {
    // Valid emails
    expect(validateEmail('student@karunya.edu')).toBe(true);
    expect(validateEmail('student.first@karunya.edu.in')).toBe(true);
    expect(validateEmail('student123@domain.org')).toBe(true);

    // Invalid emails
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('invalid-no-at')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('spaces in@domain.com')).toBe(false);

    // Roll numbers
    expect(validateRollNumber('URK25CS1001')).toBe(true);
    expect(validateRollNumber('23CS012')).toBe(true);
    expect(validateRollNumber('CSE-2024-001')).toBe(true);
    expect(validateRollNumber('')).toBe(false);
    expect(validateRollNumber('AB')).toBe(false); // Too short (<3)
    expect(validateRollNumber('A'.repeat(35))).toBe(false); // Too long (>30)
    expect(validateRollNumber('URK<SCRIPT>')).toBe(false);

    // Student names
    expect(validateName('Aarav Sharma')).toBe(true);
    expect(validateName('Diya S. Patel')).toBe(true);
    expect(validateName('Mary-Jane Watson')).toBe(true);
    expect(validateName('A')).toBe(false); // Too short
    expect(validateName('')).toBe(false);
    expect(validateName('A'.repeat(105))).toBe(false); // Too long
  });

  // --------------------------------------------------------------------------
  // 3. Preview & Validation Logic
  // --------------------------------------------------------------------------

  it('3. accurately previews valid new student records from a Google Sheet CSV', async () => {
    const timestamp = Date.now();
    const csvContent = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      `URK25CS${timestamp}1,New Student One,new.std.one.${timestamp}@karunya.edu,Computer Science,2024-2028`,
      `URK25CS${timestamp}2,New Student Two,new.std.two.${timestamp}@karunya.edu,Computer Science,2024-2028`,
    ].join('\n');

    const preview = await previewStudentCsv(csvContent);

    expect(preview.totalRows).toBe(2);
    expect(preview.validNewCount).toBe(2);
    expect(preview.existingCount).toBe(0);
    expect(preview.duplicateCount).toBe(0);
    expect(preview.invalidCount).toBe(0);
    expect(preview.newStudents[0].rollNumber).toBe(`URK25CS${timestamp}1`);
    expect(preview.newStudents[1].rollNumber).toBe(`URK25CS${timestamp}2`);
  });

  it('4. detects and isolates invalid rows with clear row-level error messages', async () => {
    const timestamp = Date.now();
    const csvWithErrors = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      // Row 2: Valid
      `URK25CS${timestamp}1,Valid Student,valid.${timestamp}@karunya.edu,CSE,2024-2028`,
      // Row 3: Missing Roll Number
      `,Missing Roll,missingroll.${timestamp}@karunya.edu,CSE,2024-2028`,
      // Row 4: Invalid Email
      `URK25CS${timestamp}2,Bad Email Student,not-an-email,CSE,2024-2028`,
      // Row 5: Missing Name
      `URK25CS${timestamp}3,,noname.${timestamp}@karunya.edu,CSE,2024-2028`,
    ].join('\n');

    const preview = await previewStudentCsv(csvWithErrors);

    expect(preview.totalRows).toBe(4);
    expect(preview.validNewCount).toBe(1);
    expect(preview.invalidCount).toBe(3);

    const row3Error = preview.invalidRows.find((e) => e.rowNumber === 3);
    expect(row3Error).toBeDefined();
    expect(row3Error?.field).toBe('Roll Number');

    const row4Error = preview.invalidRows.find((e) => e.rowNumber === 4);
    expect(row4Error).toBeDefined();
    expect(row4Error?.field).toBe('Institutional Email');

    const row5Error = preview.invalidRows.find((e) => e.rowNumber === 5);
    expect(row5Error).toBeDefined();
    expect(row5Error?.field).toBe('Student Name');
  });

  it('5. identifies internal duplicate emails and roll numbers within the same CSV', async () => {
    const timestamp = Date.now();
    const csvWithDups = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      // Row 2: First appearance
      `URK25CS${timestamp}1,Student Alpha,alpha.${timestamp}@karunya.edu,CSE,2024-2028`,
      // Row 3: Duplicate Email
      `URK25CS${timestamp}2,Student Beta Duplicate Email,alpha.${timestamp}@karunya.edu,CSE,2024-2028`,
      // Row 4: Duplicate Roll Number
      `URK25CS${timestamp}1,Student Gamma Duplicate Roll,gamma.${timestamp}@karunya.edu,CSE,2024-2028`,
    ].join('\n');

    const preview = await previewStudentCsv(csvWithDups);

    expect(preview.totalRows).toBe(3);
    expect(preview.validNewCount).toBe(1);
    expect(preview.duplicateCount).toBe(2);

    expect(preview.duplicatesInCsv[0].rowNumber).toBe(3);
    expect(preview.duplicatesInCsv[0].duplicateField).toBe('EMAIL');
    expect(preview.duplicatesInCsv[0].originalRowNumber).toBe(2);

    expect(preview.duplicatesInCsv[1].rowNumber).toBe(4);
    expect(preview.duplicatesInCsv[1].duplicateField).toBe('ROLL_NUMBER');
    expect(preview.duplicatesInCsv[1].originalRowNumber).toBe(2);
  });

  it('6. detects conflicts with existing database records without modifying them', async () => {
    const timestamp = Date.now();
    const csvWithDbConflict = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      // Row 2: Matches existing email
      `URK25CS${timestamp}8,Conflicting Email Student,${existingStudentUser.email},CSE,2024-2028`,
      // Row 3: Matches existing roll number
      `URK25CS9999,Conflicting Roll Student,fresh.email.${timestamp}@karunya.edu,CSE,2024-2028`,
      // Row 4: Fresh valid student
      `URK25CS${timestamp}9,Fresh Student,fresh.${timestamp}@karunya.edu,CSE,2024-2028`,
    ].join('\n');

    const preview = await previewStudentCsv(csvWithDbConflict);

    expect(preview.totalRows).toBe(3);
    expect(preview.validNewCount).toBe(1);
    expect(preview.existingCount).toBe(2);

    expect(preview.existingConflicts.some((c) => c.conflictType === 'EMAIL_EXISTS')).toBe(true);
    expect(preview.existingConflicts.some((c) => c.conflictType === 'ROLL_EXISTS')).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 4. Execution & Transaction Safety
  // --------------------------------------------------------------------------

  it('7. executes bulk import in a transaction, creates users and student profiles, and logs audit batch', async () => {
    const timestamp = Date.now();
    const student1Email = `import.batch.one.${timestamp}@karunya.edu`;
    const student2Email = `import.batch.two.${timestamp}@karunya.edu`;
    const student1Roll = `URK25CS${timestamp}A`;
    const student2Roll = `URK25CS${timestamp}B`;

    const csvToImport = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      `${student1Roll},Imported Student One,${student1Email},Computer Science,2024-2028`,
      `${student2Roll},Imported Student Two,${student2Email},Computer Science,2024-2028`,
    ].join('\n');

    const result = await executeStudentBulkImport(
      adminUser.id,
      csvToImport,
      'google-sheets-september-roster.csv'
    );

    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(2);
    expect(result.batchId).toBeDefined();
    if (result.batchId) createdBatchIds.push(result.batchId);

    // Track created user IDs for cleanup
    result.createdStudents.forEach((s) => createdUserIds.push(s.id));

    // Verify DB user records
    const dbUser1 = await prisma.user.findUnique({
      where: { email: student1Email },
      include: { studentProfile: true },
    });
    expect(dbUser1).not.toBeNull();
    expect(dbUser1?.role).toBe(Role.STUDENT);
    expect(dbUser1?.isActive).toBe(true);
    expect(dbUser1?.studentProfile?.rollNumber).toBe(student1Roll);

    // Verify audit batch record
    const auditBatch = await prisma.studentImportBatch.findUnique({
      where: { id: result.batchId! },
    });
    expect(auditBatch).not.toBeNull();
    expect(auditBatch?.adminId).toBe(adminUser.id);
    expect(auditBatch?.createdCount).toBe(2);
    expect(auditBatch?.status).toBe('SUCCESS');
  });

  it('8. repeated imports skip already created records safely and do not duplicate accounts', async () => {
    const timestamp = Date.now();
    const studentEmail = `repeated.student.${timestamp}@karunya.edu`;
    const studentRoll = `URK25CS${timestamp}R`;

    const singleStudentCsv = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      `${studentRoll},Repeated Student,${studentEmail},Computer Science,2024-2028`,
    ].join('\n');

    // First import: registers 1
    const firstResult = await executeStudentBulkImport(adminUser.id, singleStudentCsv);
    expect(firstResult.createdCount).toBe(1);
    if (firstResult.batchId) createdBatchIds.push(firstResult.batchId);
    firstResult.createdStudents.forEach((s) => createdUserIds.push(s.id));

    // Second import with identical CSV: skips 1, registers 0
    const secondResult = await executeStudentBulkImport(adminUser.id, singleStudentCsv);
    expect(secondResult.createdCount).toBe(0);
    expect(secondResult.skippedCount).toBe(1);
    if (secondResult.batchId) createdBatchIds.push(secondResult.batchId);

    // Check database has exactly 1 record for this roll number
    const count = await prisma.studentProfile.count({
      where: { rollNumber: studentRoll },
    });
    expect(count).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 5. Integration with Google Sign-in Authorization
  // --------------------------------------------------------------------------

  it('9. newly registered student can immediately authorize via verified Google OAuth', async () => {
    const timestamp = Date.now();
    const verifiedStudentEmail = `google.verified.${timestamp}@karunya.edu`;
    const verifiedStudentRoll = `URK25CS${timestamp}V`;

    const csvContent = [
      'Roll Number,Student Name,Institutional Email,Department,Academic Year',
      `${verifiedStudentRoll},Verified Google Student,${verifiedStudentEmail},Computer Science,2024-2028`,
    ].join('\n');

    const importRes = await executeStudentBulkImport(adminUser.id, csvContent);
    expect(importRes.createdCount).toBe(1);
    if (importRes.batchId) createdBatchIds.push(importRes.batchId);
    importRes.createdStudents.forEach((s) => createdUserIds.push(s.id));

    // Now test Google Auth.js signIn callback for this newly registered student
    const signInCallback = authConfig.callbacks?.signIn as AnyFn;
    const mockUser: any = { email: verifiedStudentEmail };
    const mockAccount: any = { provider: 'google', providerAccountId: 'google_oauth_sub_12345' };
    const mockProfile: any = { email: verifiedStudentEmail, email_verified: true };

    const authResult = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: mockProfile,
    });

    expect(authResult).toBe(true);
    expect(mockUser.id).toBeDefined();
    expect(mockUser.role).toBe(Role.STUDENT);

    // Also confirm unverified Google email is strictly rejected for this same student
    const unverifiedAuthResult = await signInCallback({
      user: mockUser,
      account: mockAccount,
      profile: { email: verifiedStudentEmail, email_verified: false },
    });
    expect(unverifiedAuthResult).toBe('/unauthorized?reason=unverified_email');
  });

  it('10. handles UTF-8 BOM, Windows CRLF, and Google Sheets quoted values correctly', async () => {
    const timestamp = Date.now();
    const email = `quoted.${timestamp}@karunya.edu`;
    const roll = `URK25CS${timestamp}Q`;

    // Google Sheets often wraps names with commas in quotes and uses CRLF:
    const bomCsv =
      '\uFEFF' +
      '"Roll Number","Student Name","Institutional Email","Department","Academic Year"\r\n' +
      `"${roll}","Sharma, Aarav K.","${email}","Computer Science and Engineering","2024-2028 (2nd Year)"\r\n`;

    const preview = await previewStudentCsv(bomCsv);
    expect(preview.validNewCount).toBe(1);
    expect(preview.newStudents[0].rollNumber).toBe(roll);
    expect(preview.newStudents[0].name).toBe('Sharma, Aarav K.');
    expect(preview.newStudents[0].email).toBe(email);
  });
});

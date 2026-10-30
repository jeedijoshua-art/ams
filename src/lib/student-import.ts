import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { parseCsv } from '@/lib/csv';

export const MAX_IMPORT_ROWS = 2000;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ParsedStudentRow {
  rowNumber: number;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  academicYear: string;
  raw: Record<string, string>;
}

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value?: string;
}

export interface ExistingConflict {
  rowNumber: number;
  rollNumber: string;
  email: string;
  name: string;
  conflictType: 'EMAIL_EXISTS' | 'ROLL_EXISTS' | 'BOTH_EXIST';
  detail: string;
}

export interface DuplicateInCsv {
  rowNumber: number;
  rollNumber: string;
  email: string;
  duplicateField: 'EMAIL' | 'ROLL_NUMBER' | 'BOTH';
  originalRowNumber: number;
}

export interface StudentImportPreviewResult {
  totalRows: number;
  validNewCount: number;
  existingCount: number;
  duplicateCount: number;
  invalidCount: number;
  newStudents: ParsedStudentRow[];
  existingConflicts: ExistingConflict[];
  duplicatesInCsv: DuplicateInCsv[];
  invalidRows: RowValidationError[];
}

export interface StudentImportExecutionResult {
  success: boolean;
  batchId?: string;
  totalProcessed: number;
  createdCount: number;
  skippedCount: number;
  rejectedCount: number;
  createdStudents: Array<{ id: string; rollNumber: string; email: string; name: string }>;
  errors: string[];
}

/**
 * Normalized header key lookup tolerant of Google Form question text
 * e.g. "Enter your Roll Number", "Institutional Email Address (Google)", "Full Name as per records"
 */
export function findField(row: Record<string, string>, targets: string[]): string {
  for (const target of targets) {
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey.includes(cleanTarget) || cleanTarget.includes(cleanKey)) {
        return val;
      }
    }
  }
  return '';
}

/**
 * Strict server-side validation for student fields
 */
export function validateEmail(email: string): boolean {
  if (!email || email.length > 120) return false;
  // RFC 5322 compatible institutional email pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

export function validateRollNumber(rollNumber: string): boolean {
  if (!rollNumber || rollNumber.length < 3 || rollNumber.length > 30) return false;
  // Alphanumeric with optional hyphens/underscores (e.g. URK25CS1001, 23CS012, CSE-2024-001)
  return /^[A-Z0-9\-_]+$/i.test(rollNumber);
}

export function validateName(name: string): boolean {
  if (!name || name.trim().length < 2 || name.trim().length > 100) return false;
  // Allow letters, spaces, dots, commas, and hyphens (e.g. "Sharma, Aarav K.")
  return /^[\p{L}\s.',\-]+$/u.test(name.trim());
}

/**
 * Parses and verifies student CSV text against database records without making changes.
 */
export async function previewStudentCsv(csvText: string): Promise<StudentImportPreviewResult> {
  if (!csvText || !csvText.trim()) {
    throw new Error('CSV text is empty.');
  }

  const { rows } = parseCsv(csvText);

  if (rows.length === 0) {
    throw new Error('The uploaded CSV file contains no data rows.');
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`CSV contains ${rows.length} rows, which exceeds the limit of ${MAX_IMPORT_ROWS} rows per batch.`);
  }

  const parsedValidRows: ParsedStudentRow[] = [];
  const invalidRows: RowValidationError[] = [];
  const duplicatesInCsv: DuplicateInCsv[] = [];

  const seenRolls = new Map<string, number>(); // roll -> first seen row number
  const seenEmails = new Map<string, number>(); // email -> first seen row number

  // 1. Row-level syntax and constraint validation
  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row

    const rawRoll = findField(row, ['rollnumber', 'rollno', 'roll', 'regno', 'registrationnumber', 'idnumber']);
    const rawName = findField(row, ['name', 'studentname', 'fullname', 'candidatename']);
    const rawEmail = findField(row, ['email', 'emailaddress', 'studentemail', 'institutionalemail', 'googleemail']);
    const rawDept = findField(row, ['department', 'dept', 'branch', 'program']);
    const rawYear = findField(row, ['academicyear', 'year', 'batch']);

    const rollNumber = rawRoll.trim().toUpperCase();
    const name = rawName.trim();
    const email = rawEmail.trim().toLowerCase();
    const department = rawDept.trim() || 'Computer Science and Engineering';
    const academicYear = rawYear.trim() || '2024-2028 (2nd Year)';

    let hasError = false;

    if (!rollNumber) {
      invalidRows.push({ rowNumber, field: 'Roll Number', message: 'Missing Roll Number' });
      hasError = true;
    } else if (!validateRollNumber(rollNumber)) {
      invalidRows.push({
        rowNumber,
        field: 'Roll Number',
        message: 'Invalid roll number format (must be 3-30 alphanumeric characters)',
        value: rollNumber,
      });
      hasError = true;
    }

    if (!name) {
      invalidRows.push({ rowNumber, field: 'Student Name', message: 'Missing Student Name' });
      hasError = true;
    } else if (!validateName(name)) {
      invalidRows.push({
        rowNumber,
        field: 'Student Name',
        message: 'Name contains invalid characters or is too short (min 2 characters)',
        value: name,
      });
      hasError = true;
    }

    if (!email) {
      invalidRows.push({ rowNumber, field: 'Institutional Email', message: 'Missing Institutional Email' });
      hasError = true;
    } else if (!validateEmail(email)) {
      invalidRows.push({
        rowNumber,
        field: 'Institutional Email',
        message: 'Invalid email address format',
        value: email,
      });
      hasError = true;
    }

    if (hasError) return;

    // Check duplicate within the uploaded CSV file
    const isDupEmail = seenEmails.has(email);
    const isDupRoll = seenRolls.has(rollNumber);

    if (isDupEmail || isDupRoll) {
      duplicatesInCsv.push({
        rowNumber,
        rollNumber,
        email,
        duplicateField: isDupEmail && isDupRoll ? 'BOTH' : isDupEmail ? 'EMAIL' : 'ROLL_NUMBER',
        originalRowNumber: isDupEmail ? seenEmails.get(email)! : seenRolls.get(rollNumber)!,
      });
      return;
    }

    seenRolls.set(rollNumber, rowNumber);
    seenEmails.set(email, rowNumber);

    parsedValidRows.push({
      rowNumber,
      rollNumber,
      name,
      email,
      department,
      academicYear,
      raw: row,
    });
  });

  // 2. Database conflict resolution
  const candidateEmails = parsedValidRows.map((r) => r.email);
  const candidateRolls = parsedValidRows.map((r) => r.rollNumber);

  const [existingUsers, existingStudentProfiles] = await Promise.all([
    candidateEmails.length > 0
      ? prisma.user.findMany({
          where: { email: { in: candidateEmails } },
          select: { email: true, role: true, isActive: true },
        })
      : [],
    candidateRolls.length > 0
      ? prisma.studentProfile.findMany({
          where: { rollNumber: { in: candidateRolls } },
          select: { rollNumber: true, name: true, isActive: true },
        })
      : [],
  ]);

  const existingEmailMap = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));
  const existingRollMap = new Map(existingStudentProfiles.map((p) => [p.rollNumber.toUpperCase(), p]));

  const newStudents: ParsedStudentRow[] = [];
  const existingConflicts: ExistingConflict[] = [];

  for (const student of parsedValidRows) {
    const existingUser = existingEmailMap.get(student.email);
    const existingProfile = existingRollMap.get(student.rollNumber);

    if (existingUser || existingProfile) {
      const conflictType =
        existingUser && existingProfile
          ? 'BOTH_EXIST'
          : existingUser
          ? 'EMAIL_EXISTS'
          : 'ROLL_EXISTS';

      const details: string[] = [];
      if (existingUser) {
        details.push(`Email already registered (Role: ${existingUser.role}, Active: ${existingUser.isActive})`);
      }
      if (existingProfile) {
        details.push(`Roll number already exists (Assigned to: ${existingProfile.name})`);
      }

      existingConflicts.push({
        rowNumber: student.rowNumber,
        rollNumber: student.rollNumber,
        email: student.email,
        name: student.name,
        conflictType,
        detail: details.join('; '),
      });
    } else {
      newStudents.push(student);
    }
  }

  return {
    totalRows: rows.length,
    validNewCount: newStudents.length,
    existingCount: existingConflicts.length,
    duplicateCount: duplicatesInCsv.length,
    invalidCount: invalidRows.length,
    newStudents,
    existingConflicts,
    duplicatesInCsv,
    invalidRows,
  };
}

/**
 * Server-side confirmed import with database transactions, audit logging, and concurrency safety.
 */
export async function executeStudentBulkImport(
  adminId: string,
  csvText: string,
  filename?: string
): Promise<StudentImportExecutionResult> {
  // Always independently re-verify preview on the server
  const preview = await previewStudentCsv(csvText);

  if (preview.newStudents.length === 0) {
    return {
      success: true,
      totalProcessed: preview.totalRows,
      createdCount: 0,
      skippedCount: preview.existingCount + preview.duplicateCount,
      rejectedCount: preview.invalidCount,
      createdStudents: [],
      errors: preview.invalidRows.map((e) => `Row ${e.rowNumber} (${e.field}): ${e.message}`),
    };
  }

  const createdStudents: Array<{ id: string; rollNumber: string; email: string; name: string }> = [];
  const errors: string[] = [];

  // Transaction-safe execution with isolation
  const result = await prisma.$transaction(
    async (tx) => {
      let count = 0;

    for (const student of preview.newStudents) {
      // Generate a collision-resistant authUserId for Google OAuth linking
      const authUserId = `auth_std_${student.rollNumber.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      try {
        const createdUser = await tx.user.create({
          data: {
            email: student.email,
            authUserId,
            role: Role.STUDENT,
            isActive: true,
            studentProfile: {
              create: {
                name: student.name,
                rollNumber: student.rollNumber,
                department: student.department,
                academicYear: student.academicYear,
                isActive: true,
              },
            },
          },
          include: { studentProfile: true },
        });

        createdStudents.push({
          id: createdUser.id,
          rollNumber: student.rollNumber,
          email: student.email,
          name: student.name,
        });

        count++;
      } catch (err: any) {
        // Handle race conditions or concurrent unique constraint collision
        if (err.code === 'P2002') {
          errors.push(`Row ${student.rowNumber}: Race condition collision on Roll Number or Email. Skipped.`);
        } else {
          throw err;
        }
      }
    }

    // Record audit batch
    const batch = await tx.studentImportBatch.create({
      data: {
        adminId,
        filename: filename || 'google-sheets-import.csv',
        totalRows: preview.totalRows,
        createdCount: count,
        skippedCount: preview.existingCount + preview.duplicateCount + (preview.newStudents.length - count),
        rejectedCount: preview.invalidCount,
        status: count > 0 ? (preview.invalidCount > 0 ? 'PARTIAL' : 'SUCCESS') : 'FAILED',
      },
    });

    return { count, batchId: batch.id };
  }, { timeout: 20000 });

  return {
    success: true,
    batchId: result.batchId,
    totalProcessed: preview.totalRows,
    createdCount: result.count,
    skippedCount: preview.existingCount + preview.duplicateCount + (preview.newStudents.length - result.count),
    rejectedCount: preview.invalidCount,
    createdStudents,
    errors,
  };
}

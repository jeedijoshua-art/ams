import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';
import { Role } from '@prisma/client';

export async function POST(request: Request) {
  try {
    await requireAdmin();

    let csvText = '';
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      csvText = body.csvText || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (file) {
        csvText = await file.text();
      }
    } else {
      csvText = await request.text();
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: 'CSV data is required.' }, { status: 400 });
    }

    const { headers, rows } = parseCsv(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'The uploaded CSV file contains no data rows.' }, { status: 400 });
    }

    // Helper to find key case-insensitively
    const findField = (row: Record<string, string>, targets: string[]): string => {
      for (const target of targets) {
        for (const [key, val] of Object.entries(row)) {
          if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === target.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            return val;
          }
        }
      }
      return '';
    };

    const errors: string[] = [];
    const validStudents: Array<{
      rollNumber: string;
      name: string;
      email: string;
      department: string;
      academicYear: string;
      classSection?: string;
    }> = [];

    const seenRolls = new Set<string>();
    const seenEmails = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rollNumber = findField(row, ['rollnumber', 'rollno', 'roll']).trim().toUpperCase();
      const name = findField(row, ['name', 'studentname', 'fullname']).trim();
      const email = findField(row, ['email', 'emailaddress', 'studentemail']).trim().toLowerCase();
      const department = findField(row, ['department', 'dept']).trim() || 'Computer Science and Engineering';
      const academicYear = findField(row, ['academicyear', 'year']).trim() || '2024-2028 (2nd Year)';
      const classSection = findField(row, ['classsection', 'section', 'class']).trim().toUpperCase() || 'CSE-A';

      if (!rollNumber) {
        errors.push(`Row ${rowNum}: Missing required field 'rollNumber'.`);
        return;
      }
      if (!name) {
        errors.push(`Row ${rowNum}: Missing required field 'name'.`);
        return;
      }
      if (!email || !email.includes('@')) {
        errors.push(`Row ${rowNum}: Invalid email address '${email}'.`);
        return;
      }

      if (seenRolls.has(rollNumber)) {
        errors.push(`Row ${rowNum}: Duplicate Roll Number '${rollNumber}' inside uploaded CSV.`);
        return;
      }
      if (seenEmails.has(email)) {
        errors.push(`Row ${rowNum}: Duplicate Email '${email}' inside uploaded CSV.`);
        return;
      }

      seenRolls.add(rollNumber);
      seenEmails.add(email);

      validStudents.push({
        rollNumber,
        name,
        email,
        department,
        academicYear,
        classSection,
      });
    });

    if (validStudents.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid student records found in CSV.',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Fetch existing records to prevent collisions
    const existingEmails = await prisma.user.findMany({
      where: { email: { in: Array.from(seenEmails) } },
      select: { email: true },
    });
    const existingRolls = await prisma.studentProfile.findMany({
      where: { rollNumber: { in: Array.from(seenRolls) } },
      select: { rollNumber: true },
    });

    const dbEmailSet = new Set(existingEmails.map((e) => e.email.toLowerCase()));
    const dbRollSet = new Set(existingRolls.map((r) => r.rollNumber.toUpperCase()));

    const toInsert = validStudents.filter((s) => {
      if (dbEmailSet.has(s.email)) {
        errors.push(`Student with email '${s.email}' already exists in AMS database. Skipped.`);
        return false;
      }
      if (dbRollSet.has(s.rollNumber)) {
        errors.push(`Student with roll number '${s.rollNumber}' already exists in AMS database. Skipped.`);
        return false;
      }
      return true;
    });

    // Transaction-safe persistence
    const createdCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const s of toInsert) {
        const authUserId = `auth_${s.rollNumber.toLowerCase()}_${Date.now()}`;
        await tx.user.create({
          data: {
            email: s.email,
            authUserId,
            role: Role.STUDENT,
            isActive: true,
            studentProfile: {
              create: {
                name: s.name,
                rollNumber: s.rollNumber,
                department: s.department,
                academicYear: s.academicYear,
                classSection: s.classSection,
                isActive: true,
              },
            },
          },
        });
        count++;
      }
      return count;
    });

    return NextResponse.json({
      success: true,
      importedCount: createdCount,
      skippedCount: validStudents.length - createdCount,
      errors,
    });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'CSV Import failed' }, { status });
  }
}

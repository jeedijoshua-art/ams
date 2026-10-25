import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';

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

    const { rows } = parseCsv(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'The uploaded CSV file contains no data rows.' }, { status: 400 });
    }

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
    const validPairs: Array<{ rollNumber: string; subjectCode: string }> = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rollNumber = findField(row, ['rollnumber', 'rollno', 'roll']).trim().toUpperCase();
      const subjectCode = findField(row, ['subjectcode', 'subject', 'coursecode', 'code']).trim().toUpperCase();

      if (!rollNumber || !subjectCode) {
        errors.push(`Row ${rowNum}: Both 'rollNumber' and 'subjectCode' are required.`);
        return;
      }

      validPairs.push({ rollNumber, subjectCode });
    });

    if (validPairs.length === 0) {
      return NextResponse.json(
        { error: 'No valid enrollment rows found.', details: errors },
        { status: 400 }
      );
    }

    // Cache students and subjects for lookup
    const allStudents = await prisma.studentProfile.findMany({
      select: { id: true, rollNumber: true },
    });
    const allSubjects = await prisma.subject.findMany({
      select: { id: true, code: true },
    });

    const studentMap = new Map(allStudents.map((s) => [s.rollNumber.toUpperCase(), s.id]));
    const subjectMap = new Map(allSubjects.map((s) => [s.code.toUpperCase(), s.id]));

    let importedCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const pair of validPairs) {
        const studentId = studentMap.get(pair.rollNumber);
        const subjectId = subjectMap.get(pair.subjectCode);

        if (!studentId) {
          errors.push(`Roll number '${pair.rollNumber}' not found in AMS database.`);
          skippedCount++;
          continue;
        }

        if (!subjectId) {
          errors.push(`Subject code '${pair.subjectCode}' not found in AMS database.`);
          skippedCount++;
          continue;
        }

        // Check if already enrolled
        const existing = await tx.enrollment.findUnique({
          where: {
            studentId_subjectId: { studentId, subjectId },
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        await tx.enrollment.create({
          data: { studentId, subjectId },
        });
        importedCount++;
      }
    });

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      errors,
    });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Enrollment import failed' }, { status });
  }
}

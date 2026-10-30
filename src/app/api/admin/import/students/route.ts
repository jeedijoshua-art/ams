import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { executeStudentBulkImport, MAX_FILE_SIZE_BYTES } from '@/lib/student-import';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    let csvText = '';
    let filename = 'student-roster.csv';
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      csvText = body.csvText || '';
      if (body.filename) filename = String(body.filename).slice(0, 100);
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (file) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'File exceeds maximum allowed size of 5 MB.' },
            { status: 400 }
          );
        }
        filename = file.name ? file.name.slice(0, 100) : filename;
        csvText = await file.text();
      }
    } else {
      csvText = await request.text();
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: 'CSV data is required.' }, { status: 400 });
    }

    const result = await executeStudentBulkImport(admin.id, csvText, filename);

    return NextResponse.json({
      success: true,
      importedCount: result.createdCount,
      skippedCount: result.skippedCount,
      rejectedCount: result.rejectedCount,
      errors: result.errors,
      batchId: result.batchId,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    const isUnauthorized = error.message?.includes('UNAUTHORIZED');
    const status = isForbidden ? 403 : isUnauthorized ? 401 : 500;
    return NextResponse.json({ error: error.message || 'CSV Import failed' }, { status });
  }
}

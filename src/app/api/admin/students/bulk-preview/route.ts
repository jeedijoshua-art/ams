import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { previewStudentCsv, MAX_FILE_SIZE_BYTES } from '@/lib/student-import';

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
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File exceeds maximum allowed size of 5 MB.` },
          { status: 400 }
        );
      }
      csvText = await file.text();
    } else {
      csvText = await request.text();
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'CSV data is required.' }, { status: 400 });
    }

    const preview = await previewStudentCsv(csvText);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    const isUnauthorized = error.message?.includes('UNAUTHORIZED');
    const status = isForbidden ? 403 : isUnauthorized ? 401 : 400;

    return NextResponse.json(
      { error: error.message || 'Failed to preview CSV' },
      { status }
    );
  }
}

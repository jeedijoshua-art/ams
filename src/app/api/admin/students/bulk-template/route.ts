import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { generateStudentRegistrationTemplateCsv } from '@/lib/csv';

export async function GET() {
  try {
    await requireAdmin();

    const csvContent = generateStudentRegistrationTemplateCsv();

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ams_student_registration_template.csv"',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    const isUnauthorized = error.message?.includes('UNAUTHORIZED');
    const status = isForbidden ? 403 : isUnauthorized ? 401 : 500;

    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status }
    );
  }
}

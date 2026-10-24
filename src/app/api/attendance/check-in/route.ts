import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/auth';
import { MarkAttendanceSchema } from '@/lib/validators';
import { processAttendanceCheckIn } from '@/lib/qr';

export async function POST(request: Request) {
  try {
    const studentUser = await requireStudent();

    const body = await request.json();
    const validated = MarkAttendanceSchema.parse(body);

    const result = await processAttendanceCheckIn(
      studentUser.studentProfile.id,
      validated.sessionId,
      validated.token
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          errorReason: result.errorReason,
          record: result.record,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        record: result.record,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.message?.includes('UNAUTHORIZED')
      ? 401
      : error.name === 'ZodError'
      ? 400
      : 500;
    return NextResponse.json({ success: false, error: error.message || 'Check-in failed' }, { status });
  }
}

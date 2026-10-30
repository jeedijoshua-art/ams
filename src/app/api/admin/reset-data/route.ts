import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Role } from '@prisma/client';
import { executeSafeDatabaseReset, getApplicationDataCounts } from '@/lib/database-reset';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'FORBIDDEN: Admin access required.' }, { status: 403 });
    }

    const counts = await getApplicationDataCounts();
    return NextResponse.json({ success: true, counts });
  } catch (err: any) {
    if (err?.message?.includes('UNAUTHORIZED') || err?.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'UNAUTHORIZED: Please sign in as administrator.' }, { status: 401 });
    }
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'FORBIDDEN: Admin access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { password, confirmationText } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Administrator password is required for security verification.' },
        { status: 400 }
      );
    }

    if (!confirmationText || typeof confirmationText !== 'string') {
      return NextResponse.json(
        { error: 'Confirmation phrase "RESET AMS DATA" is required.' },
        { status: 400 }
      );
    }

    const result = await executeSafeDatabaseReset(
      user,
      password,
      confirmationText.trim()
    );

    if (!result.success) {
      const isConflict = result.error?.includes('in progress');
      const isAuthFail = result.error?.includes('Invalid administrator password');
      const isBadPhrase = result.error?.includes('Invalid confirmation phrase');

      const status = isConflict ? 409 : isAuthFail ? 401 : isBadPhrase ? 400 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.message?.includes('UNAUTHORIZED') || err?.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'UNAUTHORIZED: Please sign in as administrator.' }, { status: 401 });
    }
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

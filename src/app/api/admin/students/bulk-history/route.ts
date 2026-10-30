import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await requireAdmin();

    const batches = await prisma.studentImportBatch.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      batches,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    const isUnauthorized = error.message?.includes('UNAUTHORIZED');
    const status = isForbidden ? 403 : isUnauthorized ? 401 : 500;

    return NextResponse.json(
      { error: error.message || 'Failed to fetch import history' },
      { status }
    );
  }
}

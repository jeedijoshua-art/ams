import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { EnrollmentRequestStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const where: any = {};

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as EnrollmentRequestStatus;
    }

    if (search) {
      where.OR = [
        { student: { rollNumber: { contains: search, mode: 'insensitive' } } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { subject: { code: { contains: search, mode: 'insensitive' } } },
        { subject: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [requests, pendingCount, totalCount] = await Promise.all([
      prisma.enrollmentRequest.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              rollNumber: true,
              name: true,
              department: true,
              academicYear: true,
              classSection: true,
              user: { select: { email: true } },
            },
          },
          subject: {
            select: {
              id: true,
              code: true,
              name: true,
              faculty: {
                select: {
                  name: true,
                  department: true,
                },
              },
            },
          },
          reviewedBy: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.enrollmentRequest.count({
        where: { status: EnrollmentRequestStatus.PENDING },
      }),
      prisma.enrollmentRequest.count(),
    ]);

    return NextResponse.json({
      requests,
      pendingCount,
      totalCount,
    });
  } catch (error: any) {
    const status = error.message?.includes('UNAUTHORIZED')
      ? 401
      : error.message?.includes('FORBIDDEN')
      ? 403
      : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to fetch enrollment requests' },
      { status }
    );
  }
}

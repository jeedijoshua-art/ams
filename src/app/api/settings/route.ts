import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, getCurrentUser } from '@/lib/auth';
import { UpdateThresholdSchema } from '@/lib/validators';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      threshold: parseFloat(settingsMap['attendance_threshold'] || '75'),
      term: settingsMap['academic_term'] || 'ODD SEM 2026',
      institution: settingsMap['institution_name'] || 'Karunya Institute of Technology and Sciences',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = UpdateThresholdSchema.parse(body);

    const updated = await prisma.systemSetting.upsert({
      where: { key: 'attendance_threshold' },
      update: { value: String(validated.threshold) },
      create: {
        key: 'attendance_threshold',
        value: String(validated.threshold),
        description: 'Attendance percentage threshold',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Threshold updated successfully',
      threshold: parseFloat(updated.value),
    });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN')
      ? 403
      : error.name === 'ZodError'
      ? 400
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

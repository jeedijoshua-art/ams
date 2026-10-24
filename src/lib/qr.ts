import crypto from 'crypto';
import QRCode from 'qrcode';
import prisma from './prisma';
import { AttendanceStatus, SessionStatus } from '@prisma/client';

export interface CheckInResult {
  success: boolean;
  message: string;
  record?: {
    id: string;
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    markedAt: Date;
    subjectName?: string;
  };
  errorReason?:
    | 'UNAUTHORIZED'
    | 'NOT_ENROLLED'
    | 'SESSION_NOT_FOUND'
    | 'SESSION_NOT_OPEN'
    | 'INVALID_TOKEN'
    | 'TOKEN_EXPIRED'
    | 'ALREADY_MARKED'
    | 'SERVER_ERROR';
}

/**
 * Generate a cryptographically secure random QR token.
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * Hash token using SHA-256 for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generate a Data URL QR Code image from a string payload.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

/**
 * Validates check-in attempt and safely marks attendance.
 */
export async function processAttendanceCheckIn(
  studentProfileId: string,
  sessionId: string,
  rawToken: string
): Promise<CheckInResult> {
  try {
    // 1. Fetch session and its subject
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: true,
      },
    });

    if (!session) {
      return {
        success: false,
        message: 'Attendance session not found.',
        errorReason: 'SESSION_NOT_FOUND',
      };
    }

    // 2. Validate session is currently OPEN
    if (session.status !== SessionStatus.OPEN) {
      return {
        success: false,
        message: `This attendance session is currently ${session.status.toLowerCase()}. Check-ins are closed.`,
        errorReason: 'SESSION_NOT_OPEN',
      };
    }

    // 3. Verify student enrollment in the subject
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: studentProfileId,
          subjectId: session.subjectId,
        },
      },
    });

    if (!enrollment) {
      return {
        success: false,
        message: `You are not enrolled in ${session.subject.code} (${session.subject.name}). Check-in rejected.`,
        errorReason: 'NOT_ENROLLED',
      };
    }

    // 4. Verify QR Token
    if (!session.qrTokenHash) {
      return {
        success: false,
        message: 'This session does not have an active QR token.',
        errorReason: 'INVALID_TOKEN',
      };
    }

    const hashedInput = hashToken(rawToken);
    if (hashedInput !== session.qrTokenHash) {
      return {
        success: false,
        message: 'Invalid QR token. The code you scanned is incorrect or expired.',
        errorReason: 'INVALID_TOKEN',
      };
    }

    // 5. Verify Token Expiration
    if (session.qrExpiresAt && new Date() > session.qrExpiresAt) {
      return {
        success: false,
        message: 'The QR code has expired. Please ask your faculty to refresh the code.',
        errorReason: 'TOKEN_EXPIRED',
      };
    }

    // 6. Check for duplicate attendance
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: studentProfileId,
        },
      },
    });

    if (existingRecord) {
      return {
        success: false,
        message: `Attendance has already been recorded for this session at ${existingRecord.markedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
        errorReason: 'ALREADY_MARKED',
        record: existingRecord,
      };
    }

    // 7. Atomic creation with database unique constraint protection
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: studentProfileId,
        status: AttendanceStatus.PRESENT,
        markedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Attendance marked successfully for ${session.subject.code}: ${session.subject.name}!`,
      record: {
        ...record,
        subjectName: session.subject.name,
      },
    };
  } catch (error: any) {
    // Catch unique constraint violation in case of concurrent requests
    if (error.code === 'P2002') {
      return {
        success: false,
        message: 'Duplicate submission: Attendance already recorded.',
        errorReason: 'ALREADY_MARKED',
      };
    }
    console.error('Error processing attendance check-in:', error);
    return {
      success: false,
      message: 'A server error occurred while marking attendance.',
      errorReason: 'SERVER_ERROR',
    };
  }
}

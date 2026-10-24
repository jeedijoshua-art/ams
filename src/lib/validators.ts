import { z } from 'zod';
import { Role, SessionStatus, AttendanceStatus } from '@prisma/client';

export const CreateStudentSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  rollNumber: z.string().min(3, 'Roll number is required').toUpperCase(),
  department: z.string().min(2, 'Department is required'),
  academicYear: z.string().min(2, 'Academic year is required'),
});

export const CreateFacultySchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  employeeId: z.string().min(3, 'Employee ID is required').toUpperCase(),
  department: z.string().min(2, 'Department is required'),
});

export const CreateSubjectSchema = z.object({
  code: z.string().min(2, 'Subject code is required').toUpperCase(),
  name: z.string().min(2, 'Subject name is required'),
  facultyId: z.string().uuid('Invalid faculty ID'),
});

export const EnrollStudentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
});

export const CreateSessionSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  durationMinutes: z.number().int().min(1).max(240).default(50),
  qrExpiryMinutes: z.number().int().min(1).max(30).default(2),
});

export const MarkAttendanceSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  token: z.string().min(1, 'QR token is required'),
});

export const UpdateThresholdSchema = z.object({
  threshold: z.number().min(1).max(100),
});

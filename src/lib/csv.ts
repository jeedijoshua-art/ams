/**
 * Utility to convert an array of objects into RFC 4180 compliant CSV string.
 */
export function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escapeCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const bodyRows = rows.map((row) => row.map(escapeCell).join(',')).join('\n');

  return `${headerRow}\n${bodyRows}`;
}

export interface AttendanceCsvRow {
  rollNumber: string;
  studentName: string;
  department: string;
  subjectCode: string;
  subjectName: string;
  status: string;
  sessionDate: string;
  markedTime: string;
}

export function formatSessionAttendanceCsv(
  subjectCode: string,
  subjectName: string,
  records: Array<{
    rollNumber: string;
    studentName: string;
    department: string;
    status: string;
    markedAt: Date | null;
    sessionDate: Date;
  }>
): string {
  const headers = [
    'Roll Number',
    'Student Name',
    'Department',
    'Subject Code',
    'Subject Name',
    'Session Date',
    'Attendance Status',
    'Marked Time (IST)',
  ];

  const rows = records.map((r) => [
    r.rollNumber,
    r.studentName,
    r.department,
    subjectCode,
    subjectName,
    r.sessionDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
    r.status,
    r.markedAt
      ? r.markedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
      : 'N/A',
  ]);

  return generateCsv(headers, rows);
}

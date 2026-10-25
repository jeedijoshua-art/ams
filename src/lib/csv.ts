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

/**
 * Parses an RFC 4180 CSV string into headers and key-value row objects.
 * Handles quoted fields containing commas and escaped quotes.
 */
export function parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const cleaned = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = lines[0].map((h) => h.replace(/^\uFEFF/, '').trim()); // Strip BOM
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const headerMap: Record<number, string> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[idx] = h;
  });

  const rows: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      const headerKey = rawHeaders[c];
      rowObj[headerKey] = line[c] !== undefined ? line[c].trim() : '';
    }
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
}

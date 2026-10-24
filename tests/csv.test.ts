import { describe, it, expect } from 'vitest';
import { generateCsv, formatSessionAttendanceCsv } from '@/lib/csv';

describe('RFC 4180 CSV Generator', () => {
  it('formats standard rows and escapes cells with commas and quotes', () => {
    const headers = ['Name', 'Department', 'Notes'];
    const rows = [
      ['Joshua J', 'CSE', 'Regular'],
      ['Priya, S', 'CSE', 'Excellent "A+" standing'],
      ['Line\nBreak', 'IT', 'Normal'],
    ];

    const csv = generateCsv(headers, rows);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Name,Department,Notes');
    expect(lines[1]).toBe('Joshua J,CSE,Regular');
    // Escaped comma
    expect(lines[2]).toBe('"Priya, S",CSE,"Excellent ""A+"" standing"');
    // Escaped newline
    expect(csv).toContain('"Line\nBreak"');
  });

  it('formats session attendance CSV with appropriate columns and date representation', () => {
    const records = [
      {
        rollNumber: 'URK25CS1140',
        studentName: 'Joshua J',
        department: 'CSE',
        status: 'PRESENT',
        markedAt: new Date('2026-10-24T10:05:00Z'),
        sessionDate: new Date('2026-10-24T10:00:00Z'),
      },
      {
        rollNumber: 'URK25CS1103',
        studentName: 'Sneha Reddy',
        department: 'CSE',
        status: 'ABSENT',
        markedAt: null,
        sessionDate: new Date('2026-10-24T10:00:00Z'),
      },
    ];

    const csv = formatSessionAttendanceCsv('CS2041', 'Software Engineering', records);

    expect(csv).toContain('Roll Number,Student Name,Department,Subject Code,Subject Name,Session Date,Attendance Status,Marked Time (IST)');
    expect(csv).toContain('URK25CS1140,Joshua J,CSE,CS2041,Software Engineering');
    expect(csv).toContain('PRESENT');
    expect(csv).toContain('ABSENT');
    expect(csv).toContain('N/A');
  });
});

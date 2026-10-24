import { describe, it, expect } from 'vitest';
import {
  calculateAttendancePercentage,
  calculateClassesNeeded,
} from '@/lib/attendance';

describe('Attendance Calculation Engine', () => {
  it('calculates correct percentage for standard inputs', () => {
    // 9 out of 10 attended
    expect(calculateAttendancePercentage(9, 10)).toBe(90.0);
    // 7 out of 8 attended
    expect(calculateAttendancePercentage(7, 8)).toBe(87.5);
    // 7 out of 10 attended
    expect(calculateAttendancePercentage(7, 10)).toBe(70.0);
    // 5 out of 10 attended
    expect(calculateAttendancePercentage(5, 10)).toBe(50.0);
    // 0 out of 5 attended
    expect(calculateAttendancePercentage(0, 5)).toBe(0.0);
  });

  it('handles division by zero safely when 0 sessions were conducted', () => {
    expect(calculateAttendancePercentage(0, 0)).toBe(100.0);
    expect(calculateAttendancePercentage(5, -1)).toBe(100.0);
  });

  it('calculates classes needed to reach 75% threshold', () => {
    // Already at or above 75%: 8 out of 10 is 80% -> needs 0
    expect(calculateClassesNeeded(8, 10, 75)).toBe(0);
    expect(calculateClassesNeeded(75, 100, 75)).toBe(0);

    // Below 75%: 7 out of 10 is 70%
    // Formula: ceil((0.75 * 10 - 7) / (1 - 0.75)) = ceil(0.5 / 0.25) = 2
    // Check: (7 + 2) / (10 + 2) = 9 / 12 = 75% -> Exact match!
    expect(calculateClassesNeeded(7, 10, 75)).toBe(2);

    // Critical low: 5 out of 10 is 50%
    // ceil((0.75 * 10 - 5) / 0.25) = ceil(2.5 / 0.25) = 10
    // Check: (5 + 10) / (10 + 10) = 15 / 20 = 75% -> Exact match!
    expect(calculateClassesNeeded(5, 10, 75)).toBe(10);
  });

  it('handles zero conducted classes in calculator safely', () => {
    expect(calculateClassesNeeded(0, 0, 75)).toBe(0);
  });
});

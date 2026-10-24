# Software Test Plan & Verification Report
## AMS — Smart Attendance Management System
**Execution Date:** ODD Semester 2026  
**Test Framework:** Vitest 5.0.5 + Next.js Test Runtime  
**Target Environment:** Local PostgreSQL 16 & Neon DB  
**Overall Status:** PASSED (17/17 Automated Tests Passing • 100% Success Rate)

---

## 1. Test Suite Summary

| Test Suite | Description | Total Tests | Passed | Failed |
|---|---|:---:|:---:|:---:|
| `tests/attendance.test.ts` | Percentage calculations & threshold target shortfall formula | 4 | 4 | 0 |
| `tests/qr_security.test.ts` | QR crypto, check-in validation, expiration, and concurrency | 8 | 8 | 0 |
| `tests/authorization.test.ts`| Role separation, subject ownership, and DB uniqueness | 3 | 3 | 0 |
| `tests/csv.test.ts` | RFC 4180 CSV generation, cell escaping, and formatting | 2 | 2 | 0 |
| **Total** | **Full Automated Test Coverage** | **17** | **17** | **0** |

---

## 2. Detailed Test Cases and Results

### 2.1 Attendance Calculation Engine (`tests/attendance.test.ts`)

| Test ID | Test Description | Expected Result | Actual Result | Status |
|---|---|---|---|:---:|
| **TC-ATT-01** | Standard percentage calculation | $9/10 = 90.0\%$, $7/8 = 87.5\%$, $7/10 = 70.0\%$ | Exact numerical values verified to 1 decimal place | **PASSED** |
| **TC-ATT-02** | Zero conducted sessions safety | Returns $100.0\%$ by convention; no division by zero error | Returns $100.0\%$ | **PASSED** |
| **TC-ATT-03** | Target calculator for compliant student | Student at $80\%$ needs 0 upcoming classes to meet $75\%$ | Returns $0$ | **PASSED** |
| **TC-ATT-04** | Target calculator for deficient student | Student at $7/10$ ($70\%$) needs $\lceil(0.75 \times 10 - 7)/0.25\rceil = 2$ consecutive classes | Returns $2$; verified $(7+2)/(10+2) = 75\%$ | **PASSED** |

### 2.2 QR Security & Concurrency Lifecycle (`tests/qr_security.test.ts`)

| Test ID | Test Description | Expected Result | Actual Result | Status |
|---|---|---|---|:---:|
| **TC-SEC-01** | Cryptographic token entropy | Generates distinct $\ge 32$-char base64url tokens with identical SHA-256 digests | Tokens unique, SHA-256 hashes 64 hex chars | **PASSED** |
| **TC-SEC-02** | Valid check-in for enrolled student | HTTP 200, record created with status `PRESENT` and timestamp | Attendance marked and verified in DB | **PASSED** |
| **TC-SEC-03** | Duplicate check-in rejection | Second attempt rejected with `ALREADY_MARKED` | Rejected with informative timestamp message | **PASSED** |
| **TC-SEC-04** | Concurrent duplicate race condition | 5 simultaneous requests from same student; only 1 succeeds | Exactly 1 success, 4 rejected by DB unique constraint | **PASSED** |
| **TC-SEC-05** | Expired QR token rejection | Check-in with token past `qrExpiresAt` rejected | Rejected with `TOKEN_EXPIRED` | **PASSED** |
| **TC-SEC-06** | Concluded session check-in | Check-in rejected when session status is `CLOSED` | Rejected with `SESSION_NOT_OPEN` | **PASSED** |
| **TC-SEC-07** | Unenrolled student rejection | Student not in course roster attempts check-in | Rejected with `NOT_ENROLLED` | **PASSED** |
| **TC-SEC-08** | Tampered QR token rejection | Check-in with incorrect or forged token string | Rejected with `INVALID_TOKEN` | **PASSED** |

### 2.3 Role Authorization & Constraints (`tests/authorization.test.ts`)

| Test ID | Test Description | Expected Result | Actual Result | Status |
|---|---|---|---|:---:|
| **TC-AUTH-01** | User identity separation | Admin has no student/faculty profile; student has linked roll number | Verified distinct relational models | **PASSED** |
| **TC-AUTH-02** | Subject faculty binding | All courses have an assigned faculty instructor | Verified non-null foreign key relation | **PASSED** |
| **TC-AUTH-03** | Enrollment uniqueness constraint | Creating duplicate enrollment for same student and course fails | Throws PostgreSQL unique constraint violation | **PASSED** |

### 2.4 RFC 4180 CSV Generator (`tests/csv.test.ts`)

| Test ID | Test Description | Expected Result | Actual Result | Status |
|---|---|---|---|:---:|
| **TC-CSV-01** | RFC 4180 escaping rules | Cells with commas and quotes wrapped in double quotes; newlines escaped | Verified exact string output | **PASSED** |
| **TC-CSV-02** | Session attendance sheet format | Contains headers: Roll Number, Name, Department, Code, Title, Date, Status, Time | Correct CSV format with IST timestamps | **PASSED** |

---

## 3. Automated Test Execution Transcript

```
 RUN  v5.0.5 /Users/jeedijoshua/Documents/2nd Year/ODD SEM/SE/MP

 ✓ tests/attendance.test.ts (4 tests) 2ms
 ✓ tests/csv.test.ts (2 tests) 11ms
 ✓ tests/authorization.test.ts (3 tests) 22ms
 ✓ tests/qr_security.test.ts (8 tests) 62ms

 Test Files  4 passed (4)
      Tests  17 passed (17)
   Start at  00:50:49
   Duration  148ms
```

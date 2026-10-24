# Academic Presentation & Live Demonstration Script
## AMS — Smart Attendance Management System
**Prepared for:** Software Engineering Course Viva & Demonstration  
**Student Presenter:** Joshua J (Roll: URK25CS1140)  
**Academic Year:** 2024–2028 (2nd Year, ODD Semester 2026)

---

## 1. 2-Minute Elevator Pitch (Opening Statement)

> *"Good morning, Professor. Today I am presenting **AMS — Smart Attendance Management System**, a full-stack, enterprise-grade attendance solution engineered with Next.js App Router, TypeScript, and PostgreSQL.*
>
> *Unlike conventional classroom attendance methods that suffer from signature forgery or static QR screenshot forwarding, our system uses **rolling cryptographic QR tokens** with 2-minute expirations and **relational unique constraints** that mathematically prevent duplicate check-ins at the database engine level.*
>
> *Most importantly, all metrics you see are derived in real-time from persisted SQL records rather than hardcoded dashboard numbers. The system calculates statutory attendance percentages and automatically computes the exact number of upcoming consecutive classes a student must attend to cross the 75% threshold."*

---

## 2. Live Demonstration Sequence

### Step 1: The Landing Page & Live System Metrics
1. Open `http://localhost:3000`.
2. Highlight the clean academic SaaS interface (obsidian navy with teal accents).
3. Point to the **Live System Metrics** banner (showing actual counts of Enrolled Students, Faculty Members, Accredited Courses, and Completed Sessions fetched directly from PostgreSQL).
4. Point to the **Instant Persona Switcher** dropdown in the top navbar:
   - *"To allow rigorous evaluation without tedious credential toggling, our application features an Instant Persona Switcher that securely establishes role-verified sessions for Administrators, Faculty, and Students."*

---

### Step 2: The Administrator Experience
1. Click **Demo Persona > Administrator** (or navigate to `/admin`).
2. Show the **Admin Dashboard**:
   - Institutional attendance average vs. the configured statutory threshold (default 75%).
   - Latest completed attendance sessions from all departments.
3. Navigate to **Students (`/admin/students`)**:
   - Demonstrate real-time searching by roll number (`URK25CS1140`) or student name.
   - Click **Enroll New Student** to show the validation modal.
4. Navigate to **Threshold & Settings (`/admin/settings`)**:
   - Demonstrate adjusting the institutional threshold (e.g., from 75% to 80%).
   - Explain how all student warning badges across the platform automatically adjust to this new benchmark.

---

### Step 3: The Faculty Workflow (Live QR Projection)
1. In the navbar persona switcher, switch to **Dr. R. Sundar Raj (Faculty)**.
2. Show the **Faculty Dashboard (`/faculty`)**:
   - Displays courses assigned to Dr. Sundar Raj (`CS2041: Software Engineering` and `CS2043: Algorithms`).
   - Notice that Faculty cannot see or alter courses taught by other professors (strict data isolation).
3. Click **Create QR Session (`/faculty/sessions/new`)**:
   - Select `CS2041 — Software Engineering`.
   - Duration: 50 minutes. QR Expiry: 2 minutes.
   - Click **Open Session & Display QR Code**.
4. Show the **Classroom Projection View (`/faculty/sessions/[id]`)**:
   - Point out the large high-contrast QR code generated from a 24-byte random entropy token.
   - Point out the **second-by-second countdown timer** showing the remaining validity.
   - Click **Refresh** to demonstrate rolling token rotation.
   - Highlight the real-time **Attendee Counter (3s polling)** showing present vs. absent students.

---

### Step 4: The Student Check-In & Threshold Calculator
1. Open a new window/tab and switch persona to **Joshua J (Roll: URK25CS1140)**.
2. Observe the **Student Academic Hub (`/student`)**:
   - A pulsing teal banner announces: *"Live Attendance Session Active Now for CS2041: Software Engineering!"*
3. Click **Mark Attendance Now** (or navigate to `/student/scan`).
4. Show the **Integrated Scanner**:
   - Supports live camera scanning via WebRTC.
   - Also provides a desktop token verification fallback for testing without a projector.
5. Submit the active session token:
   - Instant response: Confirmed **PRESENT** at the exact server timestamp!
6. Switch back to the Faculty projection tab:
   - Notice that Joshua J instantly appears in the **Live Present Roster** without a manual page refresh!
7. Try scanning the same QR code a second time as Joshua:
   - Demonstrate that the system **rejects the duplicate** with a clear explanation: *"Duplicate submission: Attendance has already been recorded for this session."*
8. Demonstrate the **Actionable Target Calculator**:
   - Switch persona to **Sneha Reddy (`URK25CS1103`)** who has a 50% attendance shortfall.
   - Show the red warning card: *"Attendance Shortfall Alert: You must attend the next 10 consecutive sessions to cross the 75% threshold."*

---

### Step 5: Official RFC 4180 CSV Export
1. Return to the Faculty portal and click **Conclude Session** to lock attendance.
2. Click **Export CSV Sheet** (or navigate to `/faculty/reports`).
3. Download the CSV file and open it to show the teacher:
   - Full student roster, Roll Number, Subject Code, Date, Present/Absent status, and precise IST timestamps.

---

## 3. Key Architectural Answers for Viva Questions

| Likely Viva Question | Engineering Response |
|---|---|
| *"How do you prevent students from forwarding a photo of the QR code to absent friends?"* | **Rolling Cryptographic Expiration:** QR tokens are generated with 24 bytes of cryptographically secure random entropy and expire in 2 minutes. Furthermore, the database stores only the SHA-256 hash. Once expired or refreshed by faculty, previous codes are immediately invalid. |
| *"What happens if two students submit check-in at the exact same millisecond?"* | **Database-Level Uniqueness:** We do not rely solely on application-level checks. PostgreSQL enforces a composite unique constraint `@@unique([sessionId, studentId])`. Concurrent race conditions are caught and handled by Postgres transaction isolation. |
| *"How is the attendance percentage calculated?"* | **Persisted Evaluation Only:** We strictly count closed, non-cancelled sessions where the student had an active enrollment record at that time. `PRESENT` and `LATE` count as attended; unrecorded sessions count as absent. Zero-session edge cases return 100% to avoid division by zero. |
| *"Is there automated test coverage?"* | **Yes, 17 automated unit and integration tests** implemented with Vitest covering the calculation engine, QR security, duplicate prevention, concurrent check-ins, and CSV formatting. |

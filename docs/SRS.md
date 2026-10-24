# Software Requirements Specification (SRS)
## AMS — Smart Attendance Management System
**Institution:** Karunya Institute of Technology and Sciences  
**Academic Term:** ODD Semester 2026  
**Document Version:** 1.0.0 (Production Release)

---

## 1. Problem Statement
Traditional academic attendance tracking methods in universities rely heavily on manual paper roll-calls or static optical scanning. These mechanisms introduce severe systemic inefficiencies:
1. **Instructional Time Wastage:** Manual roll-calls consume 10–15% of classroom lecture hours.
2. **Proxy Attendance Vulnerability:** Paper signature sheets and static QR codes printed on paper allow unauthorized proxy check-ins via photograph forwarding or forged signatures.
3. **Data Latency and Siloed Records:** Attendance data is manually entered into legacy ERPs days or weeks later, preventing students from taking early corrective action when falling below statutory thresholds (e.g., 75%).
4. **Audit and Compliance Deficits:** Accreditation bodies require verifiable, timestamped audit trails of student presence, which manual logs fail to provide.

---

## 2. Project Objectives
The Smart Attendance Management System (AMS) automates and secures academic attendance tracking through:
- **Expiring Cryptographic QR Tokens:** Rolling 2-minute high-entropy tokens to prevent screenshot sharing.
- **Relational Integrity Guarantees:** Server-enforced verification and composite database unique constraints `(sessionId, studentId)` preventing duplicate check-ins.
- **Real-Time Regulatory Calculations:** Dynamic calculation of attendance percentages strictly from closed sessions, coupled with an actionable target calculator informing students of the exact consecutive classes needed to maintain eligibility.
- **Enterprise Multi-Role Portal:** Tailored workflows for Administrators, Faculty Members, and Students with fine-grained access control.
- **RFC 4180 CSV Reports:** Instant export of official attendance sheets for institutional records.

---

## 3. Project Scope
The system encompasses:
- Web-based student, faculty, and administrative interfaces.
- Real-time QR projection for classroom displays.
- Integrated camera-based scanner and manual token verification fallback.
- Role-based telemetry dashboards and compliance analytics.
- Support for production Clerk authentication and local development authentication adapters.
- PostgreSQL database persistence via Prisma ORM with automated migrations.

*Out of Scope:* Hardware biometric turnstiles, GPS geofencing (which violates student privacy policies), and offline asynchronous mesh networks.

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization (FR-AUTH)
- **FR-AUTH-01:** The system shall authenticate users and associate each account with a single role: `ADMIN`, `FACULTY`, or `STUDENT`.
- **FR-AUTH-02:** Role-based access control (RBAC) must be enforced server-side on every API route and Server Action.
- **FR-AUTH-03:** Non-administrative users shall be prohibited from assigning or escalating privileges.

### 4.2 Administrator Workflows (FR-ADM)
- **FR-ADM-01:** Administrators shall be able to register, query, and search student profiles (`rollNumber`, `name`, `department`, `academicYear`).
- **FR-ADM-02:** Administrators shall manage faculty profiles (`employeeId`, `name`, `department`).
- **FR-ADM-03:** Administrators shall create courses (`code`, `name`) and designate authorized faculty instructors.
- **FR-ADM-04:** Administrators shall manage student course enrollments, preventing duplicate enrollment via database unique constraints.
- **FR-ADM-05:** Administrators shall configure the statutory attendance threshold (default 75%).

### 4.3 Faculty Workflows (FR-FAC)
- **FR-FAC-01:** Faculty members shall only view and manage courses assigned to their profile.
- **FR-FAC-02:** Faculty shall initiate attendance sessions with configurable class duration and QR expiration windows (default 2 minutes).
- **FR-FAC-03:** The system shall generate a cryptographically secure random token, store only its SHA-256 hash in the database, and display the QR code on a dedicated projection view.
- **FR-FAC-04:** Faculty shall be able to refresh the QR token at any time during an open session.
- **FR-FAC-05:** Faculty shall monitor real-time attendee check-ins via live polling and conclude the session when lecture concludes.
- **FR-FAC-06:** Faculty shall export session-specific or course-wide attendance sheets to RFC 4180 CSV format.

### 4.4 Student Workflows (FR-STU)
- **FR-STU-01:** Students shall view enrolled courses and real-time attendance percentages.
- **FR-STU-02:** Students shall scan the live classroom QR code using an integrated browser camera scanner or enter the token manually.
- **FR-STU-03:** The server shall validate enrollment, session status, token validity, expiration, and duplicate prevention before recording attendance.
- **FR-STU-04:** If aggregate attendance falls below the configured threshold, the system shall display high-risk warning alerts and compute the minimum upcoming consecutive sessions needed to regain compliance.
- **FR-STU-05:** Students shall access an immutable chronological history of all conducted classes and their attendance status.

---

## 5. Non-Functional Requirements

### 5.1 Security & Data Integrity (NFR-SEC)
- Cryptographic entropy for QR tokens (minimum 24 bytes).
- One-way hashing (SHA-256) of tokens prior to database persistence.
- Zero-trust server validation: browser input (user IDs, percentages) is never trusted.
- Database unique constraints to eliminate race conditions and double check-ins.

### 5.2 Performance & Responsiveness (NFR-PERF)
- Real-time polling latency under 300ms.
- Sub-second QR check-in response time.
- Production bundle optimization using Next.js App Router and Turbopack.

### 5.3 Reliability & Availability (NFR-REL)
- Repeatable synthetic database seeding for automated testing and demonstrations.
- Safe transactional execution for multi-table updates.
- 100% test pass rate across unit, integration, and security test suites.

### 5.4 Usability & Accessibility (NFR-UI)
- Academic SaaS dark navy and charcoal aesthetic with teal accenting.
- Full responsiveness across mobile, tablet, and desktop viewports.
- Clear status badges (`PRESENT` in emerald, `LATE` in amber, `ABSENT` in rose).

---

## 6. Assumptions and Constraints
- **Device Requirements:** Faculty requires a display or projector; students require a smartphone or laptop with a browser.
- **Network Connectivity:** Client devices must have network connectivity to communicate with the Next.js server.
- **Time Synchronization:** All session starts and expirations are coordinated in UTC internally and rendered in Asia/Kolkata (IST).

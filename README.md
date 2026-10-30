# AMS — Smart Attendance Management System
> **Autonomous, QR-Driven, Real-Time Academic Attendance Platform with Zero-Trust Security.**  
> Developed for Software Engineering Course (ODD Semester 2026), Karunya Institute of Technology and Sciences.

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=flat-square)](.)
[![Tests](https://img.shields.io/badge/Vitest-116%2F116%20Passed-emerald?style=flat-square)](.)
[![Type Safety](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue?style=flat-square)](.)
[![Database](https://img.shields.io/badge/PostgreSQL-16%20%7C%20Prisma%20ORM-indigo?style=flat-square)](.)
[![Next.js](https://img.shields.io/badge/Next.js-16.4%20App%20Router-black?style=flat-square)](.)

---

## 📖 Executive Summary
AMS is an enterprise-grade academic attendance portal that addresses the vulnerabilities of manual roll calls and static QR codes. It implements **cryptographic rolling QR tokens** with short-lived expiration windows (default 2 minutes), **relational unique constraints** that eliminate duplicate check-ins at the database level, and **persisted attendance analytics** that calculate accurate percentages and notify students of regulatory threshold shortfalls.

---

## 🚀 Key Features

### 👑 Administrator Portal
- **Telemetry Overview:** Aggregated counts of students, faculty, courses, conducted sessions, and institution-wide attendance compliance.
- **Student Directory:** Query, search, and register students with official roll numbers and departments.
- **Faculty Directory:** Maintain instructor profiles, employee identifiers, and course allocations.
- **Curriculum & Courses:** Create accredited subjects and designate authorized faculty instructors.
- **Enrollment Roster:** Manage student-to-subject enrollments with composite unique constraints preventing duplicate enrollments.
- **Regulatory Threshold Configuration:** Adjust global attendance benchmark (default 75%) with instant propagation across all student warning alerts.

### 👨‍🏫 Faculty Portal
- **Course Isolation:** Instructors can strictly only access courses assigned to them.
- **Session Creator:** Configurable session durations (30m, 50m, 90m, 120m) and QR expiry windows (1m, 2m, 5m, 10m).
- **Classroom Projection View:** Large high-contrast QR display generated from 24-byte random entropy with second-by-second countdown timers.
- **Dynamic Token Rotation:** Instant QR refresh capability during active lectures to invalidate previously displayed codes.
- **Live Real-Time Roster (3s Polling):** Monitors attendee check-in counts in real time alongside an absent student roster.
- **RFC 4180 CSV Export:** Instant download of session roll-call sheets with IST timestamps.

### 🎓 Student Portal
- **Academic Hub:** Real-time subject-wise attendance percentages computed strictly from closed sessions.
- **Target Shortfall Calculator:** Automatically computes the minimum number of consecutive upcoming sessions a student must attend to reach the 75% threshold.
- **Active Session Alerts:** Instant dashboard alerts when a class currently taking attendance is live for an enrolled subject.
- **Integrated Scanner:** WebRTC camera scanner with fallback manual token verification for devices without webcams.
- **Attendance Timeline:** Comprehensive audit history of every attended and missed session.

---

## 🛠️ Technology Stack
- **Frontend & Routing:** Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Icons & Graphics:** Lucide React, Framer Motion.
- **ORM & Database:** Prisma 6.19, PostgreSQL 16 (Local & Neon Cloud Database).
- **Input Validation:** Zod schemas.
- **QR Engine:** `qrcode` (SVG/DataURL generator), `html5-qrcode` (camera stream reader).
- **Authentication:** Auth.js (NextAuth v5) — Direct Google OAuth for Students; Admin-Provisioned Bcrypt Credentials for Faculty & Admin.
- **Testing:** Vitest 5.0.5 (27 automated unit, security, and integration tests).

---

## 📂 Project Directory Structure

```
MP/
├── docs/                      # Formal Software Engineering Documentation
│   ├── SRS.md                 # Software Requirements Specification
│   ├── ARCHITECTURE.md        # Architecture, Data Flow & Sequence Diagrams
│   ├── ER_DIAGRAM.md          # Database Entity-Relationship & Data Dictionary
│   ├── USE_CASES.md           # Actors, Use Cases & Detailed Workflows
│   ├── TEST_PLAN.md           # Verification Report & Test Matrices
│   ├── DEPLOYMENT.md          # Local Setup & Vercel Cloud Instructions
│   └── DEMO_SCRIPT.md         # Teacher Presentation & Viva Script
├── prisma/
│   ├── schema.prisma          # Prisma Schema with 7 Normalized Models
│   ├── seed.ts                # Repeatable Synthetic Seed Script
│   └── migrations/            # Tracked SQL Migrations
├── src/
│   ├── app/                   # App Router Pages & API Route Handlers
│   │   ├── bosshere/          # Admin Control Center, Directory & Settings
│   │   ├── faculty/           # Faculty Dashboard, Sessions & Reports
│   │   ├── student/           # Student Dashboard, Scanner & History
│   │   ├── api/               # Server-Side API Handlers with RBAC
│   │   └── page.tsx           # Landing Page
│   ├── components/            # Reusable UI Primitives (Navbar, Sidebar, Badges, StatCards)
│   └── lib/                   # Core Business Engines (auth, attendance, qr, csv, prisma)
├── tests/                     # Automated Vitest Test Suites
│   ├── attendance.test.ts     # Formula & Target Calculator Tests
│   ├── qr_security.test.ts    # QR Crypto, Expiration & Concurrency Tests
│   ├── authorization.test.ts  # Role Boundaries & DB Constraints Tests
│   └── csv.test.ts            # RFC 4180 CSV Formatting Tests
├── .env.example               # Environment Configuration Blueprint
├── package.json               # Package Manifest
├── vitest.config.ts           # Vitest Test Configuration
└── README.md                  # Root Project Documentation
```

---

## ⚡ Quick Start & Local Development

### 1. Prerequisites
- Node.js `v20.x` or `v24.x` (verified on Node `v24.14.1`)
- Local PostgreSQL 16 running on port 5432 (or a Neon cloud database URL)

### 2. Setup
```bash
# Clone or navigate to the MP directory
cd "SE/MP"

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run database migrations
npx prisma migrate dev --name init

# Initialize baseline system settings (non-destructive)
npm run seed

# Bootstrap the initial institutional administrator
npm run admin:bootstrap -- --email=admin@institution.edu
```

### 3. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

AMS includes an automated test suite verifying business logic, cryptographic token security, concurrency, duplicate rejection, and CSV formatting:

```bash
# Run automated Vitest test suite
npm test

# Run TypeScript compiler check
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Verify optimized production build
npm run build
```

---

## 👥 Institutional Access & Authentication Flows

| Role | Access URL | Authentication Method | Provisioning Workflow | Authorization Rule |
|---|---|---|---|---|
| 👑 **ADMIN** | `/bosshere/login` | Institutional Credentials | Provisioned via CLI `npm run admin:bootstrap` or env credentials | Full administrative control over courses, faculty, students, and settings. |
| 👨‍🏫 **FACULTY** | `/sign-in?role=faculty` | Admin-Provisioned Credentials | Created by Administrator via Admin Portal → Faculty Management | Restricted strictly to assigned subjects, sessions, and enrolled rosters. |
| 🎓 **STUDENT** | `/sign-in?role=student` | Google OAuth (Institutional) | Registered by Administrator individually or via Google Forms/Sheets Bulk CSV import | Google authenticated email must strictly match an active, pre-registered student record. |

---

## 🛡️ Security & Privacy Notice
- **No Physical Presence Claims:** As explicitly noted in software engineering documentation, optical QR verification proves possession of the verified token during the active session window. It does not replace physical identity verification.
- **Anti-Proxy Protection:** Rolling 2-minute expiration, single-use token hashes, and strict composite unique constraints prevent repeated submissions and screenshot relay attacks.

# AMS — Smart Attendance Management System
> **Autonomous, QR-Driven, Real-Time Academic Attendance Platform with Zero-Trust Security.**  
> Developed for Software Engineering Course (ODD Semester 2026), Karunya Institute of Technology and Sciences.

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=flat-square)](.)
[![Tests](https://img.shields.io/badge/Vitest-17%2F17%20Passed-emerald?style=flat-square)](.)
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
- **Authentication:** Dual-Mode (Clerk in production; Dev Persona Switcher in local dev).
- **Testing:** Vitest 5.0.5 (17 automated unit and integration tests).

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
│   │   ├── admin/             # Admin Dashboard, Directory & Settings
│   │   ├── faculty/           # Faculty Dashboard, Sessions & Reports
│   │   ├── student/           # Student Dashboard, Scanner & History
│   │   ├── api/               # Server-Side API Handlers with RBAC
│   │   ├── demo-login/        # Instant Role Switcher
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

# Seed synthetic test accounts and past attendance records
npm run seed
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

## 👥 Demo Personas & Credentials

The application includes an **Instant Persona Switcher** in the top navbar:

| Role | Persona Name | Identifier | Assigned Courses / Special Note |
|---|---|---|---|
| 👑 **ADMIN** | System Administrator | `admin@karunya.edu` | Full institutional controls |
| 👨‍🏫 **FACULTY** | Dr. R. Sundar Raj | `EMP-CS-101` | Teaches `CS2041` (SE) & `CS2043` (DAA) |
| 👩‍🏫 **FACULTY** | Prof. Anita Grace | `EMP-CS-102` | Teaches `CS2042` (DBMS) & `CS2044` (OS) |
| 🎓 **STUDENT** | Joshua J | `URK25CS1140` | 90% attendance in SE, 87.5% in DBMS |
| 🎓 **STUDENT** | Priya Sharma | `URK25CS1101` | 100% attendance benchmark |
| 🎓 **STUDENT** | Rahul Nair | `URK25CS1102` | 70% attendance (Warning state) |
| 🎓 **STUDENT** | Sneha Reddy | `URK25CS1103` | 50% attendance (Critical shortfall alert) |

---

## 🛡️ Security & Privacy Notice
- **No Physical Presence Claims:** As explicitly noted in software engineering documentation, optical QR verification proves possession of the verified token during the active session window. It does not replace physical identity verification.
- **Anti-Proxy Protection:** Rolling 2-minute expiration, single-use token hashes, and strict composite unique constraints prevent repeated submissions and screenshot relay attacks.

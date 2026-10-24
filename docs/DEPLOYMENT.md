# Deployment & Production Setup Guide
## AMS — Smart Attendance Management System

---

## 1. Local Development Environment

### 1.1 Prerequisites
- Node.js: `v20.x` or `v24.x` (verified on Node `v24.14.1` with npm `11.11.0`)
- PostgreSQL: `v15.x` or `v16.x` (or a cloud Neon PostgreSQL database)
- Git

### 1.2 Installation Steps
```bash
# Navigate to the project root
cd "SE/MP"

# Install project dependencies
npm install

# Verify environment variables
cp .env.example .env
```

### 1.3 Database Setup & Migrations
```bash
# Apply Prisma schema migrations to the local PostgreSQL database
npx prisma migrate dev --name init

# Seed realistic synthetic demo accounts and historical sessions
npm run seed
```

### 1.4 Launch Local Development Server
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

---

## 2. Environment Variables Configuration

Create `.env` using `.env.example` as a baseline:

```env
# ===================================================
# Database Connections (Neon PostgreSQL / Local DB)
# ===================================================
# For Neon in production:
# DATABASE_URL: Pooled connection string (with ?sslmode=require)
# DIRECT_URL: Direct unpooled connection string for migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ams_db"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/ams_db"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ===================================================
# Clerk Authentication (Optional locally, required in production)
# ===================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Application Settings
NEXT_PUBLIC_DEFAULT_ATTENDANCE_THRESHOLD="75"
```

---

## 3. Vercel Cloud Deployment

### 3.1 Provisioning Neon PostgreSQL
1. Create a free project at [Neon.tech](https://neon.tech).
2. Create a database named `ams_db`.
3. Obtain the **Pooled connection string** (for `DATABASE_URL`) and **Direct connection string** (for `DIRECT_URL`).

### 3.2 Setting Up Vercel
1. Push your Git repository to GitHub.
2. In the Vercel Dashboard, click **Add New > Project** and import the repository.
3. Configure **Root Directory** as `MP` (if deploying from a subfolder) or `./`.
4. In **Build and Output Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (if using Clerk)
   - `CLERK_SECRET_KEY` (if using Clerk)
   - `NEXT_PUBLIC_DEFAULT_ATTENDANCE_THRESHOLD` (75)

### 3.3 Production Database Migration
Run the production migration script from your terminal:
```bash
# Applies all committed migrations without resetting data
npx prisma migrate deploy

# Optionally seed production demo data
npx prisma db seed
```

### 3.4 Verification Checklist
- [x] Next.js production build (`npm run build`) compiles with zero errors.
- [x] TypeScript type checking (`npx tsc --noEmit`) passes with zero errors.
- [x] ESLint (`npm run lint`) passes with zero errors.
- [x] All 17 automated tests pass (`npm test`).
- [x] Database migrations are tracked in `prisma/migrations/`.
- [x] Secrets are excluded from `.gitignore`.

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "markedMethod" TEXT NOT NULL DEFAULT 'QR';

-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN     "classSection" TEXT DEFAULT 'CSE-A',
ADD COLUMN     "period" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "faculty_profiles" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "classSection" TEXT DEFAULT 'CSE-A',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "attendance_correction_audits" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "originalStatus" "AttendanceStatus" NOT NULL,
    "newStatus" "AttendanceStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_correction_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_correction_audits_recordId_idx" ON "attendance_correction_audits"("recordId");

-- CreateIndex
CREATE INDEX "attendance_correction_audits_changedById_idx" ON "attendance_correction_audits"("changedById");

-- AddForeignKey
ALTER TABLE "attendance_correction_audits" ADD CONSTRAINT "attendance_correction_audits_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_audits" ADD CONSTRAINT "attendance_correction_audits_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

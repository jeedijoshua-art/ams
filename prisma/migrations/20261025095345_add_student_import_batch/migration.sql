-- CreateTable
CREATE TABLE "student_import_batches" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "filename" TEXT,
    "totalRows" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_import_batches_adminId_idx" ON "student_import_batches"("adminId");

-- CreateIndex
CREATE INDEX "student_import_batches_createdAt_idx" ON "student_import_batches"("createdAt");

-- AddForeignKey
ALTER TABLE "student_import_batches" ADD CONSTRAINT "student_import_batches_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

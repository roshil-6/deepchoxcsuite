-- CreateTable
CREATE TABLE "venture_daily_reports" (
    "id" TEXT NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "reportDay" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT NOT NULL,
    "bodyMd" TEXT NOT NULL,
    "sourcesJson" JSONB,
    "followUpJson" JSONB,
    "pendingProposedUpdates" JSONB,
    "userApprovedAt" TIMESTAMP(3),
    "researchQuery" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venture_daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venture_daily_reports_ventureId_reportDay_idx" ON "venture_daily_reports"("ventureId", "reportDay");

-- CreateIndex
CREATE UNIQUE INDEX "venture_daily_reports_ventureId_reportDay_key" ON "venture_daily_reports"("ventureId", "reportDay");

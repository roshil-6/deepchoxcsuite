-- CreateTable
CREATE TABLE "venture_registry" (
    "id" TEXT NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "ventureName" TEXT,
    "contextSnapshot" TEXT NOT NULL,
    "sparseContext" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPulseAt" TIMESTAMP(3),
    "pulseStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venture_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dexo_pending_proposals" (
    "id" TEXT NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "summary" TEXT,
    "patchJson" JSONB NOT NULL,
    "conversationRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "dexo_pending_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dexo_patch_audit_log" (
    "id" TEXT NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "proposalId" TEXT,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "model" TEXT,
    "patchJson" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dexo_patch_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dexo_action_queue" (
    "id" TEXT NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "payloadJson" JSONB,
    "previewText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dexo_action_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venture_registry_ventureId_key" ON "venture_registry"("ventureId");

-- CreateIndex
CREATE INDEX "venture_registry_isActive_lastSeenAt_idx" ON "venture_registry"("isActive", "lastSeenAt");

-- CreateIndex
CREATE INDEX "dexo_pending_proposals_ventureId_status_createdAt_idx" ON "dexo_pending_proposals"("ventureId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "dexo_patch_audit_log_ventureId_createdAt_idx" ON "dexo_patch_audit_log"("ventureId", "createdAt");

-- CreateIndex
CREATE INDEX "dexo_patch_audit_log_proposalId_idx" ON "dexo_patch_audit_log"("proposalId");

-- CreateIndex
CREATE INDEX "dexo_action_queue_ventureId_status_createdAt_idx" ON "dexo_action_queue"("ventureId", "status", "createdAt");

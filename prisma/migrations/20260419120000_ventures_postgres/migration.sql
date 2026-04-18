-- CreateTable
CREATE TABLE "ventures" (
    "id" SERIAL NOT NULL,
    "sessionId" VARCHAR(80) NOT NULL,
    "name" TEXT NOT NULL,
    "dataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ventures_sessionId_updatedAt_idx" ON "ventures"("sessionId", "updatedAt");

-- CreateTable
CREATE TABLE "dexo_conversation_messages" (
    "id" TEXT NOT NULL,
    "ventureId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dexo_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dexo_conversation_messages_ventureId_seq_idx" ON "dexo_conversation_messages"("ventureId", "seq");

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "ventureId" INTEGER;

-- CreateIndex
CREATE INDEX "Enquiry_ventureId_idx" ON "Enquiry"("ventureId");

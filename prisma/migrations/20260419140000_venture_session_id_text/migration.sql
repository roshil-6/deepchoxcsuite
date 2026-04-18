-- sessionId was VARCHAR(80); long browser tokens / future auth subjects could exceed it and fail inserts.
ALTER TABLE "ventures" ALTER COLUMN "sessionId" SET DATA TYPE TEXT;

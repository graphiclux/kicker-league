ALTER TABLE "Outbox" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Outbox" ADD COLUMN "nextAttemptAt" TIMESTAMP(3);
ALTER TABLE "Outbox" ADD COLUMN "lastError" TEXT;
CREATE INDEX "Outbox_nextAttemptAt_idx" ON "Outbox"("nextAttemptAt");

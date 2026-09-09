CREATE TABLE "PlayerAvailability" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "teamCode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "source" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "raw" JSONB,
  CONSTRAINT "PlayerAvailability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlayerAvailability_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerAvailability_teamCode_fkey" FOREIGN KEY ("teamCode") REFERENCES "NflTeam"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PlayerAvailability_teamCode_observedAt_idx" ON "PlayerAvailability"("teamCode", "observedAt");
CREATE INDEX "PlayerAvailability_playerId_observedAt_idx" ON "PlayerAvailability"("playerId", "observedAt");

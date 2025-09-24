/*
  Warnings:

  - A unique constraint covering the columns `[leagueId,nflTeam]` on the table `LeagueTeam` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[leagueId,ownerId]` on the table `LeagueTeam` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LeagueTeam_leagueId_nflTeam_key" ON "public"."LeagueTeam"("leagueId", "nflTeam");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueTeam_leagueId_ownerId_key" ON "public"."LeagueTeam"("leagueId", "ownerId");

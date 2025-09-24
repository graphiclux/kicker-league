/*
  Warnings:

  - A unique constraint covering the columns `[season,week]` on the table `Week` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "public"."NflTeam" (
    "abbr" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "NflTeam_pkey" PRIMARY KEY ("abbr")
);

-- CreateIndex
CREATE UNIQUE INDEX "Week_season_week_key" ON "public"."Week"("season", "week");

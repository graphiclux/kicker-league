// scripts/seed-league-dummy.ts
//
// Usage examples:
//   npx tsx scripts/seed-league-dummy.ts --leagueId=cmfy6flix0002jj04x18svb69 --numTeams=8
//   npx tsx scripts/seed-league-dummy.ts --leagueId=cmfy6flix0002jj04x18svb69 --numTeams=32
//
// IMPORTANT:
// - numTeams = desired TOTAL teams in the league (not "add this many")
// - Script will "top up" the league from its current team count up to numTeams
// - Existing teams are left alone; we only create NEW owners/teams as needed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (arg) return arg.slice(prefix.length);
  return fallback;
}

async function main() {
  const leagueId =
    parseArg("leagueId") || "cmfy6flix0002jj04x18svb69"; // default to your league
  const numTeamsRaw = parseArg("numTeams", "8");
  const targetTeamCount = Number(numTeamsRaw);

  if (!leagueId) {
    console.error("❌ Missing --leagueId=<ID>");
    process.exit(1);
  }
  if (!Number.isFinite(targetTeamCount) || targetTeamCount <= 0) {
    console.error("❌ Invalid --numTeams (must be positive number)");
    process.exit(1);
  }

  console.log("Seeding dummy league data (top-up mode):");
  console.log("  League ID:", leagueId);
  console.log("  Target teams:", targetTeamCount);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: true,
    },
  });

  if (!league) {
    console.error("❌ League not found:", leagueId);
    process.exit(1);
  }

  const existingTeams = league.teams;
  const existingCount = existingTeams.length;

  console.log("  Existing teams:", existingCount);

  if (existingCount >= targetTeamCount) {
    console.log(
      `✅ League already has ${existingCount} teams, target was ${targetTeamCount}. Nothing to do.`
    );
    return;
  }

  const needed = targetTeamCount - existingCount;
  console.log(`  Need to create ${needed} additional team(s).`);

  // Load all NFL teams
  const nflTeams = await prisma.nflTeam.findMany();
  if (nflTeams.length === 0) {
    console.error(
      "❌ No rows in NflTeam table. Seed NflTeam first before running this."
    );
    process.exit(1);
  }

  // Filter out NFL teams already used in this league
  const usedAbbrs = new Set(existingTeams.map((t) => t.nflTeam));
  const availableTeams = nflTeams.filter((t) => !usedAbbrs.has(t.abbr));

  if (availableTeams.length < needed) {
    console.error(
      `❌ Not enough remaining NFL teams (${availableTeams.length}) to reach ${targetTeamCount} total teams.`
    );
    process.exit(1);
  }

  // Shuffle available teams
  const shuffled = [...availableTeams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, needed);

  console.log(
    "  Will create teams for NFL clubs:",
    selected.map((t) => t.abbr).join(", ")
  );

  for (let i = 0; i < needed; i++) {
    const team = selected[i];
    const dummyIndex = existingCount + i + 1;

    const email = `dummy${dummyIndex}@example.com`;
    const name = `Dummy Owner ${dummyIndex}`;
    const draftSlot = dummyIndex;

    console.log(
      `→ Creating/attaching user ${email} with team ${team.abbr} (slot ${draftSlot})`
    );

    // Upsert user; if they already exist for some reason, we only ensure
    // they're a member of this league and *don't* add another team for them.
    await prisma.user.upsert({
      where: { email },
      update: {
        name,
        leagues: {
          connect: { id: leagueId },
        },
        // DO NOT create a new team here on update; that could give them multiple.
      },
      create: {
        email,
        name,
        leagues: {
          connect: { id: leagueId },
        },
        teams: {
          create: {
            leagueId,
            nflTeam: team.abbr,
            draftSlot,
          },
        },
      },
    });

    // If we want to be absolutely certain a team exists for this user+league,
    // we can do an extra check & create if missing:
    const existingTeamForUser = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        owner: { email },
      },
    });

    if (!existingTeamForUser) {
      await prisma.leagueTeam.create({
        data: {
          leagueId,
          nflTeam: team.abbr,
          draftSlot,
          owner: { connect: { email } },
        },
      });
    }
  }

  console.log("\n✅ Dummy league users + teams created/updated successfully.");
  console.log(
    `League now has ${targetTeamCount} team(s) (was ${existingCount}).`
  );
  console.log("You can now hit the leaderboard endpoint like:");
  console.log(`  /api/leagues/${leagueId}/leaderboard?season=2025&week=1`);
  console.log("or visit:");
  console.log(`  /leagues/${leagueId}?season=2025&week=1`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

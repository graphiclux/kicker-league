import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const TEAMS: { abbr: string; name: string }[] = [
  { abbr: "ARI", name: "Arizona Cardinals" },
  { abbr: "ATL", name: "Atlanta Falcons" },
  { abbr: "BAL", name: "Baltimore Ravens" },
  { abbr: "BUF", name: "Buffalo Bills" },
  { abbr: "CAR", name: "Carolina Panthers" },
  { abbr: "CHI", name: "Chicago Bears" },
  { abbr: "CIN", name: "Cincinnati Bengals" },
  { abbr: "CLE", name: "Cleveland Browns" },
  { abbr: "DAL", name: "Dallas Cowboys" },
  { abbr: "DEN", name: "Denver Broncos" },
  { abbr: "DET", name: "Detroit Lions" },
  { abbr: "GB",  name: "Green Bay Packers" },
  { abbr: "HOU", name: "Houston Texans" },
  { abbr: "IND", name: "Indianapolis Colts" },
  { abbr: "JAX", name: "Jacksonville Jaguars" },
  { abbr: "KC",  name: "Kansas City Chiefs" },
  { abbr: "LAC", name: "Los Angeles Chargers" },
  { abbr: "LAR", name: "Los Angeles Rams" },
  { abbr: "LV",  name: "Las Vegas Raiders" },
  { abbr: "MIA", name: "Miami Dolphins" },
  { abbr: "MIN", name: "Minnesota Vikings" },
  { abbr: "NE",  name: "New England Patriots" },
  { abbr: "NO",  name: "New Orleans Saints" },
  { abbr: "NYG", name: "New York Giants" },
  { abbr: "NYJ", name: "New York Jets" },
  { abbr: "PHI", name: "Philadelphia Eagles" },
  { abbr: "PIT", name: "Pittsburgh Steelers" },
  { abbr: "SEA", name: "Seattle Seahawks" },
  { abbr: "SF",  name: "San Francisco 49ers" },
  { abbr: "TB",  name: "Tampa Bay Buccaneers" },
  { abbr: "TEN", name: "Tennessee Titans" },
  { abbr: "WAS", name: "Washington Commanders" },
];

function addDays(base: Date, days: number) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

async function seedTeams() {
  for (const t of TEAMS) {
    await db.nflTeam.upsert({
      where: { abbr: t.abbr },
      update: { name: t.name },
      create: { abbr: t.abbr, name: t.name },
    });
  }
  console.log(`Seeded ${TEAMS.length} NFL teams`);
}

async function seedWeeks(season: number) {
  // Use a placeholder “Week 1 starts Monday Sep 1, 2025” and each week = 7 days
  const week1Start = new Date("2025-09-01T00:00:00Z");
  for (let w = 1; w <= 18; w++) {
    const start = addDays(week1Start, (w - 1) * 7);
    const end = addDays(start, 6); // one week window
    await db.week.upsert({
      where: { season_week: { season, week: w } },
      update: { startsAt: start, endsAt: end },
      create: { season, week: w, startsAt: start, endsAt: end },
    });
  }
  console.log(`Seeded weeks 1-18 for ${season}`);
}

async function main() {
  const SEASON = 2025;
  await seedTeams();
  await seedWeeks(SEASON);
}

main()
  .then(async () => {
    await db.$disconnect();
    console.log("✅ Seed complete");
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const teams = [
  ['CAR', "Couldn't Get It Up", 'Ryan Fitzgerald'],
  ['WAS', 'Here for the Snacks', 'Drew Stevens'],
  ['DAL', 'The Fuzznuts', 'Brandon Aubrey'],
  ['IND', 'Bloody Wankers', 'Spencer Shrader'],
  ['GB', 'The Rick n Rollers', 'Trey Smack'],
  ['NO', 'Gold Dickers', 'Daniel Carlson'],
  ['MIA', 'Soups On!', 'Riley Patterson'],
  ['ARI', 'Miss Americana and the Heart Break Kicks', 'Chad Ryland'],
  ['ATL', 'Oh Hi Mark', 'Nick Folk / Jake Bailey'],
  ['PIT', 'The DeFEETed', 'Chris Boswell'],
  ['PHI', 'No Clue Sue', 'Jake Elliott'],
  ['BUF', 'Scrambled Legs', 'Tyler Bass'],
  ['LAR', 'The PATty Doinks', 'Harrison Mevis'],
  ['CHI', 'Turn down the Bass, Tyler', 'Cairo Santos'],
  ['NYG', 'Wide Right', 'Dominic Zvada'],
  ['KC', 'Dua Puka Nacua Lipa', 'Harrison Butker'],
  ['LV', 'Kiss My Harri-Butker', 'Matt Gay'],
  ['CLE', 'Bobby K', 'Andre Szmyt'],
  ['MIN', 'Punt Intended Problems', 'Will Reichard'],
  ['SF', 'Classy Til Kickoff', 'Eddy Pineiro'],
  ['SEA', 'The Franklin D Roosevelts', 'Jason Myers'],
  ['JAX', 'Swope There It Is', 'Cam Little'],
  ['TEN', 'Kick of Death', 'Joey Slye'],
  ['DET', 'Square Pizza Triangle Slices', 'Jake Bates'],
  ['DEN', 'Doink-a-Roos', 'Wil Lutz'],
  ['LAC', 'Same as Last Year', 'Cameron Dicker'],
  ['BAL', 'Happy Hookers', 'Tyler Loop'],
  ['NYJ', 'Tiny Facemasks', 'Jason Sanders'],
  ['NE', 'Met Life Crisis', 'Andres Borregales'],
  ['TB', 'TASK Force LEW', 'Chase McLaughlin'],
  ['HOU', 'Wisco Cheese Foot', "Ka'imi Fairbairn"],
  ['CIN', 'Doinkin Donuts', 'Evan McPherson'],
] as const;

async function main() {
  const admin = await db.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' } });
  const target = await db.league.findFirstOrThrow({
    where: { name: 'The Whole Field · 2026' },
    include: { teams: { include: { roster: true } } },
  });
  await db.$transaction(async (tx) => {
    for (const [teamCode, fantasyName, kicker] of teams) {
      const fantasyTeam = target.teams.find((team) => team.roster?.teamCode === teamCode);
      if (!fantasyTeam?.roster) throw new Error(`Missing roster for ${teamCode}`);
      const before = { name: fantasyTeam.name, teamCode, displayedKicker: fantasyTeam.roster.displayedKicker };
      const updatedTeam = await tx.fantasyTeam.update({ where: { id: fantasyTeam.id }, data: { name: fantasyName } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: 'OFFICIAL_LEAGUE_TEAM_CLEANUP',
          entityId: fantasyTeam.id,
          leagueId: target.id,
          reason: 'Aligned the 2026 league with the official And It’s No Good reference site',
          before,
          after: { name: updatedTeam.name, teamCode, referenceKicker: kicker, displayedKickerUnchanged: true },
        },
      });
    }
    await tx.league.update({ where: { id: target.id }, data: { name: "And It's No Good · 2026" } });
    await tx.league.updateMany({ where: { id: { not: target.id } }, data: { status: 'ARCHIVED' } });
    await tx.user.updateMany({
      where: {
        teams: { some: { leagueId: target.id } },
        OR: [{ email: { endsWith: '.local' } }, { email: { endsWith: '.test' } }, { email: { endsWith: '.invalid' } }],
      },
      data: { emailScoringEnabled: false, emailDraftEnabled: false, emailLeagueEnabled: false, emailSecurityEnabled: false },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'OFFICIAL_LEAGUE_CLEANUP',
        entityId: target.id,
        leagueId: target.id,
        reason: 'Kept one 32-team league, archived test leagues, and disabled email delivery for placeholder addresses',
        after: { leagueId: target.id, archivedOtherLeagues: true, teamCount: teams.length },
      },
    });
  });
  console.log(JSON.stringify({ leagueId: target.id, leagueName: "And It's No Good · 2026", teams: teams.length }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());

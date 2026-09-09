import { PrismaClient } from '@prisma/client';
import { passwordHash } from '../apps/api/src/auth';
import { selectPick } from '../apps/api/src/draft.service';
import { audit } from '../apps/api/src/db';
import { processImport } from '../apps/api/src/scoring.service';
import { CSVProvider, digest } from '../packages/core/src/providers';
const db = new PrismaClient();
const franchises = [
  ['ARI', 'Arizona', 'Cardinals', 'NFC', 'West'],
  ['ATL', 'Atlanta', 'Falcons', 'NFC', 'South'],
  ['BAL', 'Baltimore', 'Ravens', 'AFC', 'North'],
  ['BUF', 'Buffalo', 'Bills', 'AFC', 'East'],
  ['CAR', 'Carolina', 'Panthers', 'NFC', 'South'],
  ['CHI', 'Chicago', 'Bears', 'NFC', 'North'],
  ['CIN', 'Cincinnati', 'Bengals', 'AFC', 'North'],
  ['CLE', 'Cleveland', 'Browns', 'AFC', 'North'],
  ['DAL', 'Dallas', 'Cowboys', 'NFC', 'East'],
  ['DEN', 'Denver', 'Broncos', 'AFC', 'West'],
  ['DET', 'Detroit', 'Lions', 'NFC', 'North'],
  ['GB', 'Green Bay', 'Packers', 'NFC', 'North'],
  ['HOU', 'Houston', 'Texans', 'AFC', 'South'],
  ['IND', 'Indianapolis', 'Colts', 'AFC', 'South'],
  ['JAX', 'Jacksonville', 'Jaguars', 'AFC', 'South'],
  ['KC', 'Kansas City', 'Chiefs', 'AFC', 'West'],
  ['LAC', 'Los Angeles', 'Chargers', 'AFC', 'West'],
  ['LAR', 'Los Angeles', 'Rams', 'NFC', 'West'],
  ['LV', 'Las Vegas', 'Raiders', 'AFC', 'West'],
  ['MIA', 'Miami', 'Dolphins', 'AFC', 'East'],
  ['MIN', 'Minnesota', 'Vikings', 'NFC', 'North'],
  ['NE', 'New England', 'Patriots', 'AFC', 'East'],
  ['NO', 'New Orleans', 'Saints', 'NFC', 'South'],
  ['NYG', 'New York', 'Giants', 'NFC', 'East'],
  ['NYJ', 'New York', 'Jets', 'AFC', 'East'],
  ['PHI', 'Philadelphia', 'Eagles', 'NFC', 'East'],
  ['PIT', 'Pittsburgh', 'Steelers', 'AFC', 'North'],
  ['SEA', 'Seattle', 'Seahawks', 'NFC', 'West'],
  ['SF', 'San Francisco', '49ers', 'NFC', 'West'],
  ['TB', 'Tampa Bay', 'Buccaneers', 'NFC', 'South'],
  ['TEN', 'Tennessee', 'Titans', 'AFC', 'South'],
  ['WAS', 'Washington', 'Commanders', 'NFC', 'East'],
];
async function main() {
  for (const [code, city, name, conference, division] of franchises)
    await db.nflTeam.upsert({
      where: { code },
      create: { code, city, name, conference, division },
      update: {},
    });
  const rule = await db.scoringRule.upsert({
    where: { code: 'AING-2026-V1' },
    create: { code: 'AING-2026-V1' },
    update: {},
  });
  await db.season.upsert({
    where: { year: 2026 },
    create: { year: 2026, name: 'NFL 2026', ruleId: rule.id },
    update: {},
  });
  if (process.env.NODE_ENV === 'production') {
    console.log('Reference data seeded; no development accounts created.');
    return;
  }
  const ph = await passwordHash('NoGoodDemo2026!');
  const members = [
    ['admin@anditsnogood.local', 'Commissioner', 'SUPER_ADMIN'],
    ['alex@anditsnogood.local', 'Alex', 'USER'],
    ['jordan@anditsnogood.local', 'Jordan', 'USER'],
    ['sam@anditsnogood.local', 'Sam', 'USER'],
  ];
  const users = [];
  for (const [email, displayName, role] of members)
    users.push(
      await db.user.upsert({
        where: { email },
        create: { email, displayName, role, passwordHash: ph, verifiedAt: new Date() },
        update: {},
      }),
    );
  if (!(await db.league.findUnique({ where: { inviteCode: 'DEMO2026' } }))) {
    const league = await db.league.create({
      data: {
        name: 'The Shank Tank · Demo',
        season: 2026,
        maxTeams: 12,
        commissionerId: users[0].id,
        inviteCode: 'DEMO2026',
      },
    });
    const names = [
      'Uprights Anonymous',
      'Wide Right Club',
      'The Double Doinks',
      'Shank You Very Much',
    ];
    for (let i = 0; i < users.length; i++)
      await db.fantasyTeam.create({
        data: { leagueId: league.id, ownerId: users[i].id, name: names[i], draftOrder: i + 1 },
      });
    await db.league.update({ where: { id: league.id }, data: { status: 'DRAFTING' } });
    for (const code of ['BUF', 'DAL', 'KC', 'PHI'])
      await db.$transaction((tx) => selectPick(tx, league.id, null, code));
  }
  if (!(await db.league.findUnique({ where: { inviteCode: 'DRAFTDEMO' } }))) {
    const l = await db.league.create({
      data: {
        name: 'Fresh Misfortune · Demo Draft',
        season: 2026,
        maxTeams: 4,
        commissionerId: users[0].id,
        inviteCode: 'DRAFTDEMO',
      },
    });
    for (let i = 0; i < users.length; i++)
      await db.fantasyTeam.create({
        data: {
          leagueId: l.id,
          ownerId: users[i].id,
          name: [
            'Uprights Anonymous',
            'Wide Right Club',
            'The Double Doinks',
            'Shank You Very Much',
          ][i],
          draftOrder: i + 1,
        },
      });
  }
  const csv =
    'season,week,nfl_team,kicker,event_type,distance,result,event_id\n2026,1,BUF,Demo Buffalo starter,FIELD_GOAL,27,MISSED,demo-buf-1\n2026,1,BUF,Demo Buffalo backup,EXTRA_POINT,,MISSED,demo-buf-2\n2026,1,DAL,Demo Dallas kicker,FIELD_GOAL,58,MADE,demo-dal-1\n2026,1,KC,Demo Kansas City kicker,FIELD_GOAL,32,BLOCKED,demo-kc-1\n2026,1,PHI,Demo Philadelphia kicker,EXTRA_POINT,,BLOCKED,demo-phi-1';
  const existing = await db.statImport.findFirst({ where: { contentHash: digest(csv) } });
  if (existing?.status === 'FAILED') {
    await db.statImport.update({ where: { id: existing.id }, data: { status: 'QUEUED' } });
    await processImport(existing.id);
  }
  if (!existing) {
    const parsed = new CSVProvider('EVENT').normalize(csv);
    const batch = await db.statImport.create({
      data: {
        uploadedBy: users[0].id,
        filename: 'DEMO-fictional-week-1.csv',
        mode: 'EVENT',
        contentHash: digest(csv),
        reason: 'Development fixture. Fictional events, not actual NFL results.',
        status: 'QUEUED',
        rows: parsed as any,
        preview: { validRows: 5, errors: [], warnings: ['Fictional demo data'], totals: [] },
      },
    });
    await processImport(batch.id);
  }
  console.log(
    'Seed complete: 32 franchises, season 2026, four demo accounts, completed league and draft lobby. Password: NoGoodDemo2026!',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(process.exitCode || 0);
  });

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db, audit, outbox } from '../../apps/api/src/db';
import { passwordHash } from '../../apps/api/src/auth';
import { selectPick, shuffled } from '../../apps/api/src/draft.service';

async function main() {
  const email = process.env.FULL_FIELD_OWNER_EMAIL;
  if (!email) throw new Error('FULL_FIELD_OWNER_EMAIL is required');
  const owner = await db.user.findUniqueOrThrow({ where: { email } });
  const inviteCode = 'FULLFIELD2026';
  const botHash = await passwordHash(randomUUID());
  const id = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2026::integer, 320032::integer)`;
    const existing = await tx.league.findUnique({ where: { inviteCode } });
    if (existing) {
      assert.equal(existing.commissionerId, owner.id, 'Existing league belongs to another owner');
      return existing.id;
    }
    const franchises = await tx.nflTeam.findMany({ orderBy: { code: 'asc' } });
    assert.equal(franchises.length, 32);
    await tx.season.findUniqueOrThrow({ where: { year: 2026 } });
    const league = await tx.league.create({ data: {
      season: 2026, commissionerId: owner.id, name: 'The Whole Field · 2026',
      inviteCode, maxTeams: 32, status: 'LOBBY', currentPick: 1,
    } });
    const seats = [{ ownerId: owner.id, name: 'Seattle Misfortune', franchise: 'SEA' }];
    const remaining = shuffled(franchises.filter(f => f.code !== 'SEA'));
    for (let i = 0; i < 31; i++) {
      // Test opponents cannot sign in and will never receive email or push notifications.
      const bot = await tx.user.create({ data: {
        email: `full-field-2026-${i + 1}@example.invalid`, passwordHash: botHash,
        displayName: `Practice opponent ${i + 1}`, suspended: true, notificationsEnabled: false,
      } });
      seats.push({ ownerId: bot.id, name: `Practice Team ${String(i + 1).padStart(2, '0')}`, franchise: remaining[i].code });
    }
    const draft = shuffled(seats);
    for (let i = 0; i < draft.length; i++) await tx.fantasyTeam.create({ data: {
      leagueId: league.id, ownerId: draft[i].ownerId, name: draft[i].name, draftOrder: i + 1,
    } });
    await audit(tx, owner.id, 'LEAGUE_CREATED', league.id,
      'Requested 32-team 2026 practice league; Seattle reserved for owner; other franchises and draft order randomized',
      undefined, { season: 2026, teams: 32, reserved: 'SEA' }, league.id);
    await tx.league.update({ where: { id: league.id }, data: { status: 'DRAFTING' } });
    for (const seat of draft) {
      const roster = await selectPick(tx, league.id, null, seat.franchise);
      await audit(tx, owner.id, 'PRACTICE_DRAFT_ASSIGNMENT', roster.id,
        seat.ownerId === owner.id ? 'Seattle reserved for owner as requested' : 'Random selection for practice league',
        undefined, { teamCode: seat.franchise, pickNumber: roster.pickNumber }, league.id);
    }
    await outbox(tx, 'draft.updated', { leagueId: league.id });
    return league.id;
  }, { timeout: 120000 });
  const league = await db.league.findUniqueOrThrow({ where: { id }, include: { teams: { include: { roster: true } }, rosters: true } });
  assert.equal(league.status, 'COMPLETE');
  assert.equal(league.teams.length, 32);
  assert.equal(league.rosters.length, 32);
  assert.equal(new Set(league.rosters.map(r => r.teamCode)).size, 32);
  assert.equal(new Set(league.rosters.map(r => r.pickNumber)).size, 32);
  const mine = league.teams.find(t => t.ownerId === owner.id)!;
  assert.equal(mine.roster?.teamCode, 'SEA');
  console.log(JSON.stringify({ leagueId: id, league: league.name, season: league.season,
    status: league.status, teams: 32, owner: email, yourTeam: mine.name, franchise: mine.roster?.teamCode,
    draftPick: mine.roster?.pickNumber }));
}
void main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());

import { randomInt } from 'node:crypto';
import { db, Tx, audit, lockLeague, outbox, mailOutbox } from './db';
export function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export async function selectPick(tx: Tx, id: string, ownerId: string | null, teamCode?: string) {
  const league = await tx.league.findUniqueOrThrow({
    where: { id },
    include: { teams: { orderBy: { draftOrder: 'asc' }, include: { owner: true } }, rosters: true },
  });
  if (league.status !== 'DRAFTING') throw new Error('Draft is not running');
  const team = league.teams.find((t) => t.draftOrder === league.currentPick);
  if (!team) throw new Error('No current draft slot');
  if (ownerId && team.ownerId !== ownerId) throw new Error('It is not your turn');
  if (ownerId && league.deadline && league.deadline.getTime() <= Date.now())
    throw new Error('Pick deadline expired; automatic pick is pending');
  const all = await tx.nflTeam.findMany({ orderBy: { code: 'asc' } }),
    taken = new Set(league.rosters.map((r) => r.teamCode));
  if (!teamCode)
    teamCode = [...team.rankings, ...all.map((t) => t.code)].find((c) => !taken.has(c));
  if (!teamCode || taken.has(teamCode) || !all.some((t) => t.code === teamCode))
    throw new Error('Kicking position is unavailable');
  const assignment = await tx.playerAssignment.findFirst({
    where: { teamCode, endsAt: null, designation: 'PRIMARY_KICKER' },
    include: { player: true },
    orderBy: { startsAt: 'desc' },
  });
  const roster = await tx.roster.create({
    data: {
      leagueId: id,
      fantasyTeamId: team.id,
      teamCode,
      displayedKicker: assignment?.player.name,
      pickNumber: league.currentPick,
      source: ownerId ? 'MANUAL' : 'AUTODRAFT',
    },
  });
  const finished = league.currentPick === league.teams.length;
  await tx.league.update({
    where: { id },
    data: {
      currentPick: league.currentPick + 1,
      status: finished ? 'COMPLETE' : 'DRAFTING',
      deadline: finished ? null : new Date(Date.now() + league.pickSeconds * 1000),
    },
  });
  await audit(
    tx,
    ownerId || 'SYSTEM',
    'DRAFT_PICK',
    roster.id,
    ownerId
      ? 'Owner selected kicking position'
      : 'Clock expired; highest available ranking selected',
    undefined,
    roster,
    id,
  );
  await outbox(tx, 'draft.updated', { leagueId: id });
  await mailOutbox(tx, {
    to: team.owner.email,
    subject: `Pick confirmed: ${teamCode} is yours`,
    eyebrow: finished ? 'DRAFT COMPLETE' : 'PICK CONFIRMED',
    title: finished ? 'The picks are in.' : 'A questionable choice, officially recorded.',
    copy: `You own the ${teamCode} kicking position in ${league.name}. Every kicker and backup for that franchise counts automatically all season.`,
    url: `${process.env.WEB_URL}/`,
    button: 'Open the clubhouse',
  });
  if (finished) {
    const members = league.teams;
    for (const member of members) await mailOutbox(tx, {
      to: member.owner.email,
      subject: `${league.name}: the draft is complete`,
      eyebrow: 'DRAFT COMPLETE',
      title: 'No trades. No take-backs.',
      copy: `The ${league.name} draft is complete. Your franchise is locked for the season, including every backup kicker.`,
      url: `${process.env.WEB_URL}/`, button: 'See the final board',
    });
  }
  return roster;
}
export async function runDraftClocks() {
  const leagues = await db.league.findMany({
    where: { status: 'DRAFTING', deadline: { lte: new Date() } },
  });
  for (const league of leagues)
    await db
      .$transaction(async (tx) => {
        await lockLeague(tx, league.id);
        const current = await tx.league.findUniqueOrThrow({ where: { id: league.id } });
        if (current.status === 'DRAFTING' && current.deadline && current.deadline <= new Date())
          await selectPick(tx, league.id, null);
      })
      .catch((e) => console.error('Draft clock:', e.message));
}

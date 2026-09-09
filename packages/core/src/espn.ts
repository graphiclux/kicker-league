import { eventSchema } from './index';
import { ParsedImport } from './providers';

const aliases: Record<string, string> = { WSH: 'WAS', JAC: 'JAX', LA: 'LAR' };
const clean = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// ESPN's public website feed is undocumented. Reject incomplete/changed formats
// instead of publishing partial fantasy scores. XP can be embedded in a TD play.
export function normalizeEspn(summary: any, season: number, week: number): ParsedImport {
  const parsed: ParsedImport = { rows: [], scopes: [], errors: [], warnings: [] };
  if (summary.header?.season?.year !== season || summary.header?.season?.type !== 2) {
    parsed.errors.push('Only matching regular-season games are supported');
    return parsed;
  }
  const athletes: any[] = [];
  for (const group of summary.boxscore?.players || []) {
    const teamCode = aliases[group.team.abbreviation] || group.team.abbreviation;
    for (const stat of group.statistics || []) {
      if (stat.name !== 'kicking') continue;
      for (const entry of stat.athletes || []) athletes.push({
        ...entry.athlete, teamCode, stats: entry.stats, keys: stat.keys,
      });
    }
  }
  const drives = [...(summary.drives?.previous || []), ...(summary.drives?.current ? [summary.drives.current] : [])];
  const plays = new Map<string, any>();
  for (const drive of drives) for (const play of drive.plays || []) plays.set(play.id, play);
  for (const play of plays.values()) {
    let text = String(play.text || '').replace(/\(([A-Za-zÀ-ž.'’-]+) ([A-Za-zÀ-ž.'’-]+) Kick\)/g,
      (_: string, first: string, last: string) => `${first[0]}.${last} extra point is GOOD`);
    for (const a of athletes) if (a.displayName && a.firstName && a.lastName)
      text = text.split(a.displayName).join(`${a.firstName[0]}.${a.lastName}`);
    if (String(play.type?.id) === '59')
      text = text.replace(/(\d+\s+Yd Field Goal)$/i, '$1 is GOOD');
    if (/no play|nullified|overturned/i.test(text)) continue;
    const patterns = [
      { type: 'FIELD_GOAL', regex: /([A-Za-zÀ-ž.'’-]+)\s+(\d+)\s*(?:yard|yd)[ -]+field goal\s+(?:is\s+)?(NO GOOD|NOT GOOD|GOOD|BLOCKED|MISSED|FAILS|FAILED)/ig },
      { type: 'EXTRA_POINT', regex: /([A-Za-zÀ-ž.'’-]+)\s+extra point\s+(?:is\s+)?(NO GOOD|NOT GOOD|GOOD|BLOCKED|MISSED|FAILS|FAILED)/ig },
    ];
    let found = false;
    for (const pattern of patterns) for (const match of text.matchAll(pattern.regex)) {
      found = true;
      const candidates = athletes.filter(a => [a.displayName, `${a.firstName?.[0]}.${a.lastName}`, a.shortName].filter(Boolean).some(n => clean(n) === clean(match[1])));
      if (candidates.length !== 1) { parsed.errors.push(`Unresolved kicker in play ${play.id}: ${match[1]}`); continue; }
      const a = candidates[0];
      const resultText = match[pattern.type === 'FIELD_GOAL' ? 3 : 2].toUpperCase();
      const result = resultText === 'GOOD' ? 'MADE' : resultText === 'BLOCKED' ? 'BLOCKED' : 'MISSED';
      const event = eventSchema.safeParse({ season, week, teamCode: a.teamCode, kicker: a.displayName,
        eventType: pattern.type, result, distance: pattern.type === 'FIELD_GOAL' ? Number(match[2]) : null,
        gameId: `espn/${summary.header.id}`, providerEventId: `${summary.header.id}/${play.id}/${pattern.type}`,
        occurredAt: play.wallclock ? new Date(play.wallclock).toISOString() : null,
      });
      if (!event.success) { parsed.errors.push(`Invalid kick ${play.id}: ${event.error.message}`); continue; }
      parsed.rows.push({ row: parsed.rows.length + 1, event: event.data,
        raw: { text, espn_player_id: String(a.id), imageUrl: a.headshot?.href || '' } });
    }
    if (!found && /field goal|extra point/i.test(text) && !/no good.*two.point|two.point|extra point.*(?:aborted|not attempted)/i.test(text))
      parsed.errors.push(`Unrecognized kick description ${play.id}: ${text}`);
  }
  for (const a of athletes) {
    for (const [type, key] of [['FIELD_GOAL', 'fieldGoalsMade/fieldGoalAttempts'], ['EXTRA_POINT', 'extraPointsMade/extraPointAttempts']]) {
      const value = a.stats?.[a.keys?.indexOf(key)];
      if (!/^\d+\/\d+$/.test(value || '')) { parsed.errors.push(`Missing ${key} for ${a.displayName}`); continue; }
      const [made, attempts] = value.split('/').map(Number);
      const rows = parsed.rows.filter(r => r.raw.espn_player_id === String(a.id) && r.event.eventType === type);
      if (rows.length !== attempts || rows.filter(r => r.event.result === 'MADE').length !== made)
        parsed.errors.push(`Box score mismatch for ${a.displayName} ${type}: parsed ${rows.length}, expected ${attempts} attempts`);
    }
  }
  for (const r of parsed.rows) {
    if (!parsed.scopes.some(s => s.teamCode === r.event.teamCode))
      parsed.scopes.push({ season, week, teamCode: r.event.teamCode });
  }
  parsed.rows.sort((a, b) => a.event.providerEventId.localeCompare(b.event.providerEventId));
  return parsed;
}

export function shouldFetchEspnGame(event: any, now = Date.now()): boolean {
  const age = now - Date.parse(event.date);
  return event.status?.type?.state === 'in' || (age >= 0 && age <= 48 * 60 * 60_000 && ['pre', 'post'].includes(event.status?.type?.state));
}

export async function fetchEspn(path: string): Promise<any> {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/${path}`, {
    signal: AbortSignal.timeout(30_000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > 10_000_000) throw new Error('ESPN response exceeds size limit');
  return JSON.parse(body);
}

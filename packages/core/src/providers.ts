import { parse } from 'csv-parse/sync';
import { createHash } from 'node:crypto';
import { eventSchema, NormalizedEvent, TEAM_CODES } from './index';
export type ImportRow = { row: number; raw: Record<string, string>; event: NormalizedEvent };
export type ParsedImport = {
  rows: ImportRow[];
  errors: string[];
  warnings: string[];
  scopes: { season: number; week: number; teamCode: string }[];
};
export interface NflDataProvider {
  normalize(input: string): ParsedImport;
}
// An import without stable event IDs replaces the entire supplied team/week scope.
// Stable IDs allow incremental event corrections without duplicating scoring.
export class CSVProvider implements NflDataProvider {
  constructor(private mode: 'EVENT' | 'SUMMARY') {}
  normalize(input: string): ParsedImport {
    const rows: ImportRow[] = [],
      errors: string[] = [],
      warnings: string[] = [],
      scopes: ParsedImport['scopes'] = [];
    let data: Record<string, string>[];
    try {
      data = parse(input, {
        columns: (headers: string[]) => {
          if (new Set(headers).size !== headers.length) throw new Error('Duplicate column names');
          return headers;
        },
        bom: true,
        skip_empty_lines: true,
        trim: true,
        max_record_size: 20000,
      });
    } catch (e) {
      return { rows, errors: [`Invalid CSV: ${(e as Error).message}`], warnings, scopes };
    }
    if (!data.length || data.length > 5000)
      return { rows, errors: ['CSV must contain 1–5000 rows'], warnings, scopes };
    const required =
      this.mode === 'EVENT'
        ? ['season', 'week', 'nfl_team', 'kicker', 'event_type', 'distance', 'result']
        : [
            'season',
            'week',
            'nfl_team',
            'fg_miss_under_30',
            'fg_miss_30_plus',
            'xp_miss_block',
            'fg_made_over_50',
          ];
    for (const key of required) if (!(key in data[0])) errors.push(`Missing column: ${key}`);
    if (errors.length) return { rows, errors, warnings, scopes };
    const seen = new Set<string>(),
      summaryScopes = new Set<string>();
    let missingIds = 0;
    data.forEach((r, i) => {
      const base = {
        season: Number(r.season),
        week: Number(r.week),
        teamCode: r.nfl_team?.toUpperCase(),
      };
      const scope = `${base.season}/${base.week}/${base.teamCode}`;
      const add = (v: any, id: string) => {
        const result = eventSchema.safeParse({ ...base, ...v, providerEventId: id });
        if (!result.success) {
          errors.push(`Row ${i + 2}: ${result.error.issues.map((x) => x.message).join('; ')}`);
          return;
        }
        if (seen.has(id)) {
          errors.push(`Row ${i + 2}: duplicate event_id ${id}`);
          return;
        }
        seen.add(id);
        rows.push({ row: i + 2, raw: r, event: result.data });
      };
      if (this.mode === 'EVENT') {
        const id = r.event_id || `snapshot/${scope}/${i}`;
        if (!r.event_id) missingIds++;
        add(
          {
            kicker: r.kicker,
            eventType: r.event_type,
            result: r.result,
            distance: r.distance === '' ? null : Number(r.distance),
            gameId: r.game_id || null,
            occurredAt: r.occurred_at || null,
          },
          id,
        );
      } else {
        if (summaryScopes.has(scope)) {
          errors.push(`Row ${i + 2}: duplicate team/week summary`);
          return;
        }
        summaryScopes.add(scope);
        if (
          !Number.isInteger(base.season) ||
          base.season < 2000 ||
          base.season > 2100 ||
          !Number.isInteger(base.week) ||
          base.week < 1 ||
          base.week > 22 ||
          !TEAM_CODES.includes(base.teamCode as any)
        ) {
          errors.push(`Row ${i + 2}: invalid season, week, or team`);
          return;
        }
        const metrics = [
          ['fg_miss_under_30', 'FIELD_GOAL', 'MISSED', 29],
          ['fg_miss_30_plus', 'FIELD_GOAL', 'MISSED', 30],
          ['xp_miss_block', 'EXTRA_POINT', 'MISSED', null],
          ['fg_made_over_50', 'FIELD_GOAL', 'MADE', 51],
        ] as const;
        for (const [key, eventType, result, distance] of metrics) {
          const count = Number(r[key]);
          if (r[key] === '' || !Number.isInteger(count) || count < 0 || count > 30) {
            errors.push(`Row ${i + 2}: ${key} must be an integer from 0 to 30`);
            continue;
          }
          for (let j = 0; j < count; j++)
            add(
              { kicker: 'Team summary (individual unknown)', eventType, result, distance },
              `summary/${scope}/${key}/${j}`,
            );
        }
      }
      if (
        Number.isInteger(base.season) &&
        Number.isInteger(base.week) &&
        TEAM_CODES.includes(base.teamCode as any) &&
        !scopes.some(
          (s) => s.season === base.season && s.week === base.week && s.teamCode === base.teamCode,
        )
      )
        scopes.push(base);
    });
    if (missingIds && missingIds !== data.length)
      errors.push(
        'Use event_id on every row or omit it on every row; mixed incremental/snapshot imports are not allowed.',
      );
    if (missingIds || this.mode === 'SUMMARY')
      warnings.push(
        'Snapshot import: replaces all existing events for each included NFL team/week, including data from other providers. Include the complete team/week.',
      );
    if (this.mode === 'SUMMARY')
      warnings.push(
        'Summary distances are scoring-band placeholders (29, 30, 51 yards), not actual kick distances. XP misses and blocks are combined.',
      );
    if (rows.some((r) => r.event.result === 'UNKNOWN'))
      warnings.push('UNKNOWN results score zero until corrected.');
    return { rows, errors, warnings, scopes };
  }
}
export class NflverseProvider implements NflDataProvider {
  normalize(input: string): ParsedImport {
    let data: any[];
    try {
      data = parse(input, { columns: true, bom: true, skip_empty_lines: true });
    } catch {
      return { rows: [], errors: ['Invalid nflverse CSV'], warnings: [], scopes: [] };
    }
    const rows: ImportRow[] = [],
      errors: string[] = [],
      scopes: ParsedImport['scopes'] = [];
    const aliases: Record<string, string> = {
      LA: 'LAR',
      SD: 'LAC',
      OAK: 'LV',
      STL: 'LAR',
      JAC: 'JAX',
    };
    data
      .filter((r) => r.field_goal_attempt === '1' || r.extra_point_attempt === '1')
      .forEach((r, i) => {
        const fg = r.field_goal_attempt === '1',
          rawResult = fg ? r.field_goal_result : r.extra_point_result;
        const results: Record<string, string> = {
          made: 'MADE',
          good: 'MADE',
          missed: 'MISSED',
          failed: 'FAILED',
          blocked: 'BLOCKED',
        };
        const result = eventSchema.safeParse({
          season: Number(r.season),
          week: Number(r.week),
          teamCode: aliases[r.posteam] || r.posteam,
          kicker: r.kicker_player_name || 'Unknown kicker',
          eventType: fg ? 'FIELD_GOAL' : 'EXTRA_POINT',
          result: results[rawResult] || 'UNKNOWN',
          distance: fg ? Number(r.kick_distance) : null,
          gameId: r.game_id,
          providerEventId: `${r.game_id}/${r.play_id}`,
        });
        if (!r.game_id || !r.play_id)
          errors.push(`nflverse row ${i + 1}: game_id and play_id required`);
        else if (!result.success) errors.push(`nflverse row ${i + 1}: ${result.error.message}`);
        else {
          rows.push({ row: i + 1, raw: r, event: result.data });
          const { season, week, teamCode } = result.data;
          if (
            !scopes.some((s) => s.season === season && s.week === week && s.teamCode === teamCode)
          )
            scopes.push({ season, week, teamCode });
        }
      });
    return {
      rows,
      errors,
      warnings: ['nflverse incremental import; source removals require an audited void.'],
      scopes,
    };
  }
}
export const digest = (s: string) => createHash('sha256').update(s).digest('hex');

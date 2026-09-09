import { describe, it, expect } from 'vitest';
import { score, defaultRules, leagueSchema, eventSchema } from '../packages/core/src';
import { CSVProvider, NflverseProvider } from '../packages/core/src/providers';
describe('AING scoring boundaries', () => {
  it.each([
    [28, 2],
    [29, 2],
    [30, 1],
    [49, 1],
    [50, 1],
    [60, 1],
  ])('miss at %i yards scores %i', (distance, points) =>
    expect(score({ eventType: 'FIELD_GOAL', result: 'MISSED', distance })).toBe(points),
  );
  it.each([
    [49, 0],
    [50, 0],
    [51, -1],
    [60, -1],
  ])('make at %i yards scores %i', (distance, points) =>
    expect(score({ eventType: 'FIELD_GOAL', result: 'MADE', distance })).toBe(points),
  );
  it.each(['MISSED', 'BLOCKED', 'FAILED'] as const)('XP %s scores +3', (result) =>
    expect(score({ eventType: 'EXTRA_POINT', result, distance: null })).toBe(3),
  );
  it('made XP is zero', () =>
    expect(score({ eventType: 'EXTRA_POINT', result: 'MADE', distance: null })).toBe(0));
  it('unknown does not award a miss', () =>
    expect(score({ eventType: 'FIELD_GOAL', result: 'UNKNOWN', distance: 27 })).toBe(0));
  it('blocked FG follows distance thresholds', () => {
    expect(score({ eventType: 'FIELD_GOAL', result: 'BLOCKED', distance: 29 })).toBe(2);
    expect(score({ eventType: 'FIELD_GOAL', result: 'BLOCKED', distance: 30 })).toBe(1);
  });
  it('uses supplied historical rules', () =>
    expect(
      score(
        { eventType: 'EXTRA_POINT', result: 'MISSED', distance: null },
        { ...defaultRules, xpMiss: 7 },
      ),
    ).toBe(7));
  it('rejects missing FG distance', () =>
    expect(() => score({ eventType: 'FIELD_GOAL', result: 'MADE', distance: null })).toThrow());
});
describe('input validation', () => {
  const header = 'season,week,nfl_team,kicker,event_type,distance,result';
  it('quoted player names are parsed', () => {
    const r = new CSVProvider('EVENT').normalize(
      `${header}\n2026,1,BUF,"Smith, Jr.",FIELD_GOAL,29,MISSED`,
    );
    expect(r.errors).toEqual([]);
    expect(r.rows[0].event.kicker).toBe('Smith, Jr.');
  });
  it('mixed stable and missing IDs rejected', () => {
    const r = new CSVProvider('EVENT').normalize(
      `${header},event_id\n2026,1,BUF,A,FIELD_GOAL,29,MISSED,id1\n2026,1,BUF,B,EXTRA_POINT,,MADE,`,
    );
    expect(r.errors.join()).toContain('every row');
  });
  it('duplicate IDs rejected', () => {
    const r = new CSVProvider('EVENT').normalize(
      `${header},event_id\n2026,1,BUF,A,FIELD_GOAL,29,MISSED,id1\n2026,1,BUF,B,EXTRA_POINT,,MADE,id1`,
    );
    expect(r.errors.join()).toContain('duplicate');
  });
  it('empty FG distance rejected', () =>
    expect(
      new CSVProvider('EVENT').normalize(`${header}\n2026,1,BUF,A,FIELD_GOAL,,MISSED`).errors
        .length,
    ).toBe(1));
  it('snapshot IDs remain stable on repeat import', () => {
    const p = new CSVProvider('EVENT'),
      csv = `${header}\n2026,1,BUF,A,FIELD_GOAL,29,MISSED`;
    expect(p.normalize(csv).rows).toEqual(p.normalize(csv).rows);
  });
  it('summary calculates +5 and preserves zero-score scope', () => {
    const r = new CSVProvider('SUMMARY').normalize(
      'season,week,nfl_team,fg_miss_under_30,fg_miss_30_plus,xp_miss_block,fg_made_over_50\n2026,1,BUF,1,0,1,0\n2026,1,DAL,0,0,0,0',
    );
    expect(r.errors).toEqual([]);
    expect(r.rows.reduce((n, r) => n + score(r.event), 0)).toBe(5);
    expect(r.scopes).toHaveLength(2);
  });
  it('rejects negative summary count', () =>
    expect(
      new CSVProvider('SUMMARY').normalize(
        'season,week,nfl_team,fg_miss_under_30,fg_miss_30_plus,xp_miss_block,fg_made_over_50\n2026,1,BUF,-1,0,0,0',
      ).errors.length,
    ).toBeGreaterThan(0));
  it('normalizes nflverse team and results', () => {
    const r = new NflverseProvider().normalize(
      'season,week,posteam,game_id,play_id,field_goal_attempt,extra_point_attempt,field_goal_result,kick_distance,kicker_player_name\n2026,1,LA,g1,2,1,0,blocked,29,A',
    );
    expect(r.rows[0].event.teamCode).toBe('LAR');
    expect(score(r.rows[0].event)).toBe(2);
  });
  it.each([1, 33, -1, 2.5])('rejects capacity %i', (maxTeams) =>
    expect(
      leagueSchema.safeParse({ name: 'League', teamName: 'Team', season: 2026, maxTeams }).success,
    ).toBe(false),
  );
  it.each([2, 32])('accepts capacity %i', (maxTeams) =>
    expect(
      leagueSchema.safeParse({ name: 'League', teamName: 'Team', season: 2026, maxTeams }).success,
    ).toBe(true),
  );
});

import { describe, expect, it } from 'vitest';
import { normalizeEspn, shouldFetchEspnGame } from '../packages/core/src/espn';
import { score } from '../packages/core/src';

function game(texts: string[], fg = '0/0', xp = '0/0') {
  return { header: { id: '123', season: { year: 2026, type: 2 } },
    boxscore: { players: [{ team: { abbreviation: 'BUF' }, statistics: [{ name: 'kicking',
      keys: ['fieldGoalsMade/fieldGoalAttempts', 'extraPointsMade/extraPointAttempts'],
      athletes: [{ athlete: { id: '1', displayName: 'Tyler Bass', firstName: 'Tyler', lastName: 'Bass' }, stats: [fg, xp] }],
    }] }] },
    drives: { previous: [{ plays: texts.map((text, i) => ({ id: String(i), text })) }] },
  };
}
describe('ESPN scoring adapter', () => {
  it('scores FG distances, blocks and embedded touchdown extra points', () => {
    const p = normalizeEspn(game(['T.Bass 29 yard field goal is NO GOOD', 'T.Bass 51 yard field goal is GOOD',
      'Runner TOUCHDOWN. T.Bass extra point is BLOCKED'], '1/2', '0/1'), 2026, 1);
    expect(p.errors).toEqual([]);
    expect(p.rows.map(r => score(r.event))).toEqual([2, -1, 3]);
  });
  it('supports compact touchdown summaries', () => {
    const p = normalizeEspn(game(['Receiver 9 Yd pass from Quarterback (Tyler Bass Kick)'], '0/0', '1/1'), 2026, 1);
    expect(p.errors).toEqual([]);
    expect(p.rows[0].event.result).toBe('MADE');
  });
  it('supports full names and compact made field goals with an explicit made type', () => {
    const g: any = game(['Tyler Bass 53 Yd Field Goal'], '1/1');
    g.drives.previous[0].plays[0].type = { id: '59' };
    const p = normalizeEspn(g, 2026, 1);
    expect(p.errors).toEqual([]);
    expect(score(p.rows[0].event)).toBe(-1);
  });
  it('deduplicates the current drive and ignores nullified plays', () => {
    const g: any = game(['T.Bass 25 yard field goal is GOOD', 'T.Bass 30 yard field goal is GOOD. No Play.'], '1/1');
    g.drives.current = g.drives.previous[0];
    expect(normalizeEspn(g, 2026, 1).rows).toHaveLength(1);
  });
  it('rejects partial feeds and unknown players instead of scoring silently', () => {
    expect(normalizeEspn(game([], '1/1'), 2026, 1).errors.length).toBeGreaterThan(0);
    expect(normalizeEspn(game(['X.Unknown extra point is GOOD'], '0/0', '1/1'), 2026, 1).errors.length).toBeGreaterThan(0);
  });
  it('keeps preseason separate from regular-season fantasy scores', () => {
    const g = game([]); g.header.season.type = 1;
    expect(normalizeEspn(g, 2026, 1).errors).toHaveLength(1);
  });
  it('polls live games and recent finals, not future or old games', () => {
    const now = Date.now();
    const e = (age: number, state: string) => ({ date: new Date(now - age).toISOString(), status: { type: { state } } });
    expect(shouldFetchEspnGame(e(-60000, 'pre'), now)).toBe(false);
    expect(shouldFetchEspnGame(e(60000, 'in'), now)).toBe(true);
    expect(shouldFetchEspnGame(e(86400000, 'post'), now)).toBe(true);
    expect(shouldFetchEspnGame(e(3 * 86400000, 'post'), now)).toBe(false);
  });
});

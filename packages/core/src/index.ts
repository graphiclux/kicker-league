import { z } from 'zod';
export const TEAM_CODES = [
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LAC',
  'LAR',
  'LV',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WAS',
] as const;
export const defaultRules = {
  shortMiss: 2,
  longMiss: 1,
  xpMiss: 3,
  xpBlocked: 3,
  longMade: -1,
  shortMax: 29,
  longMadeMin: 51,
};
export type Rules = typeof defaultRules;
export const eventSchema = z
  .object({
    season: z.coerce.number().int().min(2000).max(2100),
    week: z.coerce.number().int().min(1).max(22),
    teamCode: z.enum(TEAM_CODES),
    kicker: z.string().trim().min(1).max(100),
    eventType: z.enum(['FIELD_GOAL', 'EXTRA_POINT']),
    result: z.enum(['MADE', 'MISSED', 'BLOCKED', 'FAILED', 'UNKNOWN']),
    distance: z.number().int().min(1).max(100).nullable(),
    gameId: z.string().max(120).nullable().optional(),
    providerEventId: z.string().min(1).max(200),
    occurredAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .superRefine((v, c) => {
    if (v.eventType === 'FIELD_GOAL' && v.distance === null)
      c.addIssue({
        code: 'custom',
        message: 'Field goal distance is required',
        path: ['distance'],
      });
    if (v.eventType === 'EXTRA_POINT' && v.distance !== null)
      c.addIssue({
        code: 'custom',
        message: 'Extra point distance must be blank',
        path: ['distance'],
      });
  });
export type NormalizedEvent = z.infer<typeof eventSchema>;
export function score(
  event: Pick<NormalizedEvent, 'eventType' | 'result' | 'distance'>,
  rules: Rules = defaultRules,
): number {
  if (event.result === 'UNKNOWN') return 0;
  if (event.eventType === 'EXTRA_POINT')
    return event.result === 'MADE'
      ? 0
      : event.result === 'BLOCKED'
        ? rules.xpBlocked
        : rules.xpMiss;
  if (event.distance === null) throw new Error('Field goal distance is required');
  return event.result === 'MADE'
    ? event.distance >= rules.longMadeMin
      ? rules.longMade
      : 0
    : event.distance <= rules.shortMax
      ? rules.shortMiss
      : rules.longMiss;
}
export const registerSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(60),
});
export const leagueSchema = z.object({
  name: z.string().trim().min(2).max(80),
  teamName: z.string().trim().min(2).max(60),
  season: z.number().int().min(2000).max(2100),
  maxTeams: z.number().int().min(2).max(32),
});
export const reasonSchema = z.string().trim().min(5).max(500);
export const weekSchema = z.object({
  season: z.coerce.number().int().min(2000).max(2100),
  week: z.coerce.number().int().min(1).max(22),
});
export type LeagueView = {
  id: string;
  name: string;
  season: number;
  maxTeams: number;
  status: string;
  commissionerId: string;
  inviteCode: string;
  currentPick: number;
  deadline: string | null;
  pickSeconds: number;
  scheduledAt: string | null;
  teams: FantasyTeamView[];
};
export type FantasyTeamView = {
  id: string;
  ownerId: string;
  name: string;
  draftOrder: number | null;
  rankings: string[];
  roster: {
    teamCode: string;
    displayedKicker: string | null;
    pickNumber: number;
    source: string;
  } | null;
  totalPoints?: number;
  weeklyPoints?: number;
  rank?: number;
};
export type UserView = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  verifiedAt: string | null;
  notificationsEnabled: boolean;
};
export type NflTeamView = {
  code: string;
  city: string;
  name: string;
  assignments: { player: { name: string } }[];
};
export class ApiClient {
  constructor(
    public baseUrl: string,
    private access: () => string | null = () => null,
  ) {}
  async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.access();
    const r = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await r.json().catch(() => ({ message: `HTTP ${r.status}` }));
    if (!r.ok) {
      const error = new Error(
        Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Request failed',
      ) as Error & { status?: number };
      error.status = r.status;
      throw error;
    }
    return data;
  }
  post<T = any>(path: string, data: unknown = {}) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(data) });
  }
}

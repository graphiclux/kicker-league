'use client';
import { useState, useEffect, FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  Flag,
  Trophy,
  Users,
  Target,
  Shield,
  LogOut,
  ArrowUpRight,
  Activity,
  ChevronRight,
  Check,
  Clock,
  Menu,
  Bell,
  RefreshCw,
  Upload,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  ApiClient,
  LeagueView,
  UserView,
  NflTeamView,
  FantasyTeamView,
  defaultRules,
} from '../../../packages/core/src';
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchInterval: 10000 } },
});
let access: string | null = null;
const api = new ApiClient('/api', () => access);
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
export default function Page() {
  return (
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function App() {
  const qc = useQueryClient();
  const [user, setUser] = useState<UserView | null>(null),
    [boot, setBoot] = useState(true),
    [screen, setScreen] = useState('overview'),
    [leagueId, setLeagueId] = useState(''),
    [seasonOverride, setSeasonOverride] = useState<number | null>(null),
    [week, setWeek] = useState(1),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [mobileMoreOpen, setMobileMoreOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [teamNameEdit, setTeamNameEdit] = useState('');
  const [authMode, setAuthMode] = useState('login'),
    [authAction, setAuthAction] = useState(''),
    [authToken, setAuthToken] = useState('');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState('');
  const leagues = useQuery<LeagueView[]>({
    queryKey: ['leagues'],
    queryFn: () => api.request('/leagues'),
    enabled: !!user,
  });
  const seasons = useQuery<any[]>({
    queryKey: ['seasons'],
    queryFn: () => api.request('/seasons'),
  });
  const nfl = useQuery<NflTeamView[]>({
    queryKey: ['nfl'],
    queryFn: () => api.request('/nfl-teams'),
  });
  const league = leagues.data?.find((l) => l.id === leagueId) || leagues.data?.[0];
  const season = seasonOverride || league?.season || seasons.data?.[0]?.year || 2026;
  const selectedSeason = seasons.data?.find((s) => s.year === season),
    weekLimit = Math.min(18, selectedSeason?.currentWeek || 18);
  useEffect(() => { if (week > weekLimit) setWeek(weekLimit); }, [week, weekLimit]);
  const standings = useQuery<FantasyTeamView[]>({
    queryKey: ['standings', league?.id, week],
    queryFn: () => api.request(`/leagues/${league!.id}/standings?week=${week}`),
    enabled: !!league,
  });
  const notifications = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: () => api.request('/notifications'),
    enabled: !!user,
  });
  const myTeam = standings.data?.find((t) => t.ownerId === user?.id),
    isCommissioner = league?.commissionerId === user?.id;
  useEffect(() => setTeamNameEdit(myTeam?.name || ''), [myTeam?.id]);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setAuthAction(q.get('action') || '');
    setAuthToken(q.get('token') || '');
    if (q.get('token')) history.replaceState({}, '', location.pathname);
    api
      .post('/auth/refresh')
      .then((d) => {
        access = d.accessToken;
        setUser(d.user);
      })
      .catch(() => {})
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(
      () =>
        api
          .post('/auth/refresh')
          .then((d) => {
            access = d.accessToken;
          })
          .catch(() => {
            setUser(null);
            access = null;
            qc.clear();
          }),
      12 * 60 * 1000,
    );
    return () => clearInterval(timer);
  }, [user, qc]);
  useEffect(() => {
    if (!user || !access) return;
    const socket = io({
      auth: (cb) => cb({ token: access }),
      transports: ['websocket', 'polling'],
    });
    socket.on('ready', () => {
      if (league) socket.emit('league.join', { leagueId: league.id });
    });
    for (const e of ['draft.updated', 'scores.updated']) socket.on(e, () => qc.invalidateQueries());
    return () => {
      socket.disconnect();
    };
  }, [user, league?.id, qc]);
  async function run(fn: () => Promise<unknown>, message = 'Saved') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await qc.invalidateQueries();
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    await run(
      async () => {
        if (authMode === 'forgot') {
          await api.post('/auth/forgot-password', { email });
          setNotice('Check your email for a reset link.');
          return;
        }
        const d = await api.post(`/auth/${authMode}`, { email, password, displayName: name });
        access = d.accessToken;
        setUser(d.user);
        qc.clear();
      },
      authMode === 'register'
        ? 'Account created. Check your email to verify.'
        : authMode === 'forgot'
          ? 'If the account exists, an email is on its way.'
          : 'Welcome back.',
    );
  }
  if (boot)
    return (
      <div className="loading">
        <Flag size={40} />
        <p>Getting the field ready…</p>
      </div>
    );
  if (authAction && authToken)
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <Brand />
          <h1>{authAction === 'verify' ? 'Confirm your email' : 'A fresh start.'}</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                async () => {
                  await api.post(
                    authAction === 'verify' ? '/auth/verify' : '/auth/reset-password',
                    { token: authToken, password },
                  );
                  setAuthAction('');
                  setAuthToken('');
                  if (user) setUser(await api.request('/auth/me'));
                },
                authAction === 'verify'
                  ? 'Email verified.'
                  : 'Password changed. Sign in with your new password.',
              );
            }}
          >
            {authAction !== 'verify' && (
              <Field label="New password">
                <input
                  type="password"
                  minLength={12}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            )}
            <button disabled={busy}>
              {' '}
              {authAction === 'verify' ? 'Verify email' : 'Save password'}
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </div>
      </main>
    );
  if (!user)
    return (
      <main className="auth-shell">
        <section className="auth-story">
          <Brand />
          <div className="eyebrow">FANTASY FOOTBALL. QUESTIONABLE FOOTWORK.</div>
          <h1>
            Great season.
            <br />
            <em>Terrible kicks.</em>
          </h1>
          <p>
            Draft one NFL kicking position. Cheer for the miss.
            <br />
            Let the chaos take care of the rest.
          </p>
          <div className="rules-strip">
            <div>
              <strong>+3</strong>
              <span>Missed extra point</span>
            </div>
            <div>
              <strong>+2</strong>
              <span>Missed FG ≤ 29 yd</span>
            </div>
            <div>
              <strong>−1</strong>
              <span>Made FG ≥ 51 yd</span>
            </div>
          </div>
          <div className="auth-bottom">
            ONE DRAFT <span>·</span> ZERO ROSTER CHORES <span>·</span> ALL SEASON
          </div>
        </section>
        <section className="auth-card">
          <span className="eyebrow">WELCOME TO THE WRONG SIDE OF THE UPRIGHTS</span>
          <h2>
            {authMode === 'register'
              ? 'Join the misfits.'
              : authMode === 'forgot'
                ? 'Forgot your password?'
                : 'Back for more misses?'}
          </h2>
          <p>
            {authMode === 'register'
              ? 'Your championship starts with a bad kick.'
              : 'Sign in to your leagues.'}
          </p>
          <form onSubmit={login}>
            {authMode === 'register' && (
              <Field label="Display name">
                <input
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            {authMode !== 'forgot' && (
              <Field label="Password">
                <input
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={authMode === 'register' ? 12 : 1}
                  required
                />
              </Field>
            )}
            <button className="wide" disabled={busy}>
              {busy
                ? 'One moment…'
                : authMode === 'register'
                  ? 'Create account'
                  : authMode === 'forgot'
                    ? 'Send reset link'
                    : 'Enter the league'}
              <ArrowUpRight size={18} />
            </button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          <button
            className="text-button"
            onClick={() => {
              setAuthMode(authMode === 'register' ? 'login' : 'register');
              setError('');
            }}
          >
            {authMode === 'register' ? 'Already a member? Sign in' : 'New here? Create an account'}
          </button>
          {authMode === 'login' && (
            <button className="text-button" onClick={() => setAuthMode('forgot')}>
              Forgot password?
            </button>
          )}
          <div className="fine-print">
            Draft once. Own the franchise’s kicking position all season, including every backup. No
            trades, waivers, or lineup changes.
          </div>
          <div className="legal-links"><a href="/privacy">Privacy Policy</a><span>·</span><a href="/terms">Terms of Service</a></div>
        </section>
      </main>
    );
  const nav: [string, string, typeof Flag][] = [
    ['overview', 'Clubhouse', Flag],
    ['draft', 'Draft room', Target],
    ['standings', 'Standings', Trophy],
    ['nfl', 'NFL kicking', Activity],
    ['leagues', 'My leagues', Users],
    ['notifications', 'Notifications', Bell],
    ...(user.role === 'SUPER_ADMIN'
      ? [['admin', 'Super Admin', Shield] as [string, string, typeof Flag]]
      : []),
  ] as const;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="side-caption">YOUR SEASON OF MISFORTUNE</div>
        <nav>
          {nav.map(([key, title, Icon]) => (
            <button
              key={key}
              className={`nav-item ${screen === key ? 'active' : ''}`}
              onClick={() => {
                setScreen(key);
                setError('');
                setNotice('');
              }}
            >
              <Icon size={19} />
              {title}
              {screen === key && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-rules">
          <span className="eyebrow">THE BEAUTY OF IT</span>
          <strong>
            One pick.
            <br />
            No take-backs.
          </strong>
          <p>Your kicking position is yours for the season. Even when the kicker changes.</p>
        </div>
        <div className="account">
          <div className="avatar">{user.displayName.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user.displayName}</strong>
            <small>{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'League member'}</small>
          </div>
          <button
            aria-label="Sign out"
            className="icon-button"
            onClick={() =>
              run(async () => {
                await api.post('/auth/logout');
                access = null;
                setUser(null);
                qc.clear();
              })
            }
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="mobile-brand" aria-label="And It’s No Good">
            <Brand />
          </div>
          <div className="breadcrumb">
            THE LEAGUE OFFICE <span>/</span> {nav.find((n) => n[0] === screen)?.[1]}
          </div>
          <div className="top-controls">
            <select aria-label="Selected season" value={season} onChange={(e) => setSeasonOverride(Number(e.target.value))}>
              {seasons.data?.filter((s) => s.status === 'ACTIVE').map((s) => <option value={s.year} key={s.year}>{s.year} Season</option>)}
            </select>
            <select
              aria-label="Selected league"
              value={league?.id || ''}
              onChange={(e) => setLeagueId(e.target.value)}
            >
              <option value="" disabled>
                Your leagues
              </option>
              {leagues.data?.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <select
              aria-label="NFL week"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {Array.from({ length: weekLimit }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Week {i + 1}
                </option>
              ))}
            </select>
          </div>
        </header>
        <div className="content">
          {!user.verifiedAt && (
            <div className="notice">
              Verify your email to create or join leagues.{' '}
              <button
                className="text-button"
                onClick={() =>
                  run(() => api.post('/auth/resend-verification'), 'Verification email sent.')
                }
              >
                Resend email
              </button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button className="text-button" onClick={() => setError('')}>
                Dismiss
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {leagues.error && (
            <div role="alert" className="error">
              {leagues.error.message}
            </div>
          )}
          {screen === 'overview' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    WEEK {week} · {league?.name || 'YOUR CLUBHOUSE'}
                  </span>
                  <h1>Here’s to the misses.</h1>
                  <p>
                    {league
                      ? 'Your season, one unfortunate kick at a time.'
                      : 'Create your league, invite your people, and make your one pick.'}
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setScreen(league ? 'draft' : 'leagues')}
                >
                  {league ? 'Open draft room' : 'Create a league'}
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="dashboard-grid">
                <section className="team-hero">
                  <div className="hero-top">
                    <span className="eyebrow">YOUR FANTASY TEAM</span>
                    <span className="pill">
                      {league?.status === 'COMPLETE'
                        ? 'ROSTER LOCKED'
                        : league?.status || 'PRESEASON'}
                    </span>
                  </div>
                  <h2>{myTeam?.name || 'Your next bad idea'}</h2>
                  <FeedStatus season={league?.season || season} week={week} />
                  <div className="hero-scores">
                    <div>
                      <span>THIS WEEK</span>
                      <strong>
                        {signed(myTeam?.weeklyPoints || 0)}
                        <small>PTS</small>
                      </strong>
                    </div>
                    <div>
                      <span>SEASON TOTAL</span>
                      <strong>
                        {signed(myTeam?.totalPoints || 0)}
                        <small>PTS</small>
                      </strong>
                    </div>
                  </div>
                  <div className="hero-foot">
                    <span>
                      <Trophy size={17} />{' '}
                      {myTeam
                        ? `Rank ${myTeam.rank} of ${league?.teams.length}`
                        : 'Your league is waiting'}
                    </span>
                    <span>{myTeam?.roster?.teamCode || 'Not drafted'} · KICKING POSITION</span>
                  </div>
                </section>
                <section className="panel roster-panel">
                  <div className="section-heading">
                    <h3>Your kicking position</h3>
                    <Target size={20} />
                  </div>
                  <div className="kicker-identity">
                    {nfl.data?.find((t) => t.code === myTeam?.roster?.teamCode)?.assignments[0]?.player.imageUrl ? (
                      <img
                        className="clubhouse-kicker-avatar"
                        src={nfl.data.find((t) => t.code === myTeam?.roster?.teamCode)!.assignments[0].player.imageUrl!}
                        alt=""
                      />
                    ) : (
                      <div className="clubhouse-kicker-placeholder">{myTeam?.roster?.teamCode || 'K'}</div>
                    )}
                    <div>
                      <strong>{nfl.data?.find((t) => t.code === myTeam?.roster?.teamCode)?.assignments[0]?.player.name || 'Kicker to be confirmed'}</strong>
                      <small>Current kicker · backups included</small>
                    </div>
                  </div>
                  <div className="franchise-big">{myTeam?.roster?.teamCode || '—'}</div>
                  <h2>
                    {nfl.data
                      ?.find((t) => t.code === myTeam?.roster?.teamCode)
                      ?.assignments.find((a) => true)?.player.name || 'Awaiting your pick'}
                  </h2>
                  <p>
                    {nfl.data?.find((t) => t.code === myTeam?.roster?.teamCode)?.city}{' '}
                    {nfl.data?.find((t) => t.code === myTeam?.roster?.teamCode)?.name}
                  </p>
                  <div className="subtle-note">
                    <Lock size={14} />{' '}
                    {myTeam?.roster
                      ? 'All franchise kickers count automatically.'
                      : 'One round. All 32 franchises available.'}
                  </div>
                </section>
              </div>
              <div className="two-col">
                <section className="panel">
                  <div className="section-heading">
                    <h3>The pecking order</h3>
                    <button className="text-button" onClick={() => setScreen('standings')}>
                      Full standings <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <Standings rows={standings.data?.slice(0, 5) || []} userId={user.id} />
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <h3>How to be good at being bad</h3>
                    <Flag size={18} />
                  </div>
                  <div className="scoring-rule">
                    <span>Missed / blocked FG, 29 yd or less</span>
                    <b>+2</b>
                  </div>
                  <div className="scoring-rule">
                    <span>Missed / blocked FG, 30 yd or more</span>
                    <b>+1</b>
                  </div>
                  <div className="scoring-rule">
                    <span>Missed / blocked extra point</span>
                    <b>+3</b>
                  </div>
                  <div className="scoring-rule negative">
                    <span>Made field goal, 51 yd or more</span>
                    <b>−1</b>
                  </div>
                  <p className="muted">
                    A 50-yard make is 0. Bye week? Also 0. Highest season total wins. Tied totals
                    share a rank.
                  </p>
                </section>
              </div>
              {myTeam?.roster && (
                <EventFeed season={season} week={week} teamCode={myTeam.roster.teamCode} />
              )}
            </>
          )}
          {screen === 'leagues' && (
            <Leagues
              user={user}
              leagues={leagues.data || []}
              seasons={seasons.data || []}
              run={run}
              busy={busy}
              onSelect={(id) => {
                setLeagueId(id);
                setScreen('overview');
              }}
            />
          )}
          {screen === 'draft' &&
            (league ? (
              <Draft league={league} user={user} nfl={nfl.data || []} run={run} busy={busy} />
            ) : (
              <Empty
                title="A draft needs a league."
                text="Create a league or join with an invite code to get started."
                action={() => setScreen('leagues')}
              />
            ))}
          {screen === 'standings' && (
            <>
              <PageTitle
                eyebrow={`${league?.name || 'YOUR LEAGUE'} · TOTAL POINTS`}
                title="A race to the bottom."
                text="The worst kicks. The best scores. Highest total takes the season."
              />
              <section className="panel">
                <Standings rows={standings.data || []} userId={user.id} />
              </section>
              {myTeam?.roster && (
                <EventFeed season={season} week={week} teamCode={myTeam.roster.teamCode} />
              )}
            </>
          )}
          {screen === 'nfl' && <Nfl nfl={nfl.data || []} season={season} week={week} initialTeamCode={myTeam?.roster?.teamCode} />}
          {screen === 'notifications' && (
            <>
              <PageTitle eyebrow="THE LATEST" title="Word from the uprights." />
              <section className="panel">
                <div className="profile-panel">
                  <span className="eyebrow">YOUR PROFILE</span>
                  <h3>{user.displayName}</h3>
                  <p className="muted">{user.email}</p>
                  {league && myTeam && (
                    <form className="team-name-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/leagues/${league.id}/team-name`, { name: teamNameEdit.trim() }); await qc.invalidateQueries({ queryKey: ['standings', league.id] }); }, 'Team name saved.'); }}>
                      <Field label={`Team name · ${league.name}`}><input aria-label="Team name" value={teamNameEdit} maxLength={60} onChange={(e) => setTeamNameEdit(e.target.value)} /></Field>
                      <button disabled={busy || teamNameEdit.trim().length < 2 || teamNameEdit.trim() === myTeam.name}>Save team name</button>
                    </form>
                  )}
                </div>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={user.notificationsEnabled}
                    onChange={(e) =>
                      run(async () => {
                        await api.post('/profile', { notificationsEnabled: e.target.checked });
                        setUser({ ...user, notificationsEnabled: e.target.checked });
                      })
                    }
                  />{' '}
                  Receive scoring notifications
                </label>
                <div className="email-preferences">
                  {([
                    ['emailScoringEnabled', 'Scoring update emails'],
                    ['emailDraftEnabled', 'Draft reminders and pick emails'],
                    ['emailLeagueEnabled', 'League and import emails'],
                    ['emailSecurityEnabled', 'Security and sign-in emails'],
                  ] as const).map(([key, label]) => (
                    <label className="check-label" key={key}>
                      <input
                        type="checkbox"
                        checked={Boolean((user as any)[key])}
                        onChange={(e) => run(async () => {
                          await api.post('/profile', { [key]: e.target.checked });
                          setUser({ ...user, [key]: e.target.checked } as UserView);
                        }, 'Email preferences saved.')}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {notifications.data?.length ? (
                  notifications.data.map((n) => (
                    <div className="notification" key={n.id}>
                      <Bell size={20} />
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.body}</p>
                        <small>{new Date(n.createdAt).toLocaleString()}</small>
                      </div>
                      {!n.readAt && (
                        <button
                          className="secondary"
                          onClick={() =>
                            run(() => api.post(`/notifications/${n.id}/read`), 'Marked as read')
                          }
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="empty-inline">
                    No notifications yet. We’ll keep you posted when scores change.
                  </p>
                )}
              </section>
            </>
          )}
          {screen === 'admin' && user.role === 'SUPER_ADMIN' && (
            <Admin user={user} season={season} week={week} run={run} busy={busy} nfl={nfl.data || []} />
          )}
        </div>
        <footer>
          <span className="footer-brand">AND IT’S NO GOOD</span>
          <span>One position. All season. Every miss.</span>
          <span className="footer-legal"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></span>
        </footer>
        {mobileMoreOpen && (
          <div className="mobile-more-sheet" role="dialog" aria-label="More navigation">
            <div className="mobile-more-heading"><strong>League office</strong><button className="text-button" onClick={() => setMobileMoreOpen(false)}>Close</button></div>
            {nav.filter(([key]) => !['overview', 'nfl', 'standings'].includes(key)).map(([key, title, Icon]) => (
              <button key={key} onClick={() => { setScreen(key); setMobileMoreOpen(false); }}><Icon size={18} />{title}</button>
            ))}
          </div>
        )}
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {nav.filter(([key]) => ['overview', 'nfl', 'standings'].includes(key)).map(([key, title, Icon]) => (
            <button
              key={key}
              className={screen === key ? 'active' : ''}
              onClick={() => {
                setScreen(key);
                setError('');
                setNotice('');
              }}
            >
              <Icon size={18} />
              <span>{title === 'Draft room' ? 'Draft' : title === 'NFL kicking' ? 'NFL' : title === 'My leagues' ? 'Leagues' : title}</span>
            </button>
          ))}
          <button className={mobileMoreOpen ? 'active' : ''} onClick={() => setMobileMoreOpen((open) => !open)}><Menu size={18} /><span>More</span></button>
        </nav>
      </main>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <img className="brand-icon" src="/icon.png" alt="And It’s No Good" />
      <span>
        AND IT’S
        <br />
        <strong>NO GOOD.</strong>
      </span>
    </div>
  );
}
function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
    </div>
  );
}
function Empty({ title, text, action }: { title: string; text: string; action: () => void }) {
  return (
    <section className="panel empty">
      <Flag size={36} />
      <h2>{title}</h2>
      <p>{text}</p>
      <button onClick={action}>Go to my leagues</button>
    </section>
  );
}
function Standings({ rows, userId }: { rows: FantasyTeamView[]; userId: string }) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Fantasy team</th>
            <th>NFL</th>
            <th>Week</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className={t.ownerId === userId ? 'my-row' : ''}>
              <td>
                <span className={`rank rank-${t.rank}`}>{String(t.rank).padStart(2, '0')}</span>
              </td>
              <td>
                <strong>{t.name}</strong>
                {t.ownerId === userId && <small>YOU</small>}
              </td>
              <td>
                <span className="team-tag">{t.roster?.teamCode || '—'}</span>
              </td>
              <td>{signed(t.weeklyPoints || 0)}</td>
              <td className="total">{signed(t.totalPoints || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty-inline">Your league standings will appear here.</p>
  );
}
function EventFeed({
  season,
  week,
  teamCode,
}: {
  season: number;
  week: number;
  teamCode?: string;
}) {
  const q = useQuery<any[]>({
    queryKey: ['events', season, week, teamCode],
    queryFn: () =>
      api.request(
        `/events?season=${season}&week=${week}${teamCode ? `&teamCode=${teamCode}` : ''}`,
      ),
  });
  return (
    <section className="panel event-feed">
      <div className="section-heading">
        <h3>Every kick tells a story</h3>
        <span className="muted">
          {teamCode || 'ALL TEAMS'} · WEEK {week}
        </span>
      </div>
      {q.error && <p className="error">{q.error.message}</p>}
      {q.data?.length ? (
        q.data.map((e) => (
          <div className={`event-row ${e.voidedAt ? 'voided' : ''}`} key={e.id}>
            <div className={`event-points ${e.points < 0 ? 'bad' : ''}`}>
              {e.voidedAt ? 'VOID' : signed(e.points)}
            </div>
            <div>
              <strong>
                {e.kicker} <span className="muted">· {e.teamCode}</span>
              </strong>
              <p>
                {e.result.replaceAll('_', ' ')}{' '}
                {e.eventType === 'EXTRA_POINT' ? 'extra point' : `${e.distance}-yard field goal`}
              </p>
              <small>
                {e.provider} · {e.ruleCode}
                {e.kicker.startsWith('Team summary') ? ' · summary band distance' : ''}
              </small>
            </div>
          </div>
        ))
      ) : (
        <p className="empty-inline">
          No scoring events for this week yet. Scores appear after an official import.
        </p>
      )}
    </section>
  );
}
type Run = (fn: () => Promise<unknown>, message?: string) => Promise<void>;
function Leagues({
  user,
  leagues,
  seasons,
  run,
  busy,
  onSelect,
}: {
  user: UserView;
  leagues: LeagueView[];
  seasons: any[];
  run: Run;
  busy: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <PageTitle
        eyebrow="YOUR PEOPLE. YOUR BAD DECISIONS."
        title="Make it a league."
        text="Bring 2–32 teams together. Each team gets exactly one NFL franchise’s kicking position."
      />
      <div className="two-col">
        <section className="panel">
          <h3>Create a league</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              run(async () => {
                const l = await api.post('/leagues', {
                  name: d.get('name'),
                  teamName: d.get('teamName'),
                  maxTeams: Number(d.get('maxTeams')),
                  season: Number(d.get('season')),
                });
                onSelect(l.id);
              }, 'League created. Share your invite code.');
            }}
          >
            <Field label="League name">
              <input
                name="name"
                placeholder="The Shank Tank"
                minLength={2}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Your fantasy team name">
              <input
                name="teamName"
                placeholder="Uprights Anonymous"
                minLength={2}
                maxLength={60}
                required
              />
            </Field>
            <div className="two-inputs">
              <Field label="Maximum teams">
                <input name="maxTeams" type="number" min={2} max={32} defaultValue={12} required />
              </Field>
              <Field label="Season">
                <select name="season">
                  {seasons
                    .filter((s) => s.status === 'ACTIVE')
                    .map((s) => (
                      <option key={s.year}>{s.year}</option>
                    ))}
                </select>
              </Field>
            </div>
            <button disabled={busy || !user.verifiedAt}>
              Create league <ArrowUpRight size={16} />
            </button>
          </form>
        </section>
        <section className="panel">
          <h3>Got an invitation?</h3>
          <p>Enter your commissioner’s code to join the fun.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              run(async () => {
                const l = await api.post('/leagues/join', {
                  inviteCode: d.get('inviteCode'),
                  teamName: d.get('teamName'),
                });
                onSelect(l.id);
              }, 'You’re in.');
            }}
          >
            <Field label="Invite code">
              <input name="inviteCode" autoComplete="off" required />
            </Field>
            <Field label="Your fantasy team name">
              <input name="teamName" minLength={2} maxLength={60} required />
            </Field>
            <button className="secondary" disabled={busy || !user.verifiedAt}>
              Join league
            </button>
          </form>
        </section>
      </div>
      <div className="league-grid">
        {leagues.map((l) => (
          <button className="panel league-card" key={l.id} onClick={() => onSelect(l.id)}>
            <Flag size={24} />
            <h3>{l.name}</h3>
            <p>
              {l.teams.length}/{l.maxTeams} teams · {l.season}
            </p>
            <span className="pill">{l.status}</span>
            <ArrowUpRight size={20} />
          </button>
        ))}
      </div>
    </>
  );
}
function Draft({
  league,
  user,
  nfl,
  run,
  busy,
}: {
  league: LeagueView;
  user: UserView;
  nfl: NflTeamView[];
  run: Run;
  busy: boolean;
}) {
  const [now, setNow] = useState(Date.now()),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState('');
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const commissioner = league.commissionerId === user.id,
    my = league.teams.find((t) => t.ownerId === user.id),
    current = league.teams.find((t) => t.draftOrder === league.currentPick),
    taken = new Set(league.teams.map((t) => t.roster?.teamCode));
  const seconds = league.deadline
    ? Math.max(0, Math.ceil((new Date(league.deadline).getTime() - now) / 1000))
    : null;
  const [ranking, setRanking] = useState(my?.rankings.join(', ') || '');
  return (
    <>
      <PageTitle
        eyebrow="ONE ROUND. MAKE IT COUNT."
        title={league.status === 'COMPLETE' ? 'The picks are in.' : 'The draft room.'}
        text={
          league.status === 'COMPLETE'
            ? 'Your kicking position is locked for the season. Every replacement inherits automatically.'
            : 'Pick the franchise. The current kicker is just the beginning.'
        }
      />
      <div className="draft-banner">
        <div>
          <span className="eyebrow">{league.status}</span>
          <h2>
            {league.status === 'DRAFTING'
              ? `${current?.name} is on the clock`
              : league.status === 'COMPLETE'
                ? 'No trades. No take-backs.'
                : league.status === 'PAUSED'
                  ? 'The draft is paused'
                  : 'Waiting for the commissioner'}
          </h2>
        </div>
        <div className="clock">
          <Clock size={22} />
          {seconds === null ? '—' : `${seconds}s`}
          <small>
            PICK {Math.min(league.currentPick, league.teams.length)} / {league.teams.length}
          </small>
        </div>
      </div>
      {commissioner && (
        <section className="panel commissioner">
          <div className="section-heading">
            <h3>Commissioner controls</h3>
            <Shield size={18} />
          </div>
          <div className="button-row">
            {league.status === 'LOBBY' && (
              <>
                <button
                  disabled={busy || league.teams.length < 2}
                  onClick={() =>
                    run(() => api.post(`/leagues/${league.id}/draft/start`), 'Draft started')
                  }
                >
                  Start draft
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => api.post(`/leagues/${league.id}/draft/order`, { randomize: true }),
                      'Order randomized',
                    )
                  }
                >
                  Randomize order
                </button>
              </>
            )}
            {league.status === 'DRAFTING' && (
              <button
                className="secondary"
                onClick={() =>
                  run(() => api.post(`/leagues/${league.id}/draft/pause`), 'Draft paused')
                }
              >
                Pause draft
              </button>
            )}
            {league.status === 'PAUSED' && (
              <button
                onClick={() =>
                  run(() => api.post(`/leagues/${league.id}/draft/resume`), 'Draft resumed')
                }
              >
                Resume draft
              </button>
            )}
            <span className="invite">
              INVITE CODE <code>{league.inviteCode}</code>
              <button
                className="text-button"
                onClick={() =>
                  run(() => navigator.clipboard.writeText(league.inviteCode), 'Invite code copied')
                }
              >
                Copy
              </button>
            </span>
          </div>
          <form className="invite-form" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => api.post(`/leagues/${league.id}/invite`, { email: f.get('email') }), 'Invitation sent.'); e.currentTarget.reset(); }}>
            <Field label="Invite by email"><input name="email" type="email" placeholder="friend@example.com" required /></Field>
            <button className="secondary" disabled={busy}>Send invitation</button>
          </form>
          {league.status === 'LOBBY' && (
            <details>
              <summary>League settings, order, and members</summary>
              <form
                className="settings-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  run(
                    () =>
                      api.post(`/leagues/${league.id}/configure`, {
                        name: f.get('name'),
                        maxTeams: Number(f.get('maxTeams')),
                        pickSeconds: Number(f.get('pickSeconds')),
                        scheduledAt: f.get('scheduledAt')
                          ? new Date(String(f.get('scheduledAt'))).toISOString()
                          : null,
                      }),
                    'League settings saved',
                  );
                }}
              >
                <Field label="League name">
                  <input name="name" defaultValue={league.name} required />
                </Field>
                <Field label="Capacity">
                  <input
                    name="maxTeams"
                    type="number"
                    min={2}
                    max={32}
                    defaultValue={league.maxTeams}
                  />
                </Field>
                <Field label="Seconds per pick">
                  <input
                    name="pickSeconds"
                    type="number"
                    min={10}
                    max={300}
                    defaultValue={league.pickSeconds}
                  />
                </Field>
                <Field label="Draft time (your local time)">
                  <input name="scheduledAt" type="datetime-local" />
                </Field>
                <button disabled={busy}>Save settings</button>
              </form>
              <div className="draft-order">
                {[...league.teams]
                  .sort((a, b) => (a.draftOrder || 99) - (b.draftOrder || 99))
                  .map((t, i, arr) => (
                    <div key={t.id}>
                      <span>
                        {i + 1}. {t.name}
                      </span>
                      {i > 0 && (
                        <button
                          className="text-button"
                          onClick={() =>
                            run(() => {
                              const ids = arr.map((x) => x.id);
                              [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                              return api.post(`/leagues/${league.id}/draft/order`, {
                                teamIds: ids,
                              });
                            }, 'Order saved')
                          }
                        >
                          Move up
                        </button>
                      )}
                      {t.ownerId !== user.id && (
                        <button
                          className="text-button danger"
                          onClick={() =>
                            run(
                              () =>
                                api.post(`/leagues/${league.id}/remove-member`, { teamId: t.id }),
                              'Member removed',
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </details>
          )}
        </section>
      )}
      <div className="draft-layout">
        <section className="panel">
          <div className="section-heading">
            <h3>32 positions. One is yours.</h3>
            <input
              className="search"
              aria-label="Search franchises"
              placeholder="Search teams or kickers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {selected && (
            <div className="pick-confirm">
              <strong>Draft {selected} for the entire season?</strong>
              <button
                disabled={
                  busy ||
                  current?.ownerId !== user.id ||
                  league.status !== 'DRAFTING' ||
                  seconds === 0
                }
                onClick={() =>
                  run(async () => {
                    await api.post(`/leagues/${league.id}/pick`, { teamCode: selected });
                    setSelected('');
                  }, 'Your kicking position is locked in.')
                }
              >
                Confirm pick
              </button>
              <button className="secondary" onClick={() => setSelected('')}>
                Cancel
              </button>
            </div>
          )}
          <div className="franchise-grid">
            {nfl
              .filter((t) =>
                `${t.code} ${t.city} ${t.name} ${t.assignments.map((a) => a.player.name).join(' ')}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((t) => (
                <button
                  key={t.code}
                  className={`franchise-card ${taken.has(t.code) ? 'taken' : ''} ${selected === t.code ? 'selected' : ''}`}
                  disabled={
                    busy ||
                    taken.has(t.code) ||
                    current?.ownerId !== user.id ||
                    league.status !== 'DRAFTING' ||
                    seconds === 0
                  }
                  onClick={() => setSelected(t.code)}
                >
                  <span className="franchise-code">{t.code}</span>
                  <strong>{t.assignments[0]?.player.name || 'Kicker to be confirmed'}</strong>
                  <small>
                    {t.city} {t.name}
                  </small>
                  <span className="availability">
                    {taken.has(t.code) ? 'DRAFTED' : 'AVAILABLE'}
                  </span>
                </button>
              ))}
          </div>
        </section>
        <section className="panel">
          <h3>Draft board</h3>
          {[...league.teams]
            .sort((a, b) => (a.draftOrder || 99) - (b.draftOrder || 99))
            .map((t, i) => (
              <div
                className={`draft-slot ${current?.id === t.id && league.status === 'DRAFTING' ? 'on-clock' : ''}`}
                key={t.id}
              >
                <span>{t.draftOrder || i + 1}</span>
                <div>
                  <strong>{t.name}</strong>
                  <small>
                    {t.roster
                      ? `${t.roster.teamCode} · ${t.roster.source === 'AUTODRAFT' ? 'Automatic pick' : 'Picked'}`
                      : current?.id === t.id
                        ? 'On the clock'
                        : 'Awaiting pick'}
                  </small>
                </div>
                {t.roster && <Check size={17} />}
              </div>
            ))}
          {league.status === 'LOBBY' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () =>
                    api.post(`/leagues/${league.id}/rankings`, {
                      rankings: ranking
                        .split(',')
                        .map((x) => x.trim().toUpperCase())
                        .filter(Boolean),
                    }),
                  'Auto-pick preferences saved',
                );
              }}
            >
              <Field label="Your auto-pick rankings">
                <textarea
                  value={ranking}
                  onChange={(e) => setRanking(e.target.value)}
                  placeholder="BUF, DAL, KC…"
                />
              </Field>
              <p className="muted">
                Comma-separated franchise codes. If your clock runs out, we select your highest
                available preference, then alphabetical order.
              </p>
              <button className="secondary" disabled={busy}>
                Save rankings
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
function FeedStatus({season, week}: {season: number; week: number}) {
  const status = useQuery<any>({ queryKey: ['nfl-status', season, week], queryFn: () => api.request(`/nfl-status?season=${season}&week=${week}`), refetchInterval: 10000 });
  return <p role="status" style={{color: '#A7AFBB', fontSize: 13}}><strong style={{color: '#F5C451'}}>{status.isError || status.data?.stale ? 'Feed delayed' : status.data?.games.some((g: any) => g.state === 'in') ? '● LIVE' : 'Auto sync'}</strong> · {status.data?.checkedAt ? `Feed checked ${new Date(status.data.checkedAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}` : 'Waiting for feed status'} · Scores update automatically</p>;
}
function Nfl({ nfl, season, week, initialTeamCode }: { nfl: NflTeamView[]; season: number; week: number; initialTeamCode?: string }) {
  const [team, setTeam] = useState(initialTeamCode || 'BUF');
  useEffect(() => { if (initialTeamCode) setTeam(initialTeamCode); }, [initialTeamCode]);
  const scores = useQuery<any[]>({
    queryKey: ['scores', season, week],
    queryFn: () => api.request(`/scores?season=${season}&week=${week}`),
  });
  return (
    <>
      <PageTitle
        eyebrow="THE WHOLE FIELD"
        title="The whole field."
        text="Global NFL franchise scoring. The same events power every fantasy league."
      />
      <FeedStatus season={season} week={week} />
      <div className="nfl-grid">
        {nfl.map((t) => (
          <button
            className={`panel nfl-card ${team === t.code ? 'selected' : ''}`}
            key={t.code}
            onClick={() => setTeam(t.code)}
          >
            <span className="franchise-code">{t.code}</span>
            <div>
              <strong>
                {t.city} {t.name}
              </strong>
              {t.assignments[0]?.player.imageUrl && <img className="kicker-avatar" src={t.assignments[0].player.imageUrl} alt="" />}
              <small>{t.assignments[0]?.player.name || 'Kicker to be confirmed'}</small>
            </div>
            <b>{signed(scores.data?.find((s) => s.teamCode === t.code)?.points || 0)}</b>
          </button>
        ))}
      </div>
      <EventFeed season={season} week={week} teamCode={team} />
    </>
  );
}
function Admin({
  user,
  season,
  week,
  run,
  busy,
  nfl,
}: {
  user: UserView;
  season: number;
  week: number;
  run: Run;
  busy: boolean;
  nfl: NflTeamView[];
}) {
  const [tab, setTab] = useState('imports'),
    [csv, setCsv] = useState(''),
    [filename, setFilename] = useState('import.csv'),
    [mode, setMode] = useState('EVENT'),
    [reason, setReason] = useState(''),
    [preview, setPreview] = useState<any>(null),
    [team, setTeam] = useState('BUF'),
    [userReason, setUserReason] = useState(''),
    [rule, setRule] = useState({ ...defaultRules });
  const imports = useQuery<any[]>({
    queryKey: ['imports'],
    queryFn: () => api.request('/admin/imports'),
  });
  const audits = useQuery<any[]>({
    queryKey: ['audit'],
    queryFn: () => api.request('/admin/audit'),
    enabled: tab === 'audit',
  });
  const users = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.request('/admin/users'),
    enabled: tab === 'users',
  });
  const events = useQuery<any[]>({
    queryKey: ['admin-events', season, week, team],
    queryFn: () => api.request(`/events?season=${season}&week=${week}&teamCode=${team}`),
    enabled: tab === 'events',
  });
  const emailDeliveries = useQuery<any[]>({
    queryKey: ['email-deliveries'],
    queryFn: () => api.request('/admin/email-deliveries'),
    enabled: tab === 'email',
  });
  const legal = useQuery<any[]>({
    queryKey: ['legal-admin'],
    queryFn: () => api.request('/admin/legal'),
    enabled: tab === 'legal',
  });
  return (
    <>
      <PageTitle
        eyebrow="SUPER ADMIN · GLOBAL NFL DATA"
        title="The official word."
        text="Import once. Score every league. Every correction leaves a record."
      />
      <div className="tabs">
        {['imports', 'events', 'email', 'legal', 'audit', 'users', 'settings'].map((t) => (
          <button className={tab === t ? 'active' : 'secondary'} key={t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <Field label="Reason for this change (required)">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Official week 1 statistics, reviewed September 9"
          minLength={5}
          maxLength={500}
        />
      </Field>
      {tab === 'imports' && (
        <>
          <div className="two-col">
            <section className="panel">
              <h3>Import NFL scoring</h3>
              <Field label="Import format">
                <select
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setPreview(null);
                  }}
                >
                  <option value="EVENT">Individual kicking events</option>
                  <option value="SUMMARY">Team / week summary</option>
                </select>
              </Field>
              <Field label="Choose a CSV file">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      run(async () => {
                        if (f.size > 1500000) throw new Error('File must be under 1.5 MB');
                        setFilename(f.name);
                        setCsv(await f.text());
                        setPreview(null);
                      }, 'CSV loaded. Preview before importing.');
                  }}
                />
              </Field>
              <Field label="CSV contents">
                <textarea
                  className="csv-editor"
                  value={csv}
                  onChange={(e) => {
                    setCsv(e.target.value);
                    setPreview(null);
                  }}
                  placeholder={
                    mode === 'EVENT'
                      ? 'season,week,nfl_team,kicker,event_type,distance,result\n2026,1,BUF,Example kicker,FIELD_GOAL,27,MISSED'
                      : 'season,week,nfl_team,fg_miss_under_30,fg_miss_30_plus,xp_miss_block,fg_made_over_50\n2026,1,BUF,1,0,1,0'
                  }
                />
              </Field>
              <button
                disabled={busy || reason.trim().length < 5 || !csv}
                onClick={() =>
                  run(
                    async () =>
                      setPreview(
                        await api.post('/admin/imports/preview', { csv, filename, mode, reason }),
                      ),
                    'Preview ready. Review before confirming.',
                  )
                }
              >
                <Upload size={16} />
                Validate and preview
              </button>
              <p className="muted">
                For event corrections, include a stable <code>event_id</code> column. Without IDs,
                an import replaces the complete team/week. Summary imports always replace the
                team/week.
              </p>
            </section>
            <section className="panel">
              <h3>Scoring preview</h3>
              {preview ? (
                <>
                  <p>
                    {preview.filename} · {preview.preview.validRows} normalized events
                  </p>
                  {preview.preview.errors.map((s: string, i: number) => (
                    <p className="error" key={i}>
                      {s}
                    </p>
                  ))}
                  {preview.preview.warnings.map((s: string, i: number) => (
                    <p className="warning" key={i}>
                      {s}
                    </p>
                  ))}
                  {preview.preview.totals.map((t: any) => (
                    <div className="scoring-rule" key={`${t.season}-${t.week}-${t.teamCode}`}>
                      <span>
                        {t.teamCode} · {t.season} Week {t.week}
                      </span>
                      <b>{signed(t.points)}</b>
                    </div>
                  ))}
                  <button
                    disabled={
                      busy || preview.status !== 'PREVIEW' || preview.preview.errors.length > 0
                    }
                    onClick={() =>
                      run(async () => {
                        const b = await api.post(`/admin/imports/${preview.id}/confirm`);
                        setPreview({ ...preview, status: b.status });
                      }, 'Import queued. Watch its status below; scoring updates automatically.')
                    }
                  >
                    Confirm global import
                  </button>
                </>
              ) : (
                <p className="empty-inline">
                  Choose a file to see matching results, validation messages, and calculated points.
                </p>
              )}
            </section>
          </div>
          <section className="panel">
            <h3>Import history</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th>Imported</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.data?.map((i) => (
                    <tr key={i.id}>
                      <td>{i.filename}</td>
                      <td>{i.mode}</td>
                      <td>
                        <span className="pill">{i.status}</span>
                      </td>
                      <td>{new Date(i.createdAt).toLocaleString()}</td>
                      <td>
                        {i.error}
                        <button
                          className="text-button"
                          onClick={() =>
                            run(
                              async () => setPreview(await api.request(`/admin/imports/${i.id}`)),
                              'Import loaded',
                            )
                          }
                        >
                          Inspect
                        </button>
                        {i.status === 'FAILED' && (
                          <button
                            className="text-button"
                            onClick={() =>
                              run(() => api.post(`/admin/imports/${i.id}/confirm`), 'Retry queued')
                            }
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {tab === 'events' && (
        <>
          <section className="panel">
            <div className="section-heading">
              <h3>
                {season} · Week {week}
              </h3>
              <select
                aria-label="NFL franchise for corrections"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              >
                {nfl.map((t) => (
                  <option key={t.code}>{t.code}</option>
                ))}
              </select>
            </div>
            <div className="button-row">
              {['recalculate', 'lock', 'unlock'].map((action) => (
                <button
                  key={action}
                  disabled={busy || reason.trim().length < 5}
                  className="secondary"
                  onClick={() =>
                    run(
                      () => api.post(`/admin/weeks/${action}`, { season, week, reason }),
                      `Week ${action} completed`,
                    )
                  }
                >
                  {action === 'lock' ? (
                    <Lock size={16} />
                  ) : action === 'unlock' ? (
                    <Unlock size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}{' '}
                  {action} entire week
                </button>
              ))}
            </div>
            <p className="muted">
              Recalculation is global and updates every league. Unlock a week before correcting its
              events.
            </p>
            {events.data?.map((e) => (
              <form
                key={e.id}
                className="event-edit"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  const f = new FormData(ev.currentTarget);
                  run(
                    () =>
                      api.post(`/admin/events/${e.id}`, {
                        reason,
                        result: f.get('result'),
                        distance: e.eventType === 'EXTRA_POINT' ? null : Number(f.get('distance')),
                        kicker: f.get('kicker'),
                      }),
                    'Correction saved and scores recalculated',
                  );
                }}
              >
                <Field label={e.eventType}>
                  <input name="kicker" defaultValue={e.kicker} required />
                </Field>
                <Field label="Result">
                  <select name="result" defaultValue={e.result}>
                    {['MADE', 'MISSED', 'BLOCKED', 'FAILED', 'UNKNOWN'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                {e.eventType === 'FIELD_GOAL' && (
                  <Field label="Yards">
                    <input
                      name="distance"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={e.distance}
                      required
                    />
                  </Field>
                )}
                <button disabled={busy || reason.length < 5} className="secondary">
                  Save
                </button>
                <button
                  type="button"
                  className="text-button danger"
                  disabled={busy || reason.length < 5}
                  onClick={() =>
                    run(
                      () => api.post(`/admin/events/${e.id}`, { reason, voided: !e.voidedAt }),
                      e.voidedAt ? 'Event restored' : 'Event voided',
                    )
                  }
                >
                  {e.voidedAt ? 'Restore' : 'Void'}
                </button>
              </form>
            ))}
            <details>
              <summary>Add a missing event</summary>
              <form
                className="settings-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  run(
                    () =>
                      api.post('/admin/events', {
                        reason,
                        event: {
                          season,
                          week,
                          teamCode: team,
                          kicker: f.get('kicker'),
                          eventType: f.get('eventType'),
                          result: f.get('result'),
                          distance:
                            f.get('eventType') === 'EXTRA_POINT' ? null : Number(f.get('distance')),
                          providerEventId: f.get('eventId'),
                        },
                      }),
                    'Event added',
                  );
                }}
              >
                <Field label="Unique event ID">
                  <input name="eventId" required />
                </Field>
                <Field label="Kicker">
                  <input name="kicker" required />
                </Field>
                <Field label="Kick type">
                  <select name="eventType">
                    <option>FIELD_GOAL</option>
                    <option>EXTRA_POINT</option>
                  </select>
                </Field>
                <Field label="Result">
                  <select name="result">
                    <option>MISSED</option>
                    <option>BLOCKED</option>
                    <option>MADE</option>
                    <option>FAILED</option>
                  </select>
                </Field>
                <Field label="Field goal distance">
                  <input name="distance" type="number" min={1} max={100} defaultValue={29} />
                </Field>
                <button disabled={busy || reason.length < 5}>Add event</button>
              </form>
            </details>
          </section>
        </>
      )}
      {tab === 'audit' && (
        <section className="panel">
          <h3>Immutable audit history</h3>
          {audits.data?.map((a) => (
            <details className="audit-item" key={a.id}>
              <summary>
                <strong>{a.action.replaceAll('_', ' ')}</strong>
                <span>{new Date(a.createdAt).toLocaleString()}</span>
              </summary>
              <p>{a.reason}</p>
              <small>
                Actor: {a.actorId} · Entity: {a.entityId}
              </small>
              <div className="two-col">
                <pre>{JSON.stringify(a.before, null, 2) || 'No previous value'}</pre>
                <pre>{JSON.stringify(a.after, null, 2) || 'No new value'}</pre>
              </div>
            </details>
          ))}
        </section>
      )}
      {tab === 'email' && (
        <section className="panel">
          <div className="section-heading"><h3>Email delivery</h3><span className="muted">Last 100 messages</span></div>
          {emailDeliveries.data?.map((mail) => {
            const payload = mail.payload || {};
            return <div className="notification" key={mail.id}><MailStatus deliveredAt={mail.deliveredAt} attempts={mail.attempts} error={mail.lastError} /><div><strong>{payload.subject || 'Transactional email'}</strong><p>{payload.to} · {mail.deliveredAt ? `Delivered ${new Date(mail.deliveredAt).toLocaleString()}` : 'Pending delivery'}</p>{mail.lastError && <small>{mail.lastError}</small>}</div></div>;
          })}
          {!emailDeliveries.data?.length && <p className="empty-inline">No email deliveries yet.</p>}
        </section>
      )}
      {tab === 'legal' && (
        <section className="panel">
          <div className="section-heading"><h3>Public legal pages</h3><span className="muted">Changes are audited</span></div>
          <p className="muted">Edit the Privacy Policy and Terms of Service shown at <a href="/privacy" target="_blank">/privacy</a> and <a href="/terms" target="_blank">/terms</a>.</p>
          {legal.data?.map((doc) => (
            <form className="legal-admin-form" key={doc.key} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => api.post(`/admin/legal/${doc.key}`, { title: f.get('title'), content: f.get('content'), reason }), `${doc.title} updated`); }}>
              <h4>{doc.key === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h4>
              <Field label="Page title"><input name="title" defaultValue={doc.title} maxLength={120} required /></Field>
              <Field label="Content (plain text with # headings)"><textarea className="legal-editor" name="content" defaultValue={doc.content} minLength={100} maxLength={100000} required /></Field>
              <button disabled={busy || reason.length < 5}>Save {doc.key}</button>
            </form>
          ))}
        </section>
      )}
      {tab === 'users' && (
        <section className="panel">
          <h3>Platform accounts</h3>
          <Field label="Reason for account change (required)">
            <input value={userReason} onChange={(e) => setUserReason(e.target.value)} placeholder="e.g. Assigning the correct team owner" minLength={5} maxLength={500} />
          </Field>
          {users.data?.map((u) => (
            <div className="notification" key={u.id}>
              <div>
                <strong>{u.displayName}</strong>
                <p>
                  {u.email} · {u.role}
                </p>
                {u.teams?.length ? <div className="admin-user-teams">{u.teams.map((team: any) => <span key={`${team.leagueName}-${team.name}`}><strong>{team.name}</strong>{team.teamCode ? ` · ${team.teamCode}` : ''} · {team.leagueName}</span>)}</div> : <small className="muted">No fantasy team assigned</small>}
                <form className="inline-email-form" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => api.post(`/admin/users/${u.id}/email`, { email: f.get('email'), reason: userReason }), 'Email address updated'); }}>
                  <input name="email" type="email" defaultValue={u.email} aria-label={`Email for ${u.displayName}`} required />
                  <button className="secondary" disabled={busy || userReason.trim().length < 5}>Save email</button>
                </form>
                <button className="secondary admin-role-button" disabled={busy || userReason.trim().length < 5 || u.id === user.id} onClick={() => run(() => api.post(`/admin/users/${u.id}/role`, { role: u.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN', reason: userReason }), u.role === 'SUPER_ADMIN' ? 'Super Admin access removed' : 'Super Admin access granted')}>
                  {u.role === 'SUPER_ADMIN' ? 'Remove Super Admin' : 'Make Super Admin'}
                </button>
              </div>
              {u.role !== 'SUPER_ADMIN' && (
                <button
                  className="secondary"
                  disabled={busy || userReason.trim().length < 5}
                  onClick={() =>
                    run(
                      () => api.post(`/admin/users/${u.id}`, { suspended: !u.suspended, reason: userReason }),
                      'Account status updated',
                    )
                  }
                >
                  {u.suspended ? 'Reactivate' : 'Suspend'}
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {tab === 'settings' && (
        <div className="two-col">
          <section className="panel">
            <h3>Current kickers</h3>
            <p>Informational assignments. Fantasy teams always own the NFL franchise.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                run(
                  () =>
                    api.post('/admin/assignments', {
                      teamCode: f.get('teamCode'),
                      playerName: f.get('playerName'),
                      imageUrl: f.get('imageUrl') || null,
                      designation: f.get('designation'),
                      reason,
                    }),
                  'Kicker assignment updated',
                );
              }}
            >
              <Field label="NFL team">
                <select name="teamCode">
                  {nfl.map((t) => (
                    <option key={t.code}>{t.code}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kicker name">
                <input name="playerName" minLength={2} required />
              </Field>
              <Field label="Headshot URL (optional)">
                <input name="imageUrl" type="url" placeholder="https://…" />
              </Field>
              <Field label="Designation">
                <select name="designation">
                  <option>PRIMARY_KICKER</option>
                  <option>BACKUP_KICKER</option>
                </select>
              </Field>
              <button disabled={busy || reason.length < 5}>Save assignment</button>
            </form>
          </section>
          <section className="panel">
            <h3>New season</h3>
            <p>
              Each season gets an immutable scoring version. Historical seasons keep their original
              rules.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const year = Number(f.get('year'));
                run(
                  () =>
                    api.post('/admin/seasons', {
                      year,
                      reason,
                      rule: { ...defaultRules, code: `AING-${year}-V1` },
                    }),
                  'Season created with default scoring rules',
                );
              }}
            >
              <Field label="Season year">
                <input name="year" type="number" min={2000} max={2100} defaultValue={season + 1} />
              </Field>
              <button disabled={busy || reason.length < 5}>
                Create season with standard rules
              </button>
            </form>
            <h3>Override scoring · {season}</h3>
            <p>Use this only when an official correction requires recalculating existing scores.</p>
            <form
              className="scoring-editor"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  async () => api.post(`/admin/scoring/${season}`, { ...rule, reason }),
                  `Scoring updated for ${season}`,
                );
              }}
            >
              {(['shortMiss', 'longMiss', 'xpMiss', 'xpBlocked', 'longMade', 'shortMax', 'longMadeMin'] as const).map((key) => (
                <Field key={key} label={key}>
                  <input type="number" value={rule[key]} onChange={(e) => setRule({ ...rule, [key]: Number(e.target.value) })} />
                </Field>
              ))}
              <button disabled={busy || reason.trim().length < 5}>Save and recalculate</button>
            </form>
            <h3>nflverse sync</h3>
            <p>
              Uses the server-configured HTTPS provider URL. Review the preview before confirming.
            </p>
            <button
              className="secondary"
              disabled={busy || reason.length < 5}
              onClick={() =>
                run(async () => {
                  setPreview(await api.post('/admin/nflverse/sync', { season, week, reason }));
                  setTab('imports');
                }, 'Provider preview loaded')
              }
            >
              Preview week {week} from nflverse
            </button>
          </section>
        </div>
      )}
    </>
  );
}
function MailStatus({ deliveredAt, attempts, error }: { deliveredAt?: string | null; attempts: number; error?: string | null }) {
  return <span className={`mail-status ${deliveredAt ? 'sent' : error ? 'failed' : 'pending'}`}>{deliveredAt ? 'SENT' : error ? 'FAILED' : attempts ? 'RETRYING' : 'QUEUED'}</span>;
}

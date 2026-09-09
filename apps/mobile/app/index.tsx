import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  ApiClient,
  LeagueView,
  UserView,
  NflTeamView,
  FantasyTeamView,
} from '../../../packages/core/src';
const base = process.env.EXPO_PUBLIC_API_URL || 'https://anditsnogood.ddev.site/api';
let access: string | null = null;
const api = new ApiClient(base, () => access);
const pts = (n: number) => (n > 0 ? `+${n}` : String(n));
const destinations = ['clubhouse', 'draft', 'standings', 'inbox'];
const tabIcons: Record<string, any> = {
  clubhouse: require('../assets/tab-clubhouse.png'),
  draft: require('../assets/tab-draft.png'),
  standings: require('../assets/tab-standings.png'),
  inbox: require('../assets/tab-inbox.png'),
};
function SelectionMenu({ label, value, options, onSelect }: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.name || 'Select'}`}
        accessibilityHint={`Opens ${label.toLowerCase()} options`}
        accessibilityState={{ expanded: open }}
        style={s.menuTrigger}
        onPress={() => setOpen(true)}
      >
        <Text numberOfLines={1} ellipsizeMode="tail" style={s.menuValue}>{selected?.name || 'Select'}</Text>
        <View accessible={false} style={s.menuGlyph}>
          <View style={s.menuGlyphLine} />
          <View style={[s.menuGlyphLine, s.menuGlyphLineShort]} />
          <View style={s.menuGlyphLine} />
        </View>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.root}>
          <View style={s.menuHeader}>
            <Text accessibilityRole="header" style={s.title}>{label}</Text>
            <Button title="Close" secondary onPress={() => setOpen(false)} />
          </View>
          <ScrollView contentContainerStyle={s.content}>
            {options.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: option.id === value }}
                style={[s.menuOption, option.id === value && s.menuOptionSelected]}
                onPress={() => { onSelect(option.id); setOpen(false); }}
              >
                <Text style={s.menuValue}>{option.name}</Text>
                {option.id === value && <Text style={s.menuIcon}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const Button = ({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[s.button, secondary && s.secondary, disabled && { opacity: 0.4 }]}
  >
    <Text style={[s.buttonText, secondary && { color: '#F2F4F7' }]}>{title}</Text>
  </Pressable>
);
const Input = ({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) => (
  <View style={{ marginVertical: 8 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor="#8E959F"
      style={s.input}
      {...props}
    />
  </View>
);
export default function Mobile() {
  const qc = useQueryClient();
  const [user, setUser] = useState<UserView | null>(null),
    [boot, setBoot] = useState(true),
    [busy, setBusy] = useState(false),
    [connectionIssue, setConnectionIssue] = useState<string | null>(null),
    [screen, setScreen] = useState('clubhouse'),
    [leagueId, setLeagueId] = useState(''),
    [week, setWeek] = useState(1),
    [register, setRegister] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [leagueName, setLeagueName] = useState(''),
    [teamName, setTeamName] = useState(''),
    [teamNameEdit, setTeamNameEdit] = useState(''),
    [deletePassword, setDeletePassword] = useState(''),
    [capacity, setCapacity] = useState('12'),
    [invite, setInvite] = useState(''),
    [rankings, setRankings] = useState('');
  async function remember(data: any) {
    access = data.accessToken;
    await SecureStore.setItemAsync('aing-refresh', data.refreshToken);
    setUser(data.user);
    setConnectionIssue(null);
  }
  function isAuthFailure(error: unknown) {
    return (error as { status?: number })?.status === 401 || (error as { status?: number })?.status === 403;
  }
  async function refresh() {
    const token = await SecureStore.getItemAsync('aing-refresh');
    if (token) await remember(await api.post('/auth/refresh', { refreshToken: token }));
  }
  useEffect(() => {
    refresh()
      .catch((error) => {
        if (isAuthFailure(error)) {
          access = null;
          return SecureStore.deleteItemAsync('aing-refresh');
        }
        setConnectionIssue('We could not reach the league server. Your session is safe.');
        return undefined;
      })
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(
      () =>
        refresh().catch((error) => {
          if (!isAuthFailure(error)) {
            setConnectionIssue('Connection interrupted. We will keep trying.');
            return;
          }
          access = null;
          setUser(null);
        }),
      12 * 60 * 1000,
    );
    return () => clearInterval(t);
  }, [user?.id]);
  const leagues = useQuery<LeagueView[]>({
    queryKey: ['leagues'],
    queryFn: () => api.request('/leagues'),
    enabled: !!user,
  });
  const seasons = useQuery<any[]>({
    queryKey: ['seasons'],
    queryFn: () => api.request('/seasons'),
  });
  const league = leagues.data?.find((l) => l.id === leagueId) || leagues.data?.[0];
  const season = league?.season || seasons.data?.[0]?.year || 2026;
  const nfl = useQuery<NflTeamView[]>({
    queryKey: ['nfl'],
    queryFn: () => api.request('/nfl-teams'),
    enabled: !!user,
  });
  const standing = useQuery<FantasyTeamView[]>({
    queryKey: ['standing', league?.id, week],
    queryFn: () => api.request(`/leagues/${league!.id}/standings?week=${week}`),
    enabled: !!league,
  });
  const my = standing.data?.find((t) => t.ownerId === user?.id);
  useEffect(() => {
    setTeamNameEdit(my?.name || '');
  }, [my?.id]);
  const events = useQuery<any[]>({
    queryKey: ['events', season, week, my?.roster?.teamCode],
    queryFn: () =>
      api.request(`/events?season=${season}&week=${week}&teamCode=${my!.roster!.teamCode}`),
    enabled: !!my?.roster,
  });
  const notifications = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: () => api.request('/notifications'),
    enabled: !!user,
  });
  useEffect(() => {
    if (!user) return;
    const sock = io(process.env.EXPO_PUBLIC_SOCKET_URL || base.replace(/\/api$/, ''), {
      auth: (cb) => cb({ token: access }),
    });
    sock.on('ready', () => {
      if (league) sock.emit('league.join', { leagueId: league.id });
    });
    sock.on('draft.updated', () => qc.invalidateQueries());
    sock.on('scores.updated', () => qc.invalidateQueries());
    return () => {
      sock.disconnect();
    };
  }, [user?.id, league?.id]);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries();
    } catch (e) {
      Alert.alert('Could not complete action', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function push() {
    if (!Device.isDevice) throw new Error('Push notifications require a physical device.');
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (!projectId)
      throw new Error('Set EXPO_PUBLIC_EAS_PROJECT_ID in the mobile build before enabling push.');
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Scoring',
        importance: Notifications.AndroidImportance.HIGH,
      });
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted')
      throw new Error('Notification permission was not granted.');
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.post('/push-devices', { token });
    Alert.alert('Notifications enabled');
  }
  if (boot)
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator color="#F5C451" />
      </SafeAreaView>
    );
  if (!user)
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Image source={require('../assets/icon.png')} style={s.brandIcon} />
          <Text style={s.logo}>And it’s no good.</Text>
          <Text style={s.hero}>Great season.{`\n`}Terrible kicks.</Text>
          <Text style={s.sub}>One draft. One kicking position. Every miss matters.</Text>
          {connectionIssue && (
            <View style={s.offlineNotice}>
              <Text style={s.text}>{connectionIssue}</Text>
              <Button title="Try again" onPress={() => { setBoot(true); refresh().catch((error) => { if (isAuthFailure(error)) SecureStore.deleteItemAsync('aing-refresh'); else setConnectionIssue('Still offline. Try again when the server is reachable.'); }).finally(() => setBoot(false)); }} />
            </View>
          )}
          {register && <Input label="Display name" value={name} onChangeText={setName} />}
          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={register ? 'new-password' : 'current-password'}
          />
          <Button
            title={register ? 'Create account' : 'Sign in'}
            disabled={busy}
            onPress={() =>
              run(async () => {
                await remember(
                  await api.post(`/auth/${register ? 'register' : 'login'}`, {
                    email,
                    password,
                    displayName: name,
                  }),
                );
              })
            }
          />
          <Button
            title={register ? 'Already have an account? Sign in' : 'Create an account'}
            secondary
            onPress={() => setRegister(!register)}
          />
          <Button
            title="Email me a password reset link"
            secondary
            onPress={() =>
              run(async () => {
                await api.post('/auth/forgot-password', { email });
                Alert.alert(
                  'Check your email',
                  'If this account exists, a reset link has been sent.',
                );
              })
            }
          />
        </ScrollView>
      </SafeAreaView>
    );
  const current = league?.teams.find((t) => t.draftOrder === league.currentPick),
    taken = new Set(league?.teams.map((t) => t.roster?.teamCode));
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Image source={require('../assets/icon.png')} style={s.brandIcon} />
        <View style={{ flex: 1 }}>
          <Text style={s.logo}>AND IT’S NO GOOD</Text>
        </View>
        <Text style={s.edition}>{season}</Text>
      </View>
      <View style={s.navigation}>
          <SelectionMenu label="Your leagues" value={league?.id || ''}
            options={[...(leagues.data || []).map((l) => ({ id: l.id, name: l.name })), { id: '__manage', name: '+ Create or join a league' }]}
            onSelect={(id) => { if (id === '__manage') setScreen('leagues'); else setLeagueId(id); }} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {connectionIssue && <Pressable accessibilityRole="button" onPress={() => setConnectionIssue(null)} style={s.connectionNotice}><Text style={s.sub}>{connectionIssue}</Text><Text style={s.noticeDismiss}>Dismiss</Text></Pressable>}
        <View style={s.weekBar}>
          <Text style={s.weekTitle}>WEEK {String(week).padStart(2, '0')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous week" disabled={week <= 1} onPress={() => setWeek(week - 1)} style={[s.weekArrow, week <= 1 && { opacity: .25 }]}><Text style={s.arrow}>‹</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next week" disabled={week >= 22} onPress={() => setWeek(week + 1)} style={[s.weekArrow, week >= 22 && { opacity: .25 }]}><Text style={s.arrow}>›</Text></Pressable>
          </View>
        </View>
        {!user.verifiedAt && (
          <View style={s.card}>
            <Text style={s.text}>Verify your email to join or create leagues.</Text>
            <Button
              title="Resend verification"
              onPress={() => run(() => api.post('/auth/resend-verification'))}
            />
            <Button
              title="I verified my email"
              secondary
              onPress={() => run(async () => setUser(await api.request('/auth/me')))}
            />
          </View>
        )}
        {screen === 'clubhouse' && (
          <>
            <View style={s.scoreCard}>
              <View style={s.sectionHeading}>
                <Text style={s.scoreLabel}>YOUR WEEK</Text>
                <Text style={s.statusTag}>{league?.status === 'COMPLETE' ? 'ROSTER LOCKED' : league?.status === 'DRAFTING' ? 'DRAFT IN PROGRESS' : 'AWAITING DRAFT'}</Text>
              </View>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={s.score}>{standing.isError ? '—' : pts(my?.weeklyPoints || 0)}</Text>
                  <Text style={s.scoreLabel}>FANTASY POINTS</Text>
                </View>
                <View style={s.seasonMetric}>
                  <Text style={s.scoreLabel}>LEAGUE RANK</Text>
                  <Text style={s.seasonScore}>{my?.rank ? `#${my.rank}` : '—'}<Text style={s.rankOf}> / {league?.teams.length || '—'}</Text></Text>
                  <Text style={s.scoreLabel}>SEASON {pts(my?.totalPoints || 0)}</Text>
                </View>
              </View>
            </View>
            <View style={s.teamStrip}>
              <View style={s.franchiseBadge}><Text style={s.franchiseCode}>{my?.roster?.teamCode || '—'}</Text></View>
              <View style={{ flex: 1 }}><Text style={s.teamName}>{my?.name || 'No team yet'}</Text><Text style={s.sub}>{my?.roster ? 'Your kicking franchise · Locked for the season' : 'Choose your franchise in the draft'}</Text></View>
            </View>
            {!my?.roster && <Button title={league ? 'Go to draft' : 'Create or join a league'} onPress={() => setScreen(league ? 'draft' : 'leagues')} />}
            <View style={s.sectionHeading}><Text style={s.title}>Kick feed</Text><Text style={s.label}>{events.data?.length || 0} EVENTS</Text></View>
            {events.data?.length ? (
              events.data.map((e) => (
                <View style={s.ledgerRow} key={e.id}>
                  <View style={{ flex: 1 }}>
                  <Text style={s.eventTitle}>{e.result === 'MISSED' ? 'Missed' : e.result === 'MADE' ? 'Made' : e.result} {e.eventType === 'EXTRA_POINT' ? 'extra point' : `${e.distance ? `${e.distance}-yard ` : ''}field goal`}</Text>
                  <Text style={s.sub}>
                    {e.kicker}
                  </Text>
                  </View>
                  <Text style={s.points}>{e.voidedAt ? 'VOID' : pts(e.points)}</Text>
                </View>
              ))
            ) : (
              <View style={s.emptyFeed}><Text style={s.text}>Nothing through the uprights. Yet.</Text><Text style={s.sub}>Scored kicks will appear here for week {week}.</Text></View>
            )}
            <Pressable accessibilityRole="button" onPress={() => setScreen('standings')} style={s.standingsLink}><Text style={s.text}>See the full standings</Text><Text style={s.menuIcon}>→</Text></Pressable>
          </>
        )}
        {screen === 'leagues' && (
          <>
            <Text style={s.title}>Create a league</Text>
            <Input label="League name" value={leagueName} onChangeText={setLeagueName} />
            <Input label="Your team name" value={teamName} onChangeText={setTeamName} />
            <Input
              label="Capacity (2–32)"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
            />
            <Button
              title="Create league"
              disabled={busy || !user.verifiedAt}
              onPress={() =>
                run(async () => {
                  const l = await api.post('/leagues', {
                    name: leagueName,
                    teamName,
                    maxTeams: Number(capacity),
                    season: seasons.data?.[0]?.year || 2026,
                  });
                  setLeagueId(l.id);
                  setScreen('draft');
                })
              }
            />
            <Text style={s.title}>Join a league</Text>
            <Input
              label="Invite code"
              value={invite}
              onChangeText={setInvite}
              autoCapitalize="none"
            />
            <Button
              title="Join with the team name above"
              disabled={busy || !user.verifiedAt}
              onPress={() =>
                run(async () => {
                  const l = await api.post('/leagues/join', { inviteCode: invite, teamName });
                  setLeagueId(l.id);
                  setScreen('draft');
                })
              }
            />
          </>
        )}
        {screen === 'draft' &&
          (league ? (
            <>
              <Text style={s.title}>
                {league.status === 'COMPLETE'
                  ? 'Your pick is locked.'
                  : `${current?.name || 'Waiting for commissioner'}`}
              </Text>
              <Text style={s.sub}>
                {league.status} ·{' '}
                {league.deadline
                  ? `Pick ends ${new Date(league.deadline).toLocaleTimeString()}`
                  : 'One round only'}
              </Text>
              <Text selectable style={s.text}>
                Invite: {league.inviteCode}
              </Text>
              {league.commissionerId === user.id && (
                <View style={s.card}>
                  {league.status === 'LOBBY' && (
                    <>
                      <Button
                        title="Randomize order"
                        disabled={busy}
                        onPress={() =>
                          run(() =>
                            api.post(`/leagues/${league.id}/draft/order`, { randomize: true }),
                          )
                        }
                      />
                      <Button
                        title="Start draft"
                        disabled={busy || league.teams.length < 2}
                        onPress={() => run(() => api.post(`/leagues/${league.id}/draft/start`))}
                      />
                    </>
                  )}
                  {league.status === 'DRAFTING' && (
                    <Button
                      title="Pause"
                      onPress={() => run(() => api.post(`/leagues/${league.id}/draft/pause`))}
                    />
                  )}{' '}
                  {league.status === 'PAUSED' && (
                    <Button
                      title="Resume"
                      onPress={() => run(() => api.post(`/leagues/${league.id}/draft/resume`))}
                    />
                  )}
                </View>
              )}
              {league.status === 'LOBBY' && (
                <>
                  <Input
                    label="Auto-pick rankings (e.g. BUF, DAL, KC)"
                    value={rankings}
                    onChangeText={setRankings}
                  />
                  <Button
                    title="Save rankings"
                    onPress={() =>
                      run(() =>
                        api.post(`/leagues/${league.id}/rankings`, {
                          rankings: rankings
                            .split(',')
                            .map((v) => v.trim().toUpperCase())
                            .filter(Boolean),
                        }),
                      )
                    }
                  />
                </>
              )}
              {league.teams.map((t) => (
                <View style={s.line} key={t.id}>
                  <Text style={s.text}>
                    {t.draftOrder || '—'}. {t.name}
                  </Text>
                  <Text style={s.points}>{t.roster?.teamCode || '—'}</Text>
                </View>
              ))}
              {nfl.data?.map((t) => (
                <View style={s.card} key={t.code}>
                  {t.assignments[0]?.player.imageUrl && <Image source={{ uri: t.assignments[0].player.imageUrl }} style={s.kickerAvatar} />}
                  <Text style={s.title}>
                    {t.code} · {t.name}
                  </Text>
                  <Text style={s.sub}>
                    {t.assignments[0]?.player.name || 'Current kicker to be confirmed'}
                  </Text>
                  <Button
                    title={taken.has(t.code) ? 'Drafted' : `Draft ${t.code}`}
                    disabled={
                      busy ||
                      taken.has(t.code) ||
                      league.status !== 'DRAFTING' ||
                      current?.ownerId !== user.id
                    }
                    onPress={() =>
                      Alert.alert(
                        `Draft ${t.code}?`,
                        'This kicking position is yours for the season.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Confirm',
                            onPress: () =>
                              run(() =>
                                api.post(`/leagues/${league.id}/pick`, { teamCode: t.code }),
                              ),
                          },
                        ],
                      )
                    }
                  />
                </View>
              ))}
            </>
          ) : (
            <Text style={s.text}>Create or join a league to draft.</Text>
          ))}
        {screen === 'standings' && (
          <>
            <View style={s.pageHeading}><Text style={s.label}>STANDINGS</Text><Text style={s.hero}>The pecking order.</Text></View>
            {standing.data?.map((t) => (
              <View style={s.ledgerRow} key={t.id}>
                <Text style={s.rank}>{t.rank == null ? '—' : String(t.rank).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  {t.name}
                </Text>
                <Text style={s.sub}>
                  {t.roster?.teamCode || 'Not drafted'} · Week {pts(t.weeklyPoints || 0)}
                </Text>
                </View>
                <Text style={s.points}>{pts(t.totalPoints || 0)}</Text>
              </View>
            ))}
          </>
        )}
        {screen === 'inbox' && (
          <>
            <View style={s.settingsHeader}><Text style={s.label}>ACCOUNT</Text><Text style={s.title}>Your profile</Text></View>
            <View style={s.profileRow}><View style={s.avatar}><Text style={s.avatarText}>{user.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={s.text}>{user.displayName}</Text><Text style={s.sub}>{user.email}</Text></View></View>
            <Text style={s.sub}>{user.verifiedAt ? 'Email verified' : 'Email verification required for league actions'}</Text>
            {league && my && <>
              <Input label="Team name" value={teamNameEdit} onChangeText={setTeamNameEdit} maxLength={60} />
              <Button title="Save team name" disabled={busy || teamNameEdit.trim().length < 2 || teamNameEdit.trim() === my.name} onPress={() => run(async () => {
                await api.post(`/leagues/${league.id}/team-name`, { name: teamNameEdit.trim() });
                await qc.invalidateQueries({ queryKey: ['standing', league.id] });
              })} />
              <Text style={s.sub}>You can change this whenever you want. Your draft and roster stay the same.</Text>
            </>}
            <Button title="Enable device push notifications" secondary onPress={() => run(push)} />
            <Button
              title={
                user.notificationsEnabled
                  ? 'Turn scoring notifications off'
                  : 'Turn scoring notifications on'
              }
              secondary
              onPress={() =>
                run(async () => {
                  await api.post('/profile', { notificationsEnabled: !user.notificationsEnabled });
                  setUser({ ...user, notificationsEnabled: !user.notificationsEnabled });
                })
              }
            />
            {notifications.data?.map((n) => (
              <View style={s.card} key={n.id}>
                <Text style={s.title}>{n.title}</Text>
                <Text style={s.text}>{n.body}</Text>
                {!n.readAt && (
                  <Button
                    title="Mark read"
                    secondary
                    onPress={() => run(() => api.post(`/notifications/${n.id}/read`))}
                  />
                )}
              </View>
            ))}
            <View style={s.dangerZone}>
              <Text style={s.label}>ACCOUNT DATA</Text>
              <Text style={s.sub}>Delete your account and anonymize your profile. League scoring history is retained without your identity.</Text>
              <Input label="Password to confirm deletion" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry autoComplete="current-password" />
              <Button title="Delete account permanently" secondary disabled={busy || deletePassword.length < 12} onPress={() => Alert.alert('Delete account?', 'This cannot be undone. Your profile will be anonymized and your sessions revoked.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete account', style: 'destructive', onPress: () => run(async () => { await api.post('/account/delete', { password: deletePassword }); await SecureStore.deleteItemAsync('aing-refresh'); access = null; setUser(null); qc.clear(); }) }])} />
            </View>
          </>
        )}
        {screen === 'inbox' && <Button
          title="Sign out"
          secondary
          onPress={() =>
            run(async () => {
              const refreshToken = await SecureStore.getItemAsync('aing-refresh');
              await api.post('/auth/logout', { refreshToken });
              await SecureStore.deleteItemAsync('aing-refresh');
              access = null;
              setUser(null);
              qc.clear();
            })
          }
        />}
      </ScrollView>
      <View style={s.bottomNav}>
        {destinations.map((id) => (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: screen === id }} accessibilityLabel={id[0].toUpperCase() + id.slice(1)} onPress={() => setScreen(id)} style={s.bottomTab}>
            <Image source={tabIcons[id]} style={[s.tabIcon, { tintColor: screen === id ? '#F5C451' : '#858D99' }]} />
            <Text style={[s.tabLabel, screen === id && { color: '#F5C451' }]}>{id[0].toUpperCase() + id.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101318' },
  header: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 28, height: 28, borderRadius: 6 },
  edition: { fontSize: 11, color: '#8E959F', fontVariant: ['tabular-nums'] },
  logo: { fontSize: 13, fontWeight: '900', color: '#F2F4F7', letterSpacing: 1.4 },
  navigation: { flexShrink: 0, paddingHorizontal: 22 },
  menuTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 48, borderBottomWidth: 1, borderColor: '#2A3039' },
  menuIcon: { color: '#F5C451', fontSize: 22 },
  menuGlyph: { width: 22, gap: 4, alignItems: 'flex-end' },
  menuGlyphLine: { width: 22, height: 2, borderRadius: 1, backgroundColor: '#F5C451' },
  menuGlyphLineShort: { width: 14 },
  menuValue: { flex: 1, color: '#F2F4F7', fontSize: 16, fontWeight: '600' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  menuOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, minHeight: 56, borderBottomWidth: 1, borderColor: '#2A3039' },
  menuOptionSelected: { backgroundColor: '#242A33', borderRadius: 8 },
  content: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 24, gap: 12 },
  weekBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekTitle: { fontSize: 12, color: '#A7AFBB', fontWeight: '700', letterSpacing: 1.4 },
  weekArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#F2F4F7', fontSize: 30, lineHeight: 34 },
  pageHeading: { marginTop: 10, marginBottom: 4 },
  hero: { fontSize: 30, fontWeight: '800', color: '#F2F4F7', lineHeight: 36, marginVertical: 8, letterSpacing: -1 },
  title: { fontSize: 18, fontWeight: '700', color: '#F2F4F7', marginVertical: 6, letterSpacing: -.3 },
  text: { fontSize: 14, color: '#F2F4F7', lineHeight: 21 },
  sub: { fontSize: 12, color: '#A7AFBB', lineHeight: 18, marginVertical: 4 },
  label: { fontSize: 10, fontWeight: '600', color: '#8E959F', letterSpacing: 1, textTransform: 'uppercase' },
  input: { borderColor: '#353D49', borderWidth: 1, borderRadius: 8, color: '#F2F4F7', padding: 13, fontSize: 16, backgroundColor: '#1A1F27' },
  button: { backgroundColor: '#F5C451', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, marginVertical: 5, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#101318', fontWeight: '700', fontSize: 14 },
  secondary: { backgroundColor: '#242A33' },
  card: { backgroundColor: '#1A1F27', borderRadius: 8, padding: 18, marginVertical: 4 },
  kickerAvatar: { width: 44, height: 44, borderRadius: 22, marginBottom: 8, borderWidth: 2, borderColor: '#F5C451' },
  dangerZone: { borderTopWidth: 1, borderColor: '#49363A', paddingTop: 18, marginTop: 22 },
  offlineNotice: { backgroundColor: '#242A33', borderLeftWidth: 3, borderLeftColor: '#F5C451', borderRadius: 8, padding: 14, marginVertical: 8 },
  connectionNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#242A33', borderRadius: 8, padding: 12 },
  noticeDismiss: { color: '#F5C451', fontSize: 12, fontWeight: '700' },
  settingsHeader: { marginTop: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5C451', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#101318', fontWeight: '900', fontSize: 18 },
  scoreCard: { paddingBottom: 20, gap: 10, borderBottomWidth: 1, borderColor: '#2A3039' },
  scoreLabel: { color: '#A7AFBB', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  statusTag: { color: '#F5C451', fontSize: 9, fontWeight: '700', letterSpacing: .7 },
  seasonMetric: { paddingLeft: 16, gap: 9, maxWidth: '45%' },
  seasonScore: { color: '#F2F4F7', fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rankOf: { color: '#8E959F', fontSize: 14, fontWeight: '400' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#2A3039' },
  eventTitle: { color: '#F2F4F7', fontSize: 15, fontWeight: '600' },
  rank: { fontSize: 18, color: '#8E959F', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  score: { fontSize: 100, fontWeight: '800', color: '#F2F4F7', letterSpacing: -6, fontVariant: ['tabular-nums'], lineHeight: 116 },
  points: { fontSize: 24, fontWeight: '700', color: '#F5C451', fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#2A3039' },
  teamStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  franchiseBadge: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#242A33', alignItems: 'center', justifyContent: 'center' },
  franchiseCode: { color: '#F5C451', fontWeight: '900', fontSize: 14, letterSpacing: .5 },
  teamName: { color: '#F2F4F7', fontSize: 16, fontWeight: '700' },
  emptyFeed: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#353D49', borderRadius: 8, padding: 18, marginVertical: 4 },
  standingsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#2A3039', paddingTop: 10, paddingBottom: 8, backgroundColor: '#101318' },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 48 },
  tabIcon: { width: 23, height: 23 },
  tabLabel: { color: '#858D99', fontSize: 10, fontWeight: '600' },
});

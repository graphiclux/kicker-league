import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
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
const destinations = ['clubhouse', 'nfl', 'standings', 'more'];
const tabIcons: Record<string, any> = {
  clubhouse: require('../assets/tab-clubhouse.png'),
  draft: require('../assets/tab-draft.png'),
  standings: require('../assets/tab-standings.png'),
  inbox: require('../assets/tab-bell.png'),
  nfl: require('../assets/tab-nfl.png'),
  admin: require('../assets/tab-admin.png'),
  rules: require('../assets/tab-rules.png'),
  more: require('../assets/tab-inbox.png'),
};
function SelectionMenu({ label, value, options, onSelect }: {
  label: string;
  value: string;
  options: { id: string; name: string; subtitle?: string }[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  return (
    <View>
      <Text style={[s.label, { marginBottom: 6 }]}>{label}</Text>
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
      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.sheetBackdrop}><Pressable accessibilityLabel="Close league menu" style={{flex: 1}} onPress={() => setOpen(false)} /><SafeAreaView style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.menuHeader}><Text accessibilityRole="header" style={s.clubTitle}>Your leagues</Text><Pressable accessibilityLabel="Close league menu" onPress={() => setOpen(false)} style={s.weekArrow}><Text style={s.arrow}>×</Text></Pressable></View>
          <Text style={[s.text, {paddingHorizontal: 22, marginBottom: 14}]}>Choose where you’re playing.</Text>
          <ScrollView contentContainerStyle={{paddingHorizontal: 22, paddingBottom: 20}}>
            {options.filter(o => !o.id.startsWith('__')).map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected: option.id === value}} style={s.menuOption} onPress={() => {onSelect(option.id); setOpen(false);}}>
              <View style={[s.radio, option.id === value && {backgroundColor:'#F5C451', borderColor:'#F5C451'}]}>{option.id === value && <Text style={{color:'#101318',fontWeight:'700'}}>✓</Text>}</View>
              <View style={{flex:1}}><Text style={s.menuValue}>{option.name}</Text><Text style={s.sub}>{option.subtitle}</Text></View>
            </Pressable>)}
            <View style={{flexDirection:'row',gap:12,marginVertical:20}}>{['+ Create league','Join league'].map(label => <Pressable key={label} accessibilityRole="button" onPress={() => {onSelect('__manage');setOpen(false);}} style={s.outlineAction}><Text style={{color:'#F5C451',fontWeight:'600'}}>{label}</Text></Pressable>)}</View>
            <Text style={s.label}>LEAGUE TOOLS</Text>
            {options.filter(o => o.id.startsWith('__') && o.id !== '__manage').map(option => <Pressable key={option.id} accessibilityRole="button" style={[s.line,{gap:12}]} onPress={() => {onSelect(option.id);setOpen(false);}}><Image source={tabIcons[option.id.slice(2)]} style={[s.tabIcon,{tintColor:'#A7AFBB'}]} /><Text style={[s.text,{flex:1}]}>{option.name}</Text><Text style={s.arrow}>›</Text></Pressable>)}
            <Text style={[s.sub,{textAlign:'center',marginTop:24}]}>One position. All season. Every miss.</Text>
          </ScrollView>
        </SafeAreaView></View>
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
  const scroll = useRef<ScrollView>(null);
  const [user, setUser] = useState<UserView | null>(null),
    [boot, setBoot] = useState(true),
    [busy, setBusy] = useState(false),
    [connectionIssue, setConnectionIssue] = useState<string | null>(null),
    [screen, setScreen] = useState('clubhouse'),
    [nflFilter, setNflFilter] = useState('all'),
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
  useEffect(() => { scroll.current?.scrollTo({y: 0, animated: false}); }, [screen, leagueId]);
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
  const fieldScores = useQuery<any[]>({ queryKey: ['field-scores', season, week], queryFn: () => api.request(`/scores?season=${season}&week=${week}`), enabled: !!user });
  const feedStatus = useQuery<any>({ queryKey: ['nfl-status', season, week], queryFn: () => api.request(`/nfl-status?season=${season}&week=${week}`), enabled: !!user });
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
          <View style={s.loginBrand}>
            <Image source={require('../assets/header-mark.png')} style={s.brandIcon} />
            <Text style={s.logo}>AND IT’S NO GOOD</Text>
          </View>
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
        <View style={s.headerBrand}>
          <Image source={require('../assets/header-mark.png')} style={s.brandIcon} />
          <Text style={s.logo}>AND IT’S NO GOOD</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications and account" onPress={() => setScreen('inbox')} style={s.weekArrow}><Image source={tabIcons.inbox} style={[s.tabIcon, {tintColor: '#F2F4F7'}]} /></Pressable>
      </View>
      <View style={s.navigation}>
          <SelectionMenu label="Your leagues" value={league?.id || ''}
            options={[...(leagues.data || []).map((l) => ({ id: l.id, name: l.name, subtitle: `${l.teams.find(t => t.ownerId === user.id)?.name || ''} · ${l.teams.length} teams` })), { id: '__manage', name: '+ Create or join a league' }, { id: '__draft', name: 'Draft room' }, { id: '__rules', name: 'Scoring rules' }, ...(user.role === 'SUPER_ADMIN' ? [{id: '__admin', name: 'Super Admin'}] : [])]}
            onSelect={(id) => { if (id === '__manage') setScreen('leagues'); else if (id.startsWith('__')) setScreen(id.slice(2)); else setLeagueId(id); }} />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {connectionIssue && <Pressable accessibilityRole="button" onPress={() => setConnectionIssue(null)} style={s.connectionNotice}><Text style={s.sub}>{connectionIssue}</Text><Text style={s.noticeDismiss}>Dismiss</Text></Pressable>}
        <View style={s.weekBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous week" disabled={week <= 1} onPress={() => setWeek(week - 1)} style={s.weekArrow}><Text style={s.arrow}>‹</Text></Pressable>
          <Text style={s.weekTitle}>WEEK {String(week).padStart(2, '0')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next week" disabled={week >= 22} onPress={() => setWeek(week + 1)} style={s.weekArrow}><Text style={s.arrow}>›</Text></Pressable>
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
            <Pressable accessibilityRole="button" accessibilityLabel="Edit your team name" onPress={() => setScreen('inbox')}><Text style={s.clubTitle}>{my?.name || 'Your clubhouse'} <Image source={require('../assets/tab-edit.png')} style={{width:18,height:18,tintColor:'#A7AFBB'}} /></Text></Pressable>
            <Text style={s.sub}>{nfl.data?.find(t => t.code === my?.roster?.teamCode)?.city || 'Your'} {nfl.data?.find(t => t.code === my?.roster?.teamCode)?.name || 'kicking franchise'} · Your kicking franchise</Text>
            <View style={s.scoreCard}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={s.score}>{standing.isError ? '—' : pts(my?.weeklyPoints || 0)}</Text>
                  <Text style={s.scoreLabel}>FANTASY POINTS</Text>
                </View>
                <View style={s.seasonMetric}>
                  <Text style={s.seasonScore}>{my?.rank ? `#${my.rank}` : '—'}<Text style={s.rankOf}> / {league?.teams.length || '—'}</Text></Text>
                  <Text style={s.scoreLabel}>LEAGUE RANK</Text>
                  <Text style={s.sub}>Season {pts(my?.totalPoints || 0)}</Text>
                </View>
              </View>
            </View>
            <View style={s.syncStrip}>
              <Text style={s.statusTag}>{feedStatus.isError || feedStatus.data?.stale ? 'DELAYED' : feedStatus.data?.games.some((g: any) => g.state === 'in') ? '● LIVE' : '● SYNC'}</Text>
              <Text style={s.syncText}>{feedStatus.data?.checkedAt ? `Checked ${new Date(feedStatus.data.checkedAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}` : 'Connecting…'}</Text>
              <Text style={[s.syncText, {borderLeftWidth: 1, borderLeftColor: '#47505D', paddingLeft: 8}]}>Updates automatically</Text>
            </View>
            <View style={s.kickerCard}>
              {nfl.data?.find(t => t.code === my?.roster?.teamCode)?.assignments[0]?.player.imageUrl && <Image resizeMode="cover" source={{uri: nfl.data.find(t => t.code === my?.roster?.teamCode)!.assignments[0].player.imageUrl!}} style={s.heroPortrait} />}
              <View style={{flex: 1}}><Text style={s.teamName}>{nfl.data?.find(t => t.code === my?.roster?.teamCode)?.assignments[0]?.player.name || 'Kicker to be confirmed'}</Text><Text style={s.sub}>{nfl.data?.find(t => t.code === my?.roster?.teamCode)?.city || ''} kicking position</Text><Text style={s.syncText}>Backups included</Text></View>
              {my?.roster && <Image source={{uri: `https://a.espncdn.com/i/teamlogos/nfl/500/${my.roster.teamCode.toLowerCase()}.png`}} style={s.teamLogo} />}
            </View>
            {!my?.roster && <Button title={league ? 'Go to draft' : 'Create or join a league'} onPress={() => setScreen(league ? 'draft' : 'leagues')} />}
            <View style={s.sectionHeading}><Text style={s.title}>Every kick tells a story</Text></View>
            {events.data?.length ? (
              events.data.map((e) => (
                <View style={s.kickRow} key={e.id}>
                  <Text style={[s.kickPoints, {color: e.points > 0 ? '#F5C451' : '#F2F4F7'}]}>{e.voidedAt ? '—' : pts(e.points)}</Text>
                  <Text style={[s.eventTitle, {flex: 1}]}>{e.result === 'MISSED' ? 'Missed' : e.result === 'MADE' ? 'Made' : e.result} {e.eventType === 'EXTRA_POINT' ? 'extra point' : `${e.distance ? `${e.distance}-yard ` : ''}field goal`}</Text>
                  <Text style={s.syncText}>{e.occurredAt ? new Date(e.occurredAt).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) : ''}</Text>
                </View>
              ))
            ) : (
              <View style={s.emptyFeed}><Text style={s.text}>Nothing through the uprights. Yet.</Text><Text style={s.sub}>Scored kicks will appear here for week {week}.</Text></View>
            )}
            <Pressable accessibilityRole="button" onPress={() => setScreen('standings')} style={s.standingsLink}><Text style={s.text}>See the full standings</Text><Text style={s.menuIcon}>→</Text></Pressable>
          </>
        )}
        {screen === 'nfl' && (
          <View>
            <Text style={s.hero}>The whole field.</Text><Text style={s.sub}>Every franchise. Every kick.</Text>
            <View style={s.filters}>{[['all', 'All 32'], ['in', 'Playing'], ['post', 'Final']].map(([id,label]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{selected: nflFilter === id}} onPress={() => setNflFilter(id)} style={[s.filter, nflFilter === id && s.filterActive]}><Text style={[s.text, nflFilter === id && {color: '#101318', fontWeight: '700'}]}>{label}</Text></Pressable>)}</View>
            {feedStatus.data?.stale && <Text style={s.sub}>Game status is delayed. Scores shown are the last saved results.</Text>}
            {feedStatus.data?.games.slice(0,1).map((g: any) => <View key={g.id} style={s.gameBar}><Text style={s.statusTag}>{g.state === 'in' ? 'LIVE' : 'FINAL'}</Text><Text style={s.text}>{g.teams.map((t:any) => t.code).join(' vs ')}</Text><Text style={s.syncText}>{g.detail}</Text></View>)}
            <Text style={[s.label, {textAlign: 'right', marginVertical: 12}]}>FANTASY PTS · WEEK {week}</Text>
            {[...(nfl.data || [])].sort((a,b) => Number(!!feedStatus.data?.games.some((g:any) => g.teams.some((t:any) => t.code === b.code))) - Number(!!feedStatus.data?.games.some((g:any) => g.teams.some((t:any) => t.code === a.code)))).filter(t => nflFilter === 'all' || (!feedStatus.data?.stale && feedStatus.data?.games.some((g: any) => g.state === nflFilter && g.teams.some((c: any) => c.code === t.code)))).map(t => {
              const game = feedStatus.data?.games.find((g: any) => g.teams.some((c: any) => c.code === t.code));
              return <View style={[s.fieldRow, t.code === my?.roster?.teamCode && s.selectedFranchise]} key={t.code}>
                <Image source={{uri: `https://a.espncdn.com/i/teamlogos/nfl/500/${t.code.toLowerCase()}.png`}} style={{width:30,height:30}} />
                {t.assignments[0]?.player.imageUrl ? <Image source={{uri: t.assignments[0].player.imageUrl}} style={s.kickerAvatar} /> : <View style={s.franchiseBadge}><Text style={s.franchiseCode}>{t.code}</Text></View>}
                <View style={{flex: 1}}><Text style={s.teamName}>{t.code}</Text><Text style={s.sub}>{t.assignments[0]?.player.name || 'Kicker to be confirmed'}</Text></View>
                <Text style={s.points}>{fieldScores.isError ? '—' : pts(fieldScores.data?.find(v => v.teamCode === t.code)?.points || 0)}</Text>
              </View>;
            })}
            {nflFilter !== 'all' && !feedStatus.data?.games.some((g: any) => g.state === nflFilter) && <Text style={s.sub}>No {nflFilter === 'in' ? 'live' : 'recent final'} games reported for this week.</Text>}
          </View>
        )}
        {screen === 'more' && <View><Text style={s.hero}>The league office.</Text><Text style={s.sub}>One position. All season. Every miss.</Text>{[['leagues','Create or join a league'],['draft','Draft room'],['rules','Scoring rules'],['inbox','Account & notifications'], ...(user.role === 'SUPER_ADMIN' ? [['admin','Super Admin']] : [])].map(([id,label]) => <Pressable key={id} accessibilityRole="button" style={s.line} onPress={() => setScreen(id)}><Text style={s.text}>{label}</Text><Text style={s.menuIcon}>→</Text></Pressable>)}</View>}
        {screen === 'rules' && <View><Text style={s.hero}>Cheer for the miss.</Text><Text style={s.sub}>Global scoring rules · {season}</Text>{(() => {const r = seasons.data?.find(v => v.year === season)?.rule; return r ? [[`Missed FG up to ${r.shortMax} yards`, r.shortMiss], [`Missed FG over ${r.shortMax} yards`, r.longMiss], ['Missed extra point',r.xpMiss], ['Blocked extra point',r.xpBlocked], [`Made FG from ${r.longMadeMin} yards`,r.longMade], ['Other made kicks',0]].map(([label,value]) => <View key={String(label)} style={s.line}><Text style={[s.text,{flex:1}]}>{label}</Text><Text style={s.points}>{pts(Number(value))}</Text></View>) : <Text style={s.sub}>Loading scoring rules…</Text>;})()}<Text style={s.sub}>Your franchise includes replacement kickers. No trades or lineup changes after the draft.</Text></View>}
        {screen === 'admin' && user?.role === 'SUPER_ADMIN' && (
          <View><Text style={s.label}>SUPER ADMIN</Text><Text style={s.title}>League office</Text><Text style={s.sub}>Scoring overrides, imports, kicker assignments, and audit history are available in the web admin console. Sign in there and choose Super Admin.</Text><Button title="Open web admin" onPress={() => run(() => Linking.openURL(base.replace(/\/api\/?$/, '/')))} /></View>
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
                    {t.code}
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
            {id === 'more' ? <Text style={[s.menuIcon, {color: screen === id ? '#F5C451' : '#A7AFBB'}]}>•••</Text> : <Image source={tabIcons[id]} style={[s.tabIcon, { tintColor: screen === id ? '#F5C451' : '#A7AFBB' }]} />}
            <Text style={[s.tabLabel, screen === id && { color: '#F5C451' }]}>{id === 'nfl' ? 'NFL' : id[0].toUpperCase() + id.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  clubTitle: {fontSize: 28, lineHeight: 34, fontWeight:'800', color:'#F2F4F7', letterSpacing:-.8, marginTop: 6},
  radio: {width:28,height:28,borderRadius:14,borderWidth:1.5,borderColor:'#A7AFBB',alignItems:'center',justifyContent:'center'},
  outlineAction: {flex:1,borderWidth:1,borderColor:'#F5C451',borderRadius:6,minHeight:48,alignItems:'center',justifyContent:'center'},
  syncText: {fontSize:11, color:'#C1C7D0',lineHeight:16},
  kickerCard: {flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#353D49',backgroundColor:'#1A1F27',borderRadius:6,paddingHorizontal:10,minHeight:90, marginBottom:4},
  heroPortrait: {width:68,height:86,alignSelf:'flex-end'},
  teamLogo: {width:44,height:44},
  kickRow: {flexDirection:'row',alignItems:'center',gap:12,minHeight:48,borderBottomWidth:1,borderColor:'#2A3039'},
  kickPoints: {fontSize:24,fontWeight:'700',minWidth:28},
  fieldRow: {flexDirection:'row',alignItems:'center',gap:10,minHeight:68,borderBottomWidth:1,borderColor:'#2A3039'},
  gameBar: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#242A33',padding:10,marginTop:12,borderRadius:6},
  sheetBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end'},
  sheet: {maxHeight: '82%', backgroundColor: '#1A1F27', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12},
  sheetHandle: {width: 44, height: 4, borderRadius: 2, backgroundColor: '#A7AFBB', alignSelf: 'center', marginBottom: 12},
  syncStrip: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',backgroundColor: '#242A33', borderRadius: 6, paddingHorizontal: 10,paddingVertical:12, gap: 6, marginVertical: 8},
  filters: {flexDirection: 'row', gap: 6, marginTop: 18},
  filter: {flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#242A33', borderRadius: 6},
  filterActive: {backgroundColor: '#F5C451'},
  selectedFranchise: {borderLeftWidth: 3, borderLeftColor: '#F5C451', paddingLeft: 10, backgroundColor: '#1A1F27'},
  root: { flex: 1, backgroundColor: '#101318' },
  header: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  headerBrand: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loginBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 },
  brandIcon: { width: 48, height: 54 },
  edition: { fontSize: 11, color: '#8E959F', fontVariant: ['tabular-nums'] },
  logo: { fontFamily: 'sans-serif-condensed', fontSize: 23, fontWeight: '900', color: '#F2F4F7', letterSpacing: -.7 },
  navigation: { flexShrink: 0, paddingHorizontal: 18, paddingBottom: 4 },
  menuTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1A1F27', borderRadius: 8, minHeight: 48, borderWidth: 1, borderColor: '#2A3039' },
  menuIcon: { color: '#F5C451', fontSize: 22 },
  menuGlyph: { width: 22, gap: 4, alignItems: 'flex-end' },
  menuGlyphLine: { width: 22, height: 2, borderRadius: 1, backgroundColor: '#F2F4F7' },
  menuGlyphLineShort: { width: 22 },
  menuValue: { flex: 1, color: '#F2F4F7', fontSize: 16, fontWeight: '600' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  menuOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, minHeight: 70, borderBottomWidth: 1, borderColor: '#2A3039' },
  menuOptionSelected: { backgroundColor: '#242A33', borderRadius: 8 },
  content: { paddingHorizontal: 18, paddingTop: 0, paddingBottom: 18, gap: 4 },
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
  kickerAvatar: { width: 42, height: 48, borderRadius: 4 },
  dangerZone: { borderTopWidth: 1, borderColor: '#49363A', paddingTop: 18, marginTop: 22 },
  offlineNotice: { backgroundColor: '#242A33', borderLeftWidth: 3, borderLeftColor: '#F5C451', borderRadius: 8, padding: 14, marginVertical: 8 },
  connectionNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#242A33', borderRadius: 8, padding: 12 },
  noticeDismiss: { color: '#F5C451', fontSize: 12, fontWeight: '700' },
  settingsHeader: { marginTop: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5C451', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#101318', fontWeight: '900', fontSize: 18 },
  scoreCard: { paddingVertical: 6, marginBottom: 4 },
  scoreLabel: { color: '#A7AFBB', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  statusTag: { color: '#F5C451', fontSize: 9, fontWeight: '700', letterSpacing: .7 },
  seasonMetric: { paddingLeft: 24, gap: 3, width: '48%', borderLeftWidth: 1, borderColor: '#353D49' },
  seasonScore: { color: '#F2F4F7', fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rankOf: { color: '#F2F4F7', fontSize: 24, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#2A3039' },
  eventTitle: { color: '#F2F4F7', fontSize: 14, fontWeight: '400' },
  rank: { fontSize: 18, color: '#8E959F', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  score: { fontSize: 82, fontWeight: '800', color: '#F5C451', letterSpacing: -6, fontVariant: ['tabular-nums'], lineHeight: 86 },
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

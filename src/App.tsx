import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

type Profile = {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  interests?: string[];
  prompt_question?: string | null;
  prompt_answer?: string | null;
  looking_for?: string | null;
  languages?: string[];
};
type Match = { id: string; user_one: string; user_two: string; created_at: string };
type Message = { id: string; match_id: string; sender_id: string; body: string; created_at: string; expires_at?: string; reply_to?: string | null; audio_path?: string | null; demo?: boolean };

const demoProfiles: Profile[] = [
  { id: 'demo-1', display_name: 'Amara', age: 26, city: 'Johannesburg', bio: 'Sunday markets, spontaneous road trips and finding the best coffee in town.', photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo-2', display_name: 'Liam', age: 29, city: 'Cape Town', bio: 'Ocean air, live music and a good laugh. Looking for something genuine.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo-3', display_name: 'Zanele', age: 25, city: 'Pretoria', bio: 'Bookshops, hiking trails and cooking for the people I love.', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85' },
];
const aiProfiles: Profile[] = [
  { id: 'ai-sarah', display_name: 'Sarah', age: 27, city: 'Johannesburg', bio: 'Coffee lover, weekend explorer and fan of honest conversations.', photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85', interests: ['Coffee','Travel','Music'] },
  { id: 'ai-mia', display_name: 'Mia', age: 25, city: 'Pretoria', bio: 'Bookshops, music and trying new recipes.', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85', interests: ['Books','Cooking','Art'] },
  { id: 'ai-james', display_name: 'James', age: 29, city: 'Cape Town', bio: 'Ocean air, live music and finding great food spots.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85', interests: ['Ocean','Music','Food'] },
];
const contactPattern = /(?:https?:\\/\\/|www\\.|\\b[a-z0-9.-]+\\.(?:com|net|org|co\\.za|io)\\b|\\b(?:whats?app|telegram|facebook|instagram|snapchat|tiktok|signal|wechat|dm me|contact me|message me outside|email me|call me|text me)\\b|(?:\\+?\\d[\\d\\s().-]{6,}\\d))/i;
const demoReplies = ['That sounds lovely 😊 What do you enjoy doing on a free day?', 'I like that! Tell me a little more about it.', 'A good conversation is a great start 💛 What would your ideal first date look like?', 'Nice! I would add a coffee stop to that plan ☕'];
const emptyProfile = (id: string, name = ''): Profile => ({ id, display_name: name, age: null, city: '', bio: '', photo_url: '' });

function DateMeLogo() {
  return <svg className="dateme-logo-art" viewBox="0 0 340 300" role="img" aria-label="DateMe red heart wrapped in navy and emerald ribbons with gold trim">
    <defs>
      <linearGradient id="dm-heart" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#ff666b"/><stop offset=".38" stopColor="#f31627"/><stop offset="1" stopColor="#9e0010"/></linearGradient>
      <linearGradient id="dm-navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#183a5b"/><stop offset="1" stopColor="#06182b"/></linearGradient>
      <linearGradient id="dm-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00805c"/><stop offset="1" stopColor="#00402e"/></linearGradient>
    </defs>
    <path d="M170 269 C140 243 47 172 47 104 C47 52 111 38 170 91 C229 38 293 52 293 104 C293 172 200 243 170 269Z" fill="url(#dm-heart)" stroke="#a90010" strokeWidth="4"/>
    <path d="M68 91 C81 62 111 60 132 80 M208 80 C231 59 259 67 272 94" fill="none" stroke="#ffb4b1" strokeWidth="7" strokeLinecap="round"/>
    <path d="M26 111 C82 73 124 83 170 105 C216 83 258 73 314 111 L314 139 C256 109 217 116 170 136 C123 116 84 109 26 139Z" fill="url(#dm-navy)" stroke="#d9b96d" strokeWidth="2.5"/>
    <path d="M13 151 C74 118 122 129 170 150 C218 129 266 118 327 151 L327 180 C267 151 218 162 170 182 C122 162 73 151 13 180Z" fill="url(#dm-green)" stroke="#d9b96d" strokeWidth="2.5"/>
    <path d="M26 198 C83 174 123 182 170 201 C217 182 257 174 314 198 L314 226 C256 205 217 216 170 236 C123 216 84 205 26 226Z" fill="url(#dm-navy)" stroke="#d9b96d" strokeWidth="2.5"/>
    <g fill="#fff4dd" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="bold" fontSize="17" stroke="#fff4dd" strokeWidth=".25"><text x="48" y="119" transform="rotate(-7 48 119)">Date Me</text><text x="218" y="119" transform="rotate(7 218 119)">Date Me</text><text x="38" y="169" transform="rotate(-4 38 169)">Date Me</text><text x="222" y="169" transform="rotate(4 222 169)">Date Me</text><text x="51" y="218" transform="rotate(-5 51 218)">Date Me</text><text x="213" y="218" transform="rotate(5 213 218)">Date Me</text></g>
    <g fill="#ff3150"><path d="M170 110 C160 98 146 108 154 118 L170 132 L186 118 C194 108 180 98 170 110Z"/><path d="M170 160 C160 148 146 158 154 168 L170 182 L186 168 C194 158 180 148 170 160Z"/><path d="M170 209 C160 197 146 207 154 217 L170 231 L186 217 C194 207 180 197 170 209Z"/></g>
  </svg>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(supabase));
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState<'register' | 'home' | 'discover' | 'plans' | 'how' | 'safety' | 'admin'>('register');
  const [selectedPlan, setSelectedPlan] = useState('week');
  const [theme, setTheme] = useState<'rose' | 'navy' | 'green'>('navy');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupAge, setSignupAge] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [demoChatPerson, setDemoChatPerson] = useState<Profile | null>(null);
  const [demoMessages, setDemoMessages] = useState<Message[]>([]);
  const [demoReplyCount, setDemoReplyCount] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrls, setVoiceUrls] = useState<Record<string, string>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<BlobPart[]>([]);
  const [activeMatchId, setActiveMatchId] = useState('');
  const [tab, setTab] = useState<'discover' | 'likes' | 'matches' | 'profile'>('discover');
  const [searchText, setSearchText] = useState('');
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [adminReports, setAdminReports] = useState<Array<{ id: string; reporter_id: string; reported_user_id: string; reason: string; details: string | null; status: string; created_at: string }>>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) setPage('discover');
    else setPage('register');
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user) { setIsAdmin(false); return; }
    supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user || !isAdmin || page !== 'admin') return;
    let cancelled = false;
    setReportsLoading(true);
    supabase.from('member_reports').select('id, reporter_id, reported_user_id, reason, details, status, created_at').order('created_at', { ascending: false }).limit(100)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setNotice('Could not load reports. Please check administrator policies.');
        else setAdminReports((data || []) as typeof adminReports);
        setReportsLoading(false);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id, isAdmin, page]);

  async function updateReportStatus(reportId: string, status: 'reviewing' | 'resolved' | 'dismissed') {
    if (!supabase || !session || !isAdmin) return;
    const { error } = await supabase.from('member_reports').update({ status }).eq('id', reportId);
    if (error) { setNotice('Could not update this report.'); return; }
    setAdminReports(current => current.map(report => report.id === reportId ? { ...report, status } : report));
    setNotice('Report marked ' + status + '.');
  }

  useEffect(() => {
    if (!supabase) { setCheckingSession(false); return; }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setNotice(error.message);
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setMyProfile(null); setMatches([]); setLiked([]); setMessages([]);
      setProfiles(demoProfiles);
      return;
    }
    let cancelled = false;
    async function loadMemberData() {
      const userId = session!.user.id;
      const [own, people, sentLikes, matchRows, blocks] = await Promise.all([
        supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url, interests, prompt_question, prompt_answer, looking_for, languages').eq('id', userId).maybeSingle(),
        supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url, interests, prompt_question, prompt_answer, looking_for, languages').neq('id', userId).order('created_at', { ascending: false }).limit(60),
        supabase!.from('likes').select('liked_user_id').eq('user_id', userId),
        supabase!.from('matches').select('id, user_one, user_two, created_at').or(`user_one.eq.${userId},user_two.eq.${userId}`).order('created_at', { ascending: false }),
        supabase!.from('member_blocks').select('blocker_id, blocked_user_id').or(`blocker_id.eq.${userId},blocked_user_id.eq.${userId}`),
      ]);
      if (cancelled) return;
      if (own.data) setMyProfile(own.data as Profile);
      else setMyProfile(emptyProfile(userId, String(session!.user.user_metadata?.display_name || '')));
      if (people.data) setProfiles(people.data as Profile[]);
      if (sentLikes.data) setLiked(sentLikes.data.map((row) => row.liked_user_id));
      if (matchRows.data) setMatches(matchRows.data as Match[]);
      if (blocks.data) setBlockedIds(blocks.data.map((row) => row.blocker_id === userId ? row.blocked_user_id : row.blocker_id));
      if (own.error || people.error || sentLikes.error || matchRows.error) {
        setNotice('Some account data could not load. Check the Supabase policies and schema setup.');
      }
    }
    void loadMemberData();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!supabase || !session || !activeMatchId) { setMessages([]); return; }
    let cancelled = false;
    async function loadMessages() {
      const { data, error } = await supabase!.from('messages').select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').eq('match_id', activeMatchId).order('created_at', { ascending: true }).limit(200);
      // Expired messages are removed whenever a conversation is opened/refreshed.
      await supabase!.from('messages').delete().eq('match_id', activeMatchId).lt('expires_at', new Date().toISOString());
      if (cancelled) return;
      if (error) setNotice('Could not load this conversation.');
      else setMessages((data || []) as Message[]);
    }
    void loadMessages();
    const channel = supabase!.channel(`messages-${activeMatchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` }, (payload) => {
        const next = payload.new as Message;
        if (next.expires_at && new Date(next.expires_at).getTime() <= Date.now()) return;
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
      }).subscribe();
    return () => { cancelled = true; void supabase!.removeChannel(channel); };
  }, [session, activeMatchId]);

  const visibleProfiles = useMemo(
    () => (tab === 'likes' ? profiles.filter((profile) => liked.includes(profile.id)) : profiles).filter((profile) => !blockedIds.includes(profile.id) && (profile.display_name + ' ' + (profile.city || '') + ' ' + (profile.bio || '') + ' ' + (profile.interests || []).join(' ')).toLowerCase().includes(searchText.toLowerCase())),
    [profiles, liked, tab, blockedIds, searchText],
  );
  const activeMatch = matches.find((match) => match.id === activeMatchId) || null;

  useEffect(() => {
    if (!supabase || !session || !messages.length) { setVoiceUrls({}); return; }
    let cancelled = false;
    async function loadVoiceUrls() {
      const audioMessages = messages.filter((message) => message.audio_path && (!message.expires_at || new Date(message.expires_at).getTime() > Date.now()));
      const pairs = await Promise.all(audioMessages.map(async (message) => {
        const { data } = await supabase!.storage.from('dateme-voice-notes').createSignedUrl(message.audio_path!, 3600);
        return data?.signedUrl ? [message.id, data.signedUrl] as const : null;
      }));
      if (!cancelled) setVoiceUrls(Object.fromEntries(pairs.filter((pair): pair is readonly [string, string] => Boolean(pair))));
    }
    void loadVoiceUrls();
    return () => { cancelled = true; };
  }, [messages, session?.user.id]);
  const activePerson = activeMatch ? profiles.find((profile) => profile.id === (activeMatch.user_one === session?.user.id ? activeMatch.user_two : activeMatch.user_one)) : null;

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice('');
    if (!supabase) { setNotice('Connect your Supabase project using the setup steps in README.md.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const age = Number(signupAge);
        if (!Number.isInteger(age) || age < 18 || age > 120) throw new Error('DateMe is for adults aged 18 and over. Please enter a valid age.');
        if (displayName.trim().length < 2) throw new Error('Please enter a name with at least 2 characters.');
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim(), age } } });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, display_name: displayName.trim(), age, city: null, bio: null, photo_url: null }, { onConflict: 'id', ignoreDuplicates: true });
          if (profileError) setNotice('Your account was created, but your profile needs finishing in My profile.');
        }
        if (data.session) setNotice('Welcome to DateMe! Your account is ready.');
        else { setNotice('Check your email for a confirmation link, then come back to sign in.'); setMode('signin'); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setNotice('You are signed in. Welcome back!');
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : 'You have signed out.');
    setTab('discover'); setActiveMatchId('');
  }

  async function handleLike(profile: Profile) {
    if (!session || !supabase) {
      setLiked((current) => current.includes(profile.id) ? current : [...current, profile.id]);
      setNotice('Demo like saved on this screen only. Sign in to save real likes.');
      return;
    }
    if (liked.includes(profile.id)) {
      setNotice(`You have already liked ${profile.display_name}.`);
      return;
    }
    const { error } = await supabase.from('likes').upsert(
      { user_id: session.user.id, liked_user_id: profile.id },
      { onConflict: 'user_id,liked_user_id', ignoreDuplicates: true },
    );
    if (error) { setNotice('Could not save that like. Please try again.'); return; }
    setLiked((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    // The database trigger creates a match on a mutual like. Check matches rather
    // than querying another member's likes, which RLS correctly keeps private.
    const { data: newMatches } = await supabase.from('matches').select('id, user_one, user_two, created_at').or(`user_one.eq.${session.user.id},user_two.eq.${session.user.id}`).order('created_at', { ascending: false });
    if (newMatches) {
      setMatches(newMatches as Match[]);
      const matched = newMatches.some((match) => match.user_one === profile.id || match.user_two === profile.id);
      if (matched) {
        const match = newMatches.find((item) => item.user_one === profile.id || item.user_two === profile.id);
        if (match) setActiveMatchId(match.id);
        setTab('matches');
        setNotice(`It's a mutual like with ${profile.display_name}! You matched.`);
        return;
      }
    }
    setNotice(`You liked ${profile.display_name}. Fingers crossed!`);
  }

  async function reportMember(profile: Profile) {
    if (!supabase || !session) { setNotice('Sign in to report a profile.'); return; }
    const reason = window.prompt('Why are you reporting this member? (fake profile, harassment, scam, inappropriate content, other)');
    if (!reason?.trim()) return;
    const details = window.prompt('Optional details for the safety team (do not include passwords or financial information):') || '';
    const { error } = await supabase.from('member_reports').insert({ reporter_id: session.user.id, reported_user_id: profile.id, reason: reason.trim().slice(0, 120), details: details.trim().slice(0, 2000), status: 'open' });
    setNotice(error ? 'Report could not be submitted. Please try again.' : 'Thank you. Your report has been sent for review.');
  }

  async function blockMember(profile: Profile) {
    if (!supabase || !session) { setNotice('Sign in to block a member.'); return; }
    if (!window.confirm('Block ' + profile.display_name + '? Their profile will be hidden from your discovery list.')) return;
    const { error } = await supabase.from('member_blocks').upsert({ blocker_id: session.user.id, blocked_user_id: profile.id }, { onConflict: 'blocker_id,blocked_user_id', ignoreDuplicates: true });
    if (error) { setNotice('Could not block this member. Please try again.'); return; }
    setBlockedIds((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    setNotice(profile.display_name + ' has been blocked from your discovery list.');
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !myProfile) return;
    setBusy(true); setNotice('');
    let photoUrl = myProfile.photo_url?.trim() || null;
    if (photoFile) {
      const extension = photoFile.name.split('.').pop()?.toLowerCase() || '';
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(photoFile.type) || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
        setBusy(false); setNotice('Please choose a JPG, PNG or WebP image.'); return;
      }
      if (photoFile.size > 5 * 1024 * 1024) {
        setBusy(false); setNotice('Your photo must be 5 MB or smaller.'); return;
      }
      const filePath = `${session.user.id}/${crypto.randomUUID()}.${extension === 'jpg' ? 'jpg' : extension}`;
      const { error: uploadError } = await supabase.storage.from('dateme-avatars').upload(filePath, photoFile, { contentType: photoFile.type, upsert: false });
      if (uploadError) { setBusy(false); setNotice('Photo upload failed. Please try another image.'); return; }
      photoUrl = supabase.storage.from('dateme-avatars').getPublicUrl(filePath).data.publicUrl;
    }
    const payload = {
      id: session.user.id,
      display_name: myProfile.display_name.trim(),
      age: myProfile.age,
      city: myProfile.city?.trim() || null,
      bio: myProfile.bio?.trim() || null,
      photo_url: photoUrl,
      interests: myProfile.interests || [],
      prompt_question: myProfile.prompt_question?.trim() || null,
      prompt_answer: myProfile.prompt_answer?.trim() || null,
      looking_for: myProfile.looking_for?.trim() || null,
      languages: myProfile.languages || [],
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('id, display_name, age, city, bio, photo_url, interests, prompt_question, prompt_answer, looking_for, languages').single();
    setBusy(false);
    if (error) { setNotice('Could not save your profile. Check that the database schema has been applied.'); return; }
    setMyProfile(data as Profile);
    setPhotoFile(null);
    setProfiles((current) => current.filter((profile) => profile.id !== session.user.id));
    setNotice('Your profile has been saved.');
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = messageText.trim();
    if (!body || body.length > 2000) return;
    if (contactPattern.test(body)) {
      setNotice('Message blocked: phone numbers, external links, social handles and requests to move off DateMe are not allowed. Repeated attempts may trigger a temporary safety freeze.');
      return;
    }
    if (!session && demoChatPerson) {
      const now = new Date().toISOString();
      const mine: Message = { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: 'demo-you', body, created_at: now, demo: true };
      setDemoMessages(current => [...current, mine]);
      setMessageText('');
      const count = demoReplyCount + 1;
      setDemoReplyCount(count);
      window.setTimeout(() => setDemoMessages(current => [...current, { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: demoChatPerson.id, body: demoReplies[(count - 1) % demoReplies.length], created_at: new Date().toISOString(), demo: true }]), 850);
      return;
    }
    if (!supabase || !session || !activeMatchId) return;
    const { data: matchRow } = await supabase.from('matches').select('user_one, user_two').eq('id', activeMatchId).maybeSingle();
    if (!matchRow || ![matchRow.user_one, matchRow.user_two].includes(session.user.id)) { setNotice('This conversation is no longer available.'); return; }
    const otherUserId = matchRow.user_one === session.user.id ? matchRow.user_two : matchRow.user_one;
    const { data: blockRows } = await supabase.from('member_blocks').select('id').or(`and(blocker_id.eq.${session.user.id},blocked_user_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_user_id.eq.${session.user.id})`).limit(1);
    if (blockRows?.length) { setNotice('Messaging is unavailable because one of these accounts has blocked the other.'); return; }
    const { data, error } = await supabase.from('messages').insert({ match_id: activeMatchId, sender_id: session.user.id, body, reply_to: replyTo?.id || null, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').single();
    if (error) { setNotice('Message could not be sent. Messaging is only available to matched members.'); return; }
    if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
    setMessageText(''); setReplyTo(null); setShowEmojiPicker(false);
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) { setNotice('Voice recording is not supported in this browser. Try an updated browser with microphone permission.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setVoiceBlob(blob); setVoicePreview(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false); setRecordingBusy(false);
      };
      recorder.start(); setRecording(true); setNotice('Recording voice note… tap Stop when you are done.');
    } catch { setNotice('Microphone access was blocked. Allow microphone access in your browser settings and try again.'); }
  }

  function stopVoiceRecording() {
    if (recorderRef.current?.state === 'recording') { setRecordingBusy(true); recorderRef.current.stop(); }
  }

  async function sendVoiceNote() {
    if (!supabase || !session || !activeMatchId || !voiceBlob) return;
    if (voiceBlob.size > 5 * 1024 * 1024) {
      setNotice('That voice note is too large. Please record a shorter note (maximum 5 MB).');
      return;
    }
    setRecordingBusy(true);
    const { data: matchRow } = await supabase.from('matches').select('user_one, user_two').eq('id', activeMatchId).maybeSingle();
    if (!matchRow || ![matchRow.user_one, matchRow.user_two].includes(session.user.id)) {
      setNotice('This conversation is no longer available.');
      setRecordingBusy(false);
      return;
    }
    const otherUserId = matchRow.user_one === session.user.id ? matchRow.user_two : matchRow.user_one;
    const { data: blockRows } = await supabase.from('member_blocks').select('id').or(`and(blocker_id.eq.${session.user.id},blocked_user_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_user_id.eq.${session.user.id})`).limit(1);
    if (blockRows?.length) {
      setNotice('Sending voice notes is unavailable because one of these accounts has blocked the other.');
      setRecordingBusy(false);
      return;
    }
    const path = `${activeMatchId}/${session.user.id}/${crypto.randomUUID()}.webm`;
    const { error: uploadError } = await supabase.storage.from('dateme-voice-notes').upload(path, voiceBlob, { contentType: voiceBlob.type || 'audio/webm', upsert: false });
    if (uploadError) { setNotice('Voice note upload is not ready yet. Please check the voice-note storage bucket setup.'); setRecordingBusy(false); return; }
    const { data, error } = await supabase.from('messages').insert({ match_id: activeMatchId, sender_id: session.user.id, body: '🎙️ Voice note', audio_path: path, reply_to: replyTo?.id || null, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').single();
    if (error) setNotice('Could not send the voice note.');
    else if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
    if (voicePreview) URL.revokeObjectURL(voicePreview);
    setVoicePreview(null); setVoiceBlob(null); setReplyTo(null); setRecordingBusy(false);
  }

  function openChat(match: Match) {
    setActiveMatchId(match.id);
    const otherId = match.user_one === session?.user.id ? match.user_two : match.user_one;
    setNotice('');
    setTab('matches');
    if (!profiles.some((profile) => profile.id === otherId) && supabase) {
      void supabase.from('profiles').select('id, display_name, age, city, bio, photo_url').eq('id', otherId).maybeSingle()
        .then(({ data }) => { if (data) setProfiles((current) => [...current.filter((p) => p.id !== data.id), data as Profile]); });
    }
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-menu-wrap">
          <button className="brand-logo brand-logo-small logo-home-button" onClick={() => { setPage(session ? "discover" : "register"); setMenuOpen(false); window.scrollTo(0,0); }} aria-label="DateMe home"><DateMeLogo /></button>
          <button className="portal-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span></span><span></span><span></span></button>
          {menuOpen && <nav className="portal-menu" aria-label="DateMe portals">
            <button onClick={() => { setPage(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Main page</button>
            <button onClick={() => { setPage(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo(0,0); }}>Discover / member portal</button>
            <button onClick={() => { setPage('plans'); setMenuOpen(false); window.scrollTo(0,0); }}>Subscription plans</button>
            <button onClick={() => { setPage('how'); setMenuOpen(false); window.scrollTo(0,0); }}>How DateMe works</button>
            <button onClick={() => { setPage('safety'); setMenuOpen(false); window.scrollTo(0,0); }}>Safety centre</button>
            <button onClick={() => { setPage('admin'); setMenuOpen(false); window.scrollTo(0,0); }}>Admin portal</button>
            <button onClick={() => { setTheme(theme === 'rose' ? 'navy' : theme === 'navy' ? 'green' : 'rose'); setMenuOpen(false); }}>Change theme: {theme === 'rose' ? 'Rose' : theme === 'navy' ? 'Navy' : 'Green'}</button>
            {!session && <button onClick={() => { setPage('register'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Register / sign in</button>}
          </nav>}
        </div>
        <nav className="top-links" aria-label="Main navigation"><button onClick={() => { setPage("how"); setMenuOpen(false); window.scrollTo(0,0); }}>How it works</button><button onClick={() => { setPage("safety"); setMenuOpen(false); window.scrollTo(0,0); }}>Your safety</button>{session && <button onClick={() => { setPage("plans"); setMenuOpen(false); window.scrollTo(0,0); }}>Membership</button>}</nav>
        {session ? <button className="button button-outline top-action" onClick={() => void handleSignOut()}>Sign out</button> : <button className="button button-outline top-action" onClick={() => { setPage(session ? 'discover' : 'register'); setMode('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Log in</button>}
      </header>
      <main>
        {page === 'register' && !session && <section className="hero registration-page">
          <div className="hero-copy">
            <span className="eyebrow"><span className="sparkle">✦</span> LESS SWIPING. MORE SPARK.</span>
            <h1>Your next chapter<br />starts <span>with a hello.</span></h1>
            <p className="hero-lede">Meet people who get you. Real connections, good conversations, and the kind of chemistry you can’t plan.</p>
            <div className="hero-points"><span><span className="point-icon">✓</span> Made for real connections</span><span><span className="point-icon">✓</span> You’re in control</span></div>
            <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-heart">♥</div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><span className="art-note note-one">your person is out there</span><span className="art-note note-two">start with a hello ♡</span></div>
          </div>
          <div className="auth-card" id="join">
            <div className="registration-logo"><DateMeLogo /></div>
            <div className="card-heading"><h2>{mode === 'signup' ? 'Find your kind of love' : 'Welcome back'}</h2><p>{mode === 'signup' ? 'Your story starts with a few details.' : 'Your next chapter is waiting.'}</p></div>
            <div className="auth-switch" role="tablist" aria-label="Account type"><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }} role="tab" aria-selected={mode === 'signup'}>Create account</button><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(''); }} role="tab" aria-selected={mode === 'signin'}>Log in</button></div>
            <form onSubmit={handleAuth} className="auth-form">
              {mode === 'signup' && <><label>Your first name<input autoComplete="given-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What should we call you?" required minLength={2} /></label><label>Your age (18+)<input type="number" inputMode="numeric" min={18} max={120} value={signupAge} onChange={(e) => setSignupAge(e.target.value)} placeholder="18 or older" required /></label></>}
              <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
              <label>Password<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
              <button className="button button-primary submit-button" type="submit" disabled={busy || checkingSession}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Log in'} <span>→</span></button>
              <p className="terms">By continuing, you agree to treat people with kindness and respect.</p>
            </form>
            {notice && <p className="notice" role="status">{notice}</p>}
            {!isSupabaseConfigured && <p className="setup-hint"><span>ⓘ</span> Preview mode: add your Supabase keys to enable real accounts.</p>}
          </div>
        </section>}

        {page === 'discover' && <section className="discover-section" id="discover">
          <div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE, REAL POSSIBILITIES</span><h2>{session ? tab === 'matches' ? 'Your connections' : tab === 'profile' ? 'Your story, your way' : 'People you might like' : 'A little closer to your person'}</h2><p>Start with a smile. See where a conversation takes you.</p></div><span className="section-flower" aria-hidden="true">✳</span></div>
          {session && <div className="discover-search"><span>⌕</span><input aria-label="Search members" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name, city or interests…" /><button type="button" onClick={() => setSearchText('')}>Clear</button></div>}
          {session && <div className="member-bar"><span>Signed in as <strong>{session.user.email}</strong></span><div className="member-tabs">
            <button className={tab === 'discover' ? 'selected' : ''} onClick={() => { setTab('discover'); setActiveMatchId(''); }}>Discover</button>
            <button className={tab === 'likes' ? 'selected' : ''} onClick={() => { setTab('likes'); setActiveMatchId(''); }}>Likes ({liked.length})</button>
            <button className={tab === 'matches' ? 'selected' : ''} onClick={() => setTab('matches')}>Matches ({matches.length})</button>
            <button className={tab === 'profile' ? 'selected' : ''} onClick={() => { setTab('profile'); setActiveMatchId(''); }}>My profile</button>
          </div></div>}

          {session && tab === 'profile' && myProfile && <form className="profile-editor" onSubmit={saveProfile}>
            <div className="editor-photo-column"><div className="editor-photo">{myProfile.photo_url ? <img src={myProfile.photo_url} alt="Your profile" /> : <span>♡</span>}</div><label className="photo-upload-label">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; setPhotoFile(file); setNotice(file ? `Selected ${file.name}. Save your profile to upload it.` : ''); }} /><small>JPG, PNG or WebP · max 5 MB</small></label></div>
            <div className="editor-fields">
              <label>Display name<input required minLength={2} maxLength={60} value={myProfile.display_name} onChange={(e) => setMyProfile({ ...myProfile, display_name: e.target.value })} placeholder="Your name" /></label>
              <label>Age (18+)<input type="number" min={18} max={120} value={myProfile.age ?? ''} onChange={(e) => setMyProfile({ ...myProfile, age: e.target.value ? Number(e.target.value) : null })} placeholder="Your age" required /></label>
              <label>City<input maxLength={100} value={myProfile.city || ''} onChange={(e) => setMyProfile({ ...myProfile, city: e.target.value })} placeholder="e.g. Johannesburg" /></label>
              <label>Photo URL<input type="url" value={myProfile.photo_url || ''} onChange={(e) => setMyProfile({ ...myProfile, photo_url: e.target.value })} placeholder="https://…" /></label>
              <label className="editor-bio">About you<textarea maxLength={500} rows={4} value={myProfile.bio || ''} onChange={(e) => setMyProfile({ ...myProfile, bio: e.target.value })} placeholder="What do you love? What makes you, you?" /><span>{(myProfile.bio || '').length}/500</span></label>
              <label>What are you looking for?<select value={myProfile.looking_for || ''} onChange={(e) => setMyProfile({ ...myProfile, looking_for: e.target.value })}><option value="">Choose what feels right</option><option>Long-term relationship</option><option>Dating and seeing where it goes</option><option>Friendship first</option><option>Marriage-minded</option><option>Not sure yet</option></select></label>
              <label>Interests <input value={(myProfile.interests || []).join(', ')} onChange={(e) => setMyProfile({ ...myProfile, interests: e.target.value.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 12) })} placeholder="Music, hiking, cooking (comma separated)" /></label>
              <label>Languages <input value={(myProfile.languages || []).join(', ')} onChange={(e) => setMyProfile({ ...myProfile, languages: e.target.value.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 8) })} placeholder="English, isiZulu, Afrikaans…" /></label>
              <label>Profile prompt question<input maxLength={160} value={myProfile.prompt_question || ''} onChange={(e) => setMyProfile({ ...myProfile, prompt_question: e.target.value })} placeholder="A perfect Sunday looks like…" /></label>
              <label>Prompt answer<textarea maxLength={300} rows={2} value={myProfile.prompt_answer || ''} onChange={(e) => setMyProfile({ ...myProfile, prompt_answer: e.target.value })} placeholder="Give someone an easy conversation starter" /></label>
              <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save my profile'}</button>
            </div>
          </form>}

          {session && tab === 'matches' && <div className="match-layout">
            <aside className="match-list"><h3>Your matches</h3>{matches.length === 0 ? <p className="muted-copy">When you and another member like each other, your match will appear here.</p> : matches.map((match) => {
              const otherId = match.user_one === session.user.id ? match.user_two : match.user_one;
              const person = profiles.find((p) => p.id === otherId);
              return <button key={match.id} className={activeMatchId === match.id ? 'match-row active' : 'match-row'} onClick={() => openChat(match)}><span className="match-avatar">{person?.photo_url ? <img src={person.photo_url} alt="" /> : '♡'}</span><span><strong>{person?.display_name || 'Your match'}</strong><small>{person?.city || 'Say hello'}</small></span><span className="match-arrow">›</span></button>;
            })}</aside>
            <section className="chat-panel">{activeMatch ? <>
              <div className="chat-heading"><span className="match-avatar">{activePerson?.photo_url ? <img src={activePerson.photo_url} alt="" /> : '♡'}</span><div><strong>{activePerson?.display_name || 'Your match'}</strong><small>Only you and your match can see this chat</small></div></div>
              <div className="chat-tools-note">🔒 Private chat · messages expire after 24 hours</div>
              <div className="chat-messages">{messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).length === 0 ? <p className="chat-empty">Every great conversation starts somewhere. Say hello 👋</p> : messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).map((message) => <div key={message.id} className={message.sender_id === session.user.id ? 'message-bubble mine' : 'message-bubble'}><div className="message-actions"><button type="button" title="Reply to message" aria-label="Reply to message" onClick={() => { setReplyTo(message); setMessageText(''); }}>↶ Reply</button><button type="button" title="Copy message" aria-label="Copy message" onClick={() => { void navigator.clipboard?.writeText(message.body).then(() => setNotice('Message copied.')).catch(() => setNotice('Copy was blocked by your browser.')); }}>Copy</button><button type="button" title="Translate message" aria-label="Translate message" onClick={() => window.open('https://translate.google.com/?sl=auto&tl=en&text=' + encodeURIComponent(message.body) + '&op=translate', '_blank', 'noopener,noreferrer')}>Translate</button></div>{message.reply_to && <p className="reply-reference">↶ Replying to an earlier message</p>}{message.audio_path && supabase ? <audio controls preload="none" src={voiceUrls[message.id] || undefined} /> : <p>{message.body}</p>}<time>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · disappears in 24h</time></div>)}</div>
              {replyTo && <div className="reply-composer"><span>↶ Replying to: {replyTo.body.slice(0, 90)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></div>}
              {voicePreview && <div className="voice-preview"><audio controls src={voicePreview} /><button type="button" onClick={() => { URL.revokeObjectURL(voicePreview); setVoicePreview(null); setVoiceBlob(null); }}>Discard</button><button type="button" onClick={() => void sendVoiceNote()} disabled={recordingBusy}>Send voice note</button></div>}
              {showEmojiPicker && <div className="emoji-picker" aria-label="Emoji picker">{['😀','😂','🥰','😍','😘','😊','😉','❤️','💕','💖','🔥','👏','👍','🙏','🌹','✨','😢','😅','🤗','💋'].map((emoji) => <button type="button" key={emoji} onClick={() => setMessageText((text) => text + emoji)}>{emoji}</button>)}</div>}
              <form className="chat-compose" onSubmit={sendMessage}><button type="button" className="chat-tool-button" aria-label="Choose emoji" title="Emoji" onClick={() => setShowEmojiPicker((show) => !show)}>☺</button><input value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder={replyTo ? 'Write a reply…' : 'Write a kind message…'} aria-label="Message" /><button type="button" className="chat-tool-button" aria-label={recording ? 'Stop recording' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'} onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()} disabled={recordingBusy}>{recording ? '■' : '🎙'}</button><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form>
            </> : <div className="chat-placeholder"><span>♡</span><h3>A little hello goes a long way.</h3><p>Choose a match to start your conversation.</p></div>}</section>
          </div>}

          {(tab === 'discover' || tab === 'likes' || !session) && (visibleProfiles.length ? <div className="profile-grid">
            {visibleProfiles.map((profile, index) => <article className="person-card" key={profile.id}>
              <div className="person-photo-wrap">{profile.photo_url ? <img className="person-photo" src={profile.photo_url} alt={`${profile.display_name}'s profile`} loading="lazy" /> : <div className="photo-placeholder">♡</div>}<span className="profile-number">{String(index + 1).padStart(2, '0')}</span><button className={liked.includes(profile.id) ? 'like-button liked' : 'like-button'} onClick={() => void handleLike(profile)} aria-label={`Like ${profile.display_name}`}>{liked.includes(profile.id) ? '♥' : '♡'}</button></div>
              <div className="person-info"><h3>{profile.display_name}{profile.age ? <span>, {profile.age}</span> : null}</h3><p className="person-city"><span>⌖</span> {profile.city || 'Location not set'}</p><p className="person-bio">{profile.bio || 'A little mystery makes the first hello more fun.'}</p>{profile.prompt_question && <div className="profile-prompt"><small>{profile.prompt_question}</small><p>{profile.prompt_answer}</p></div>}{profile.interests?.length ? <div className="interest-chips">{profile.interests.slice(0,5).map((interest) => <span key={interest}>{interest}</span>)}</div> : null}{profile.looking_for && <p className="looking-for">♡ {profile.looking_for}</p>}<button className="say-hello" onClick={() => void handleLike(profile)}>{liked.includes(profile.id) ? 'Liked' : 'Say hello'} <span>↗</span></button>{session && <div className="profile-safety-actions"><button onClick={() => void reportMember(profile)}>Report</button><button onClick={() => void blockMember(profile)}>Block</button></div>}</div>
            </article>)}
          </div> : <div className="empty-state"><span>♡</span><h3>{tab === 'likes' ? 'No likes here yet' : 'No profiles yet'}</h3><p>{tab === 'likes' ? 'Explore people and tap the heart on someone who catches your eye.' : 'New member profiles will show up here as people join DateMe.'}</p><button className="button button-primary" onClick={() => setTab('discover')}>Back to discover</button></div>)}
          {!session && <div className="ai-demo-entry"><h3>Try a conversation</h3><p>Choose a simulated profile to test the chat. These are automated demos, not real members.</p><div className="ai-demo-buttons">{aiProfiles.map(person => <button key={person.id} className="button button-outline" onClick={() => { setDemoChatPerson(person); setDemoMessages([{ id: 'welcome-' + person.id, match_id: person.id, sender_id: person.id, body: person.display_name === 'Sarah' ? 'Hi! 😊 I’m Sarah. What’s something that always makes your day better?' : 'Hey there! 👋 What do you enjoy doing on weekends?', created_at: new Date().toISOString(), demo: true }]); setDemoReplyCount(0); setMessageText(''); setPage('discover'); setTab('discover'); window.scrollTo(0,0); }}>Chat with {person.display_name} · Demo</button>)}</div></div>}
          {!session && demoChatPerson && <section className="demo-chat-panel"><div className="chat-heading"><span className="match-avatar">{demoChatPerson.photo_url ? <img src={demoChatPerson.photo_url} alt="" /> : '♡'}</span><div><strong>{demoChatPerson.display_name} · AI demo</strong><small>Automated practice chat — not a real member</small></div><button className="button button-outline" onClick={() => { setDemoChatPerson(null); setDemoMessages([]); }}>Close</button></div><div className="chat-tools-note">🔒 Simulated chat · contact details are blocked</div><div className="chat-messages">{demoMessages.map(message => <div key={message.id} className={message.sender_id === 'demo-you' ? 'message-bubble mine' : 'message-bubble'}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>)}</div><form className="chat-compose" onSubmit={sendMessage}><input value={messageText} onChange={e => setMessageText(e.target.value)} maxLength={2000} placeholder="Try saying hello…" aria-label="Demo chat message" /><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form></section>}
          {!session && <p className="demo-caption">Demo profiles and simulated chats are examples only, not real members. Create an account to connect with real members.</p>}
          {notice && session && <p className="notice member-notice" role="status">{notice}</p>}
        </section>}

        {page === 'plans' && <section className="portal-page membership-section" id="membership-plans"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">YOUR JOURNEY, YOUR PACE</span><h2>Membership <span>plans.</span></h2><p>Choose a period to review its draft price and proposed benefits. Benefits below are the proposed tier design. Prices, exact media limits and payment setup still need final configuration.</p><div className="plan-periods">{[{id:'week',label:'Per Week',period:'7 days'},{id:'month',label:'Per Month',period:'1 month'},{id:'quarter',label:'3 Months',period:'3 months'},{id:'half',label:'6 Months',period:'6 months'},{id:'year',label:'1 Year',period:'12 months'}].map(plan => <button key={plan.id} className={selectedPlan===plan.id?'plan-period selected':'plan-period'} onClick={() => setSelectedPlan(plan.id)}>{plan.label}<small>{plan.period}</small></button>)}</div><div className="plan-detail"><span className="draft-label">DRAFT · NOT FOR SALE</span><h3>{{week:'Per Week · 7 days',month:'Per Month',quarter:'3 Months',half:'6 Months',year:'1 Year · 12 months'}[selectedPlan]}</h3><div className="draft-price">Price: <strong>To be decided</strong></div><h4>Proposed benefits to discuss</h4><ul><li>Create and edit your dating profile</li><li>Discover member profiles and send likes</li><li>Report and block inappropriate behaviour.</li>{selectedPlan==='week' && <li>Basic text chat only in this draft tier.</li>}{selectedPlan==='month' && <li>Text chat and limited photo sharing (proposed).</li>}{selectedPlan==='quarter' && <li>Text chat and photo sharing; video-sharing limits to be defined.</li>}{selectedPlan==='half' && <li>Text, photo and limited video sharing; proposed in-app voice calls. No video calling.</li>}{selectedPlan==='year' && <><li>Text messages, photo and video sharing, subject to safety and file-size limits.</li><li>In-app voice calls and video calling with mutual matches.</li><li>Included message allowance; final fair-use limit to be defined.</li></>}</ul><p>Payments are not enabled. No subscription can be purchased from this page yet.</p></div></section>}
        {page === 'admin' && <section className="portal-page membership-section"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">OWNER ACCESS</span><h2>Administrator <span>portal.</span></h2>{isAdmin ? <div className="plan-detail"><h3>Admin access verified</h3><p>Signed in as {session?.user.email}. The secure admin area is reserved for accounts granted access in the database.</p><p>Review member safety reports and update their status below. Member access and account suspension controls are not enabled yet.</p><div className="admin-report-list"><h3>Member safety reports</h3>{reportsLoading ? <p>Loading reports…</p> : adminReports.length === 0 ? <p>No reports have been submitted.</p> : adminReports.map(report => <article className="admin-report" key={report.id}><div className="admin-report-heading"><strong>{report.reason || 'Member report'}</strong><span className={'report-status status-' + report.status}>{report.status}</span></div><p>{report.details || 'No extra details provided.'}</p><small>Reported member: {report.reported_user_id} · Submitted: {new Date(report.created_at).toLocaleString()}</small><div className="admin-report-actions"><button onClick={() => void updateReportStatus(report.id, 'reviewing')}>Mark reviewing</button><button onClick={() => void updateReportStatus(report.id, 'resolved')}>Resolve</button><button onClick={() => void updateReportStatus(report.id, 'dismissed')}>Dismiss</button></div></article>)}</div></div> : <div className="plan-detail"><h3>Restricted access</h3><p>Your account has not been granted administrator privileges. For security, admin access cannot be self-assigned from this public page.</p><p>We can set up your owner account through a secure, private admin grant after you confirm the account email you want to use.</p></div>}</section>}
        {page === 'how' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2><div className="steps-grid"><article><span className="step-num">01</span><h3>Show up as you</h3><p>Create a profile that feels like you.</p></article><article><span className="step-num">02</span><h3>Find your people</h3><p>Discover people you would like to know.</p></article><article><span className="step-num">03</span><h3>Make the first move</h3><p>A kind hello can start a conversation.</p></article></div></section>}
        {page === 'safety' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Safety <span>centre.</span></h2><p>Protect your personal details, take your time getting to know people, and meet in public places. Report suspicious or abusive behaviour. Never send phone numbers, external links, social handles or contact details in chat. Repeated attempts may be blocked and trigger a temporary account freeze and safety review. Never send money to someone you have not met. Meet in public, tell a trusted person where you are going, and report or block anyone who makes you uncomfortable.</p></section>}

      </main>
      <footer><a className="brand-logo brand-logo-footer" href="#" aria-label="DateMe home"><DateMeLogo /></a><p>Made for the moments that matter.</p><span>© {new Date().getFullYear()} DateMe</span></footer>
    </div>
  );
}
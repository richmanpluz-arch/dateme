import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

type Profile = {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
};
type Match = { id: string; user_one: string; user_two: string; created_at: string };
type Message = { id: string; match_id: string; sender_id: string; body: string; created_at: string };

const demoProfiles: Profile[] = [
  { id: 'demo-1', display_name: 'Amara', age: 26, city: 'Johannesburg', bio: 'Sunday markets, spontaneous road trips and finding the best coffee in town.', photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo-2', display_name: 'Liam', age: 29, city: 'Cape Town', bio: 'Ocean air, live music and a good laugh. Looking for something genuine.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo-3', display_name: 'Zanele', age: 25, city: 'Pretoria', bio: 'Bookshops, hiking trails and cooking for the people I love.', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85' },
];
const emptyProfile = (id: string, name = ''): Profile => ({ id, display_name: name, age: null, city: '', bio: '', photo_url: '' });

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(supabase));
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [activeMatchId, setActiveMatchId] = useState('');
  const [tab, setTab] = useState<'discover' | 'likes' | 'matches' | 'profile'>('discover');

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
      const [own, people, sentLikes, matchRows] = await Promise.all([
        supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url').eq('id', userId).maybeSingle(),
        supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url').neq('id', userId).order('created_at', { ascending: false }).limit(60),
        supabase!.from('likes').select('liked_user_id').eq('user_id', userId),
        supabase!.from('matches').select('id, user_one, user_two, created_at').or(`user_one.eq.${userId},user_two.eq.${userId}`).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (own.data) setMyProfile(own.data as Profile);
      else setMyProfile(emptyProfile(userId, String(session!.user.user_metadata?.display_name || '')));
      if (people.data) setProfiles(people.data as Profile[]);
      if (sentLikes.data) setLiked(sentLikes.data.map((row) => row.liked_user_id));
      if (matchRows.data) setMatches(matchRows.data as Match[]);
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
      const { data, error } = await supabase!.from('messages').select('id, match_id, sender_id, body, created_at').eq('match_id', activeMatchId).order('created_at', { ascending: true }).limit(200);
      if (cancelled) return;
      if (error) setNotice('Could not load this conversation.');
      else setMessages((data || []) as Message[]);
    }
    void loadMessages();
    const channel = supabase.channel(`messages-${activeMatchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` }, (payload) => {
        const next = payload.new as Message;
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
      }).subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [session, activeMatchId]);

  const visibleProfiles = useMemo(
    () => tab === 'likes' ? profiles.filter((profile) => liked.includes(profile.id)) : profiles,
    [profiles, liked, tab],
  );
  const activeMatch = matches.find((match) => match.id === activeMatchId) || null;
  const activePerson = activeMatch ? profiles.find((profile) => profile.id === (activeMatch.user_one === session?.user.id ? activeMatch.user_two : activeMatch.user_one)) : null;

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice('');
    if (!supabase) { setNotice('Connect your Supabase project using the setup steps in README.md.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
        if (error) throw error;
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
    const { data: reciprocal } = await supabase.from('likes').select('id').eq('user_id', profile.id).eq('liked_user_id', session.user.id).maybeSingle();
    if (reciprocal) {
      const { data: newMatches } = await supabase.from('matches').select('id, user_one, user_two, created_at').or(`user_one.eq.${session.user.id},user_two.eq.${session.user.id}`).order('created_at', { ascending: false });
      if (newMatches) setMatches(newMatches as Match[]);
      setTab('matches');
      setNotice(`It's a mutual like with ${profile.display_name}! You matched.`);
    } else setNotice(`You liked ${profile.display_name}. Fingers crossed!`);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !myProfile) return;
    setBusy(true); setNotice('');
    const payload = {
      id: session.user.id,
      display_name: myProfile.display_name.trim(),
      age: myProfile.age,
      city: myProfile.city?.trim() || null,
      bio: myProfile.bio?.trim() || null,
      photo_url: myProfile.photo_url?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('id, display_name, age, city, bio, photo_url').single();
    setBusy(false);
    if (error) { setNotice('Could not save your profile. Check that the database schema has been applied.'); return; }
    setMyProfile(data as Profile);
    setProfiles((current) => current.filter((profile) => profile.id !== session.user.id));
    setNotice('Your profile has been saved.');
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = messageText.trim();
    if (!supabase || !session || !activeMatchId || !body || body.length > 2000) return;
    const { data, error } = await supabase.from('messages').insert({ match_id: activeMatchId, sender_id: session.user.id, body }).select('id, match_id, sender_id, body, created_at').single();
    if (error) { setNotice('Message could not be sent. Messaging is only available to matched members.'); return; }
    if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
    setMessageText('');
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
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="DateMe home"><span className="brand-mark">♥</span> DateMe<span className="brand-dot">.</span></a>
        <nav className="top-links" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#safety">Your safety</a></nav>
        {session ? <button className="button button-outline top-action" onClick={() => void handleSignOut()}>Sign out</button> : <button className="button button-outline top-action" onClick={() => { setMode('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Log in</button>}
      </header>
      <main>
        {!session && <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="sparkle">✦</span> LESS SWIPING. MORE SPARK.</span>
            <h1>Your next chapter<br />starts <span>with a hello.</span></h1>
            <p className="hero-lede">Meet people who get you. Real connections, good conversations, and the kind of chemistry you can’t plan.</p>
            <div className="hero-points"><span><span className="point-icon">✓</span> Made for real connections</span><span><span className="point-icon">✓</span> You’re in control</span></div>
            <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-heart">♥</div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><span className="art-note note-one">your person is out there</span><span className="art-note note-two">start with a hello ♡</span></div>
          </div>
          <div className="auth-card" id="join">
            <div className="card-heading"><span className="mini-heart">♥</span><h2>{mode === 'signup' ? 'Find your kind of love' : 'Welcome back'}</h2><p>{mode === 'signup' ? 'Your story starts with a few details.' : 'Your next chapter is waiting.'}</p></div>
            <div className="auth-switch" role="tablist" aria-label="Account type"><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }} role="tab" aria-selected={mode === 'signup'}>Create account</button><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(''); }} role="tab" aria-selected={mode === 'signin'}>Log in</button></div>
            <form onSubmit={handleAuth} className="auth-form">
              {mode === 'signup' && <label>Your first name<input autoComplete="given-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What should we call you?" required minLength={2} /></label>}
              <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
              <label>Password<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
              <button className="button button-primary submit-button" type="submit" disabled={busy || checkingSession}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Log in'} <span>→</span></button>
              <p className="terms">By continuing, you agree to treat people with kindness and respect.</p>
            </form>
            {notice && <p className="notice" role="status">{notice}</p>}
            {!isSupabaseConfigured && <p className="setup-hint"><span>ⓘ</span> Preview mode: add your Supabase keys to enable real accounts.</p>}
          </div>
        </section>}

        <section className="discover-section" id="discover">
          <div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE, REAL POSSIBILITIES</span><h2>{session ? tab === 'matches' ? 'Your connections' : tab === 'profile' ? 'Your story, your way' : 'People you might like' : 'A little closer to your person'}</h2><p>Start with a smile. See where a conversation takes you.</p></div><span className="section-flower" aria-hidden="true">✳</span></div>
          {session && <div className="member-bar"><span>Signed in as <strong>{session.user.email}</strong></span><div className="member-tabs">
            <button className={tab === 'discover' ? 'selected' : ''} onClick={() => { setTab('discover'); setActiveMatchId(''); }}>Discover</button>
            <button className={tab === 'likes' ? 'selected' : ''} onClick={() => { setTab('likes'); setActiveMatchId(''); }}>Likes ({liked.length})</button>
            <button className={tab === 'matches' ? 'selected' : ''} onClick={() => setTab('matches')}>Matches ({matches.length})</button>
            <button className={tab === 'profile' ? 'selected' : ''} onClick={() => { setTab('profile'); setActiveMatchId(''); }}>My profile</button>
          </div></div>}

          {session && tab === 'profile' && myProfile && <form className="profile-editor" onSubmit={saveProfile}>
            <div className="editor-photo">{myProfile.photo_url ? <img src={myProfile.photo_url} alt="Your profile" /> : <span>♡</span>}</div>
            <div className="editor-fields">
              <label>Display name<input required minLength={2} maxLength={60} value={myProfile.display_name} onChange={(e) => setMyProfile({ ...myProfile, display_name: e.target.value })} placeholder="Your name" /></label>
              <label>Age (18+)<input type="number" min={18} max={120} value={myProfile.age ?? ''} onChange={(e) => setMyProfile({ ...myProfile, age: e.target.value ? Number(e.target.value) : null })} placeholder="Your age" /></label>
              <label>City<input maxLength={100} value={myProfile.city || ''} onChange={(e) => setMyProfile({ ...myProfile, city: e.target.value })} placeholder="e.g. Johannesburg" /></label>
              <label>Photo URL<input type="url" value={myProfile.photo_url || ''} onChange={(e) => setMyProfile({ ...myProfile, photo_url: e.target.value })} placeholder="https://…" /></label>
              <label className="editor-bio">About you<textarea maxLength={500} rows={4} value={myProfile.bio || ''} onChange={(e) => setMyProfile({ ...myProfile, bio: e.target.value })} placeholder="What do you love? What makes you, you?" /><span>{(myProfile.bio || '').length}/500</span></label>
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
              <div className="chat-messages">{messages.length === 0 ? <p className="chat-empty">Every great conversation starts somewhere. Say hello 👋</p> : messages.map((message) => <div key={message.id} className={message.sender_id === session.user.id ? 'message-bubble mine' : 'message-bubble'}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleString()}</time></div>)}</div>
              <form className="chat-compose" onSubmit={sendMessage}><input value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder="Write a kind message…" aria-label="Message" required /><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form>
            </> : <div className="chat-placeholder"><span>♡</span><h3>A little hello goes a long way.</h3><p>Choose a match to start your conversation.</p></div>}</section>
          </div>}

          {(tab === 'discover' || tab === 'likes' || !session) && (visibleProfiles.length ? <div className="profile-grid">
            {visibleProfiles.map((profile, index) => <article className="person-card" key={profile.id}>
              <div className="person-photo-wrap">{profile.photo_url ? <img className="person-photo" src={profile.photo_url} alt={`${profile.display_name}'s profile`} loading="lazy" /> : <div className="photo-placeholder">♡</div>}<span className="profile-number">{String(index + 1).padStart(2, '0')}</span><button className={liked.includes(profile.id) ? 'like-button liked' : 'like-button'} onClick={() => void handleLike(profile)} aria-label={`Like ${profile.display_name}`}>{liked.includes(profile.id) ? '♥' : '♡'}</button></div>
              <div className="person-info"><h3>{profile.display_name}{profile.age ? <span>, {profile.age}</span> : null}</h3><p className="person-city"><span>⌖</span> {profile.city || 'Location not set'}</p><p className="person-bio">{profile.bio || 'A little mystery makes the first hello more fun.'}</p><button className="say-hello" onClick={() => void handleLike(profile)}>{liked.includes(profile.id) ? 'Liked' : 'Say hello'} <span>↗</span></button></div>
            </article>)}
          </div> : <div className="empty-state"><span>♡</span><h3>{tab === 'likes' ? 'No likes here yet' : 'No profiles yet'}</h3><p>{tab === 'likes' ? 'Explore people and tap the heart on someone who catches your eye.' : 'New member profiles will show up here as people join DateMe.'}</p><button className="button button-primary" onClick={() => setTab('discover')}>Back to discover</button></div>)}
          {!session && <p className="demo-caption">Demo profiles are examples only, not real members. Create an account to start your own journey.</p>}
          {notice && session && <p className="notice member-notice" role="status">{notice}</p>}
        </section>

        <section className="how-section" id="how-it-works"><span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2><div className="steps-grid"><article><span className="step-num">01</span><div className="step-icon">✧</div><h3>Show up as you</h3><p>Create a profile that feels like you, not a highlight reel.</p></article><article><span className="step-num">02</span><div className="step-icon">♡</div><h3>Find your people</h3><p>Discover people you’d genuinely like to get to know.</p></article><article><span className="step-num">03</span><div className="step-icon">↗</div><h3>Make the first move</h3><p>A small hello can be the start of something wonderful.</p></article></div></section>
        <section className="safety-banner" id="safety"><div className="safety-symbol">♡</div><div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Good chemistry needs good boundaries.</h2><p>Your comfort matters. Never share private information before you’re ready, and meet new people in public places.</p></div></section>
      </main>
      <footer><a className="brand" href="#"><span className="brand-mark">♥</span> DateMe<span className="brand-dot">.</span></a><p>Made for the moments that matter.</p><span>© {new Date().getFullYear()} DateMe</span></footer>
    </div>
  );
}
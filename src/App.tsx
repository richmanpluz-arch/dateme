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

function DateMeLogo() {
  return <img className="dateme-logo-art" src="data:image/webp;base64,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" alt="Approved DateMe logo: glossy red heart wrapped in navy and green ribbons with gold trim and cream Date Me lettering" />;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(supabase));
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState<'home' | 'discover' | 'plans' | 'how' | 'safety' | 'admin'>('home');
  const [selectedPlan, setSelectedPlan] = useState('week');
  const [theme, setTheme] = useState<'rose' | 'navy' | 'green'>('rose');
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
  const [activeMatchId, setActiveMatchId] = useState('');
  const [tab, setTab] = useState<'discover' | 'likes' | 'matches' | 'profile'>('discover');

  useEffect(() => {
    if (!supabase || !session?.user) { setIsAdmin(false); return; }
    supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session?.user?.id]);

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
    const channel = supabase!.channel(`messages-${activeMatchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` }, (payload) => {
        const next = payload.new as Message;
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
      }).subscribe();
    return () => { cancelled = true; void supabase!.removeChannel(channel); };
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
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim(), age: Number(signupAge) } } });
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
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('id, display_name, age, city, bio, photo_url').single();
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
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-menu-wrap">
          <a className="brand-logo brand-logo-small" href="#" aria-label="DateMe home"><DateMeLogo /></a>
          <button className="portal-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span></span><span></span><span></span></button>
          {menuOpen && <nav className="portal-menu" aria-label="DateMe portals">
            <button onClick={() => { setPage('home'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Main page</button>
            <button onClick={() => { setPage('discover'); setMenuOpen(false); window.scrollTo(0,0); }}>Discover / member portal</button>
            <button onClick={() => { setPage('plans'); setMenuOpen(false); window.scrollTo(0,0); }}>Subscription plans</button>
            <button onClick={() => { setPage('how'); setMenuOpen(false); window.scrollTo(0,0); }}>How DateMe works</button>
            <button onClick={() => { setPage('safety'); setMenuOpen(false); window.scrollTo(0,0); }}>Safety centre</button>
            {session && isAdmin && <button onClick={() => { setPage('admin'); setMenuOpen(false); window.scrollTo(0,0); }}>Admin portal</button>}
            <button onClick={() => { setTheme(theme === 'rose' ? 'navy' : theme === 'navy' ? 'green' : 'rose'); setMenuOpen(false); }}>Change theme: {theme === 'rose' ? 'Rose' : theme === 'navy' ? 'Navy' : 'Green'}</button>
            {!session && <button onClick={() => { setPage('home'); setMenuOpen(false); document.getElementById('join')?.scrollIntoView({behavior:'smooth'}); }}>Register / sign in</button>
          </nav>}
        </div>
        <nav className="top-links" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#safety">Your safety</a></nav>
        {session ? <button className="button button-outline top-action" onClick={() => void handleSignOut()}>Sign out</button> : <button className="button button-outline top-action" onClick={() => { setMode('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Log in</button>}
      </header>
      <main>
        {page === 'home' && !session && <section className="hero">
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

        {(page === 'discover' || (page === 'home' && Boolean(session))) && <section className="discover-section" id="discover">
          <div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE, REAL POSSIBILITIES</span><h2>{session ? tab === 'matches' ? 'Your connections' : tab === 'profile' ? 'Your story, your way' : 'People you might like' : 'A little closer to your person'}</h2><p>Start with a smile. See where a conversation takes you.</p></div><span className="section-flower" aria-hidden="true">✳</span></div>
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
        </section>}

        {page === 'plans' && <section className="portal-page membership-section" id="membership-plans"><div className="portal-page-actions"><button onClick={() => setPage('home')}>← Back</button><button onClick={() => setPage('home')}>× Close</button></div><span className="eyebrow">YOUR JOURNEY, YOUR PACE</span><h2>Membership <span>plans.</span></h2><p>Choose a period to review its draft price and proposed benefits. Amounts and benefits are placeholders until we agree on the final offering.</p><div className="plan-periods">{[{id:'week',label:'Per Week',period:'7 days'},{id:'month',label:'Per Month',period:'1 month'},{id:'quarter',label:'3 Months',period:'3 months'},{id:'half',label:'6 Months',period:'6 months'},{id:'year',label:'1 Year',period:'12 months'}].map(plan => <button key={plan.id} className={selectedPlan===plan.id?'plan-period selected':'plan-period'} onClick={() => setSelectedPlan(plan.id)}>{plan.label}<small>{plan.period}</small></button>)}</div><div className="plan-detail"><span className="draft-label">DRAFT · NOT FOR SALE</span><h3>{{week:'Per Week · 7 days',month:'Per Month',quarter:'3 Months',half:'6 Months',year:'1 Year · 12 months'}[selectedPlan]}</h3><div className="draft-price">Price: <strong>To be decided</strong></div><h4>Proposed benefits to discuss</h4><ul><li>Create and edit your dating profile</li><li>Discover member profiles and send likes</li><li>Match and chat features, subject to account access and availability</li><li>Report and block inappropriate behaviour</li>{selectedPlan!=='week' && <li>Longer access period with no weekly renewal</li>}{selectedPlan==='year' && <li>Potential best-value annual option (price to be agreed)</li>}</ul><p>Payments are not enabled. No subscription can be purchased from this page yet.</p></div></section>}
        {page === 'admin' && <section className="portal-page membership-section"><div className="portal-page-actions"><button onClick={() => setPage('home')}>← Back</button><button onClick={() => setPage('home')}>× Close</button></div><span className="eyebrow">OWNER ACCESS</span><h2>Administrator <span>portal.</span></h2>{isAdmin ? <div className="plan-detail"><h3>Admin access verified</h3><p>Signed in as {session?.user.email}. The secure admin area is reserved for accounts granted access in the database.</p><p>Management tools are not yet connected.</p></div> : <div className="plan-detail"><h3>Restricted access</h3><p>Your account has not been granted administrator privileges. For security, admin access cannot be self-assigned from this public page.</p><p>We can set up your owner account through a secure, private admin grant after you confirm the account email you want to use.</p></div>}</section>}
        {page === 'how' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={() => setPage('home')}>← Back</button><button onClick={() => setPage('home')}>× Close</button></div><span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2><div className="steps-grid"><article><span className="step-num">01</span><h3>Show up as you</h3><p>Create a profile that feels like you.</p></article><article><span className="step-num">02</span><h3>Find your people</h3><p>Discover people you would like to know.</p></article><article><span className="step-num">03</span><h3>Make the first move</h3><p>A kind hello can start a conversation.</p></article></div></section>}
        {page === 'safety' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={() => setPage('home')}>← Back</button><button onClick={() => setPage('home')}>× Close</button></div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Safety <span>centre.</span></h2><p>Protect your personal details, take your time getting to know people, and meet in public places. Report suspicious or abusive behaviour. Safety tools and moderation workflows will be expanded as the app develops.</p></section>}
        {page === 'home' && !session && <section className="how-section" id="how-it-works"><span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2><div className="steps-grid"><article><span className="step-num">01</span><div className="step-icon">✧</div><h3>Show up as you</h3><p>Create a profile that feels like you, not a highlight reel.</p></article><article><span className="step-num">02</span><div className="step-icon">♡</div><h3>Find your people</h3><p>Discover people you’d genuinely like to get to know.</p></article><article><span className="step-num">03</span><div className="step-icon">↗</div><h3>Make the first move</h3><p>A small hello can be the start of something wonderful.</p></article></div></section>
        {page === 'home' && <section className="safety-banner" id="safety"><div className="safety-symbol">♡</div><div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Good chemistry needs good boundaries.</h2><p>Your comfort matters. Never share private information before you’re ready, and meet new people in public places.</p></div></section>}
      </main>
      <footer><a className="brand-logo brand-logo-footer" href="#" aria-label="DateMe home"><DateMeLogo /></a><p>Made for the moments that matter.</p><span>© {new Date().getFullYear()} DateMe</span></footer>
    </div>
  );
}
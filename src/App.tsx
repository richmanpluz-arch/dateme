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

const demoProfiles: Profile[] = [
  { id: 'demo-1', display_name: 'Amara', age: 26, city: 'Johannesburg', bio: 'Sunday markets, spontaneous road trips and finding the best coffee in town.', photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo-2', display_name: 'Liam', age: 29, city: 'Cape Town', bio: 'Ocean air, live music and a good laugh. Looking for something genuine.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo-3', display_name: 'Zanele', age: 25, city: 'Pretoria', bio: 'Bookshops, hiking trails and cooking for the people I love.', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85' },
];

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
  const [liked, setLiked] = useState<string[]>([]);
  const [tab, setTab] = useState<'discover' | 'likes' | 'profile'>('discover');

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setNotice(error.message);
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfiles() {
      if (!supabase || !session?.user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, age, city, bio, photo_url')
        .neq('id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) {
        setNotice('You are signed in, but profiles are not ready yet. Run the SQL setup in supabase/schema.sql.');
        return;
      }
      if (data) setProfiles(data as Profile[]);
    }
    void loadProfiles();
  }, [session]);

  const visibleProfiles = useMemo(
    () => tab === 'likes' ? profiles.filter((profile) => liked.includes(profile.id)) : profiles,
    [profiles, liked, tab],
  );

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (!supabase) {
      setNotice('Connect your Supabase project first using the setup steps in README.md.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          setNotice('Welcome to DateMe! Your account is ready.');
        } else {
          setNotice('Check your email for a confirmation link, then come back to sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setNotice('You are signed in. Welcome back!');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : 'You have signed out.');
    setTab('discover');
  }

  async function handleLike(profile: Profile) {
    if (!session || !supabase) {
      setLiked((current) => current.includes(profile.id) ? current : [...current, profile.id]);
      setNotice('Demo like saved on this screen. Sign in and connect the database to save real likes.');
      return;
    }
    const { error } = await supabase.from('likes').upsert(
      { user_id: session.user.id, liked_user_id: profile.id },
      { onConflict: 'user_id,liked_user_id', ignoreDuplicates: true },
    );
    if (error) {
      setNotice('Could not save that like yet. Make sure you have run supabase/schema.sql.');
      return;
    }
    setLiked((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    setNotice(`You liked ${profile.display_name}. Fingers crossed!`);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="DateMe home"><span className="brand-mark">♥</span> DateMe<span className="brand-dot">.</span></a>
        <nav className="top-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#safety">Your safety</a>
        </nav>
        {session ? (
          <button className="button button-outline top-action" onClick={handleSignOut}>Sign out</button>
        ) : (
          <button className="button button-outline top-action" onClick={() => { setMode('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Log in</button>
        )}
      </header>

      <main>
        {!session && (
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><span className="sparkle">✦</span> LESS SWIPING. MORE SPARK.</span>
              <h1>Your next chapter<br />starts <span>with a hello.</span></h1>
              <p className="hero-lede">Meet people who get you. Real connections, good conversations, and the kind of chemistry you can’t plan.</p>
              <div className="hero-points">
                <span><span className="point-icon">✓</span> Made for real connections</span>
                <span><span className="point-icon">✓</span> You’re in control</span>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
                <div className="art-heart">♥</div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span>
                <span className="art-note note-one">your person is out there</span><span className="art-note note-two">start with a hello ♡</span>
              </div>
            </div>

            <div className="auth-card" id="join">
              <div className="card-heading">
                <span className="mini-heart">♥</span>
                <h2>{mode === 'signup' ? 'Find your kind of love' : 'Welcome back'}</h2>
                <p>{mode === 'signup' ? 'Your story starts with a few details.' : 'Your next chapter is waiting.'}</p>
              </div>
              <div className="auth-switch" role="tablist" aria-label="Account type">
                <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }} role="tab" aria-selected={mode === 'signup'}>Create account</button>
                <button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(''); }} role="tab" aria-selected={mode === 'signin'}>Log in</button>
              </div>
              <form onSubmit={handleAuth} className="auth-form">
                {mode === 'signup' && <label>Your first name<input autoComplete="given-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What should we call you?" required minLength={2} /></label>}
                <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
                <label>Password<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
                <button className="button button-primary submit-button" type="submit" disabled={busy || checkingSession}>
                  {busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Log in'} <span>→</span>
                </button>
                <p className="terms">By continuing, you agree to treat people with kindness and respect.</p>
              </form>
              {notice && <p className="notice" role="status">{notice}</p>}
              {!isSupabaseConfigured && <p className="setup-hint"><span>ⓘ</span> Preview mode: add your Supabase keys to enable real accounts.</p>}
            </div>
          </section>
        )}

        <section className="discover-section" id="discover">
          <div className="section-heading">
            <div><span className="eyebrow">GOOD PEOPLE, REAL POSSIBILITIES</span><h2>{session ? 'People you might like' : 'A little closer to your person'}</h2><p>Start with a smile. See where a conversation takes you.</p></div>
            <span className="section-flower" aria-hidden="true">✳</span>
          </div>
          {session && <div className="member-bar">
            <span>Signed in as <strong>{session.user.email}</strong></span>
            <div className="member-tabs">
              <button className={tab === 'discover' ? 'selected' : ''} onClick={() => setTab('discover')}>Discover</button>
              <button className={tab === 'likes' ? 'selected' : ''} onClick={() => setTab('likes')}>Your likes ({liked.length})</button>
              <button className={tab === 'profile' ? 'selected' : ''} onClick={() => setTab('profile')}>My profile</button>
            </div>
          </div>}
          {tab === 'profile' && session ? <div className="profile-setup">
            <div className="profile-setup-icon">♡</div><h3>Your story deserves a good introduction.</h3>
            <p>Your account is ready. The next step is to add your photo, age, city and a few words about yourself in your Supabase <code>profiles</code> table. Profile editing is the next build milestone.</p>
          </div> : visibleProfiles.length ? <div className="profile-grid">
            {visibleProfiles.map((profile, index) => (
              <article className="person-card" key={profile.id}>
                <div className="person-photo-wrap">
                  {profile.photo_url ? <img className="person-photo" src={profile.photo_url} alt={`${profile.display_name}'s profile`} loading="lazy" /> : <div className="photo-placeholder">♡</div>}
                  <span className="profile-number">{String(index + 1).padStart(2, '0')}</span>
                  <button className={liked.includes(profile.id) ? 'like-button liked' : 'like-button'} onClick={() => void handleLike(profile)} aria-label={`Like ${profile.display_name}`}>{liked.includes(profile.id) ? '♥' : '♡'}</button>
                </div>
                <div className="person-info"><h3>{profile.display_name}{profile.age ? <span>, {profile.age}</span> : null}</h3><p className="person-city"><span>⌖</span> {profile.city || 'Location not set'}</p><p className="person-bio">{profile.bio || 'A little mystery makes the first hello more fun.'}</p><button className="say-hello" onClick={() => void handleLike(profile)}>Say hello <span>↗</span></button></div>
              </article>
            ))}
          </div> : <div className="empty-state"><span>♡</span><h3>No likes here yet</h3><p>Explore people and tap the heart on someone who catches your eye.</p><button className="button button-primary" onClick={() => setTab('discover')}>Back to discover</button></div>}
          {!session && <p className="demo-caption">A little preview of what’s possible — create an account to start your own journey.</p>}
        </section>

        <section className="how-section" id="how-it-works">
          <span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2>
          <div className="steps-grid"><article><span className="step-num">01</span><div className="step-icon">✧</div><h3>Show up as you</h3><p>Create a profile that feels like you, not a highlight reel.</p></article><article><span className="step-num">02</span><div className="step-icon">♡</div><h3>Find your people</h3><p>Discover people you’d genuinely like to get to know.</p></article><article><span className="step-num">03</span><div className="step-icon">↗</div><h3>Make the first move</h3><p>A small hello can be the start of something wonderful.</p></article></div>
        </section>

        <section className="safety-banner" id="safety"><div className="safety-symbol">♡</div><div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Good chemistry needs good boundaries.</h2><p>Your comfort matters. Never share private information before you’re ready, and meet new people in public places.</p></div></section>
      </main>
      <footer><a className="brand" href="#"><span className="brand-mark">♥</span> DateMe<span className="brand-dot">.</span></a><p>Made for the moments that matter.</p><span>© {new Date().getFullYear()} DateMe</span></footer>
    </div>
  );
}
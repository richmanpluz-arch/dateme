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
type Message = { id: string; match_id: string; sender_id: string; body: string; created_at: string; expires_at?: string; reply_to?: string | null; audio_path?: string | null; deleted_at?: string | null; deleted_by?: string | null; demo?: boolean };
type MessageReceipt = { message_id: string; user_id: string; delivered_at: string | null; read_at: string | null };

const aiProfiles: Profile[] = [
  { id: 'ai-sarah', display_name: 'Sarah', age: 27, city: 'Johannesburg', bio: 'Coffee lover, weekend explorer and fan of honest conversations.', photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85', interests: ['Coffee','Travel','Music'] },
  { id: 'ai-mia', display_name: 'Mia', age: 25, city: 'Pretoria', bio: 'Bookshops, music and trying new recipes.', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85', interests: ['Books','Cooking','Art'] },
  { id: 'ai-james', display_name: 'James', age: 29, city: 'Cape Town', bio: 'Ocean air, live music and finding great food spots.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85', interests: ['Ocean','Music','Food'] },
];
const contactPattern = /(?:https?:\/\/|www\.|\b[a-z0-9.-]+\.(?:com|net|org|co\.za|io)\b|\b(?:whats?app|telegram|facebook|instagram|snapchat|tiktok|signal|wechat|dm me|contact me|message me outside|email me|call me|text me)\b|(?:\+?\d[\d\s().-]{6,}\d))/i;
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
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState<'register' | 'home' | 'discover' | 'plans' | 'how' | 'safety' | 'admin'>('register');
  const [pageHistory, setPageHistory] = useState<Array<typeof page>>([]);
  const [selectedPlan, setSelectedPlan] = useState('week');
  const [subscriptionPortalOpen, setSubscriptionPortalOpen] = useState(false);
  const [planPreferences, setPlanPreferences] = useState<Record<string, string[]>>(() => { try { return JSON.parse(localStorage.getItem('dateme-plan-preferences') || '{}') as Record<string, string[]>; } catch { return {}; } });
  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState('');
  const [theme, setTheme] = useState<'rose' | 'navy' | 'green'>('navy');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupAge, setSignupAge] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [subscriptionSubmitting, setSubscriptionSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'nowpayments' | 'kora_1voucher'>('nowpayments');
  const [voucherPin, setVoucherPin] = useState('');
  const [voucherPhone, setVoucherPhone] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [subscriptionPrices, setSubscriptionPrices] = useState<Record<string, { price_zar: number | string | null; price_usd: number | string | null; enabled: boolean }>>({});
  const [profiles, setProfiles] = useState<Profile[]>(aiProfiles);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [liked, setLiked] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('dateme-ai-likes') || '[]') as string[]; } catch { return []; } });
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageReceipts, setMessageReceipts] = useState<Record<string, MessageReceipt>>({});
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [translationPanel, setTranslationPanel] = useState<{ messageId: string; original: string; translated: string; loading: boolean; error: string } | null>(null);
  const [translationTarget, setTranslationTarget] = useState('en');
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
  const [minAgeFilter, setMinAgeFilter] = useState('');
  const [maxAgeFilter, setMaxAgeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [adminReports, setAdminReports] = useState<Array<{ id: string; reporter_id: string; reported_user_id: string; reason: string; details: string | null; status: string; created_at: string }>>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [safetyEvents, setSafetyEvents] = useState<Array<{ id: string; user_id: string; original_message: string; detected_reasons: string[]; strike_number: number; action_taken: string; created_at: string }>>([]);
  const [safetyStatus, setSafetyStatus] = useState<Array<{ user_id: string; strike_count: number; suspended_until: string | null; updated_at: string }>>([]);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [referralInput, setReferralInput] = useState(() => new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('dateme-pending-referral') || '');
  const [affiliateReferrals, setAffiliateReferrals] = useState<Array<{ id: string; referred_user_id: string; status: string; qualifying_minutes_today: number; promo_ends_at: string | null; created_at: string }>>([]);
  const [affiliateActivitySeconds, setAffiliateActivitySeconds] = useState(0);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ plan_code: string; status: string; ends_at: string | null; payment_verified: boolean; promo_chat_until: string | null } | null>(null);
  const [adminSubscriptions, setAdminSubscriptions] = useState<Array<{ user_id: string; plan_code: string; status: string; created_at: string; payment_verified: boolean }>>([]);
  const [adminPlanPrices, setAdminPlanPrices] = useState<Array<{ plan_code: string; price_zar: number | null; price_usd: number | null; enabled: boolean }>>([]);
  const [adminPayments, setAdminPayments] = useState<Array<{ id: string; user_id: string; plan_code: string; provider: string; status: string; amount: number; currency: string; created_at: string; paid_at: string | null }>>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { price_zar: string; price_usd: string; enabled: boolean }>>({});
  const [priceSaving, setPriceSaving] = useState(false);
  const referralCodeFromUrl = new URLSearchParams(window.location.search).get('ref');

  useEffect(() => {
    if (referralCodeFromUrl) localStorage.setItem('dateme-pending-referral', referralCodeFromUrl);
  }, []);

  useEffect(() => {
    if (!session?.user || !supabase) {
      localStorage.setItem('dateme-plan-preferences', JSON.stringify(planPreferences));
      return;
    }
    const userId = session.user.id;
    if (preferencesLoadedFor !== userId) return;
    localStorage.setItem('dateme-plan-preferences', JSON.stringify(planPreferences));
    const planPairs = [
      { uiKey: 'week', planCode: 'week' },
      { uiKey: 'month', planCode: 'month' },
      { uiKey: 'quarter', planCode: 'three_months' },
      { uiKey: 'half', planCode: 'six_months' },
      { uiKey: 'year', planCode: 'yearly' },
    ];
    void supabase.from('member_plan_preferences').upsert(
      planPairs.map(({ uiKey, planCode }) => ({
        user_id: userId,
        plan_code: planCode,
        preferences: planPreferences[uiKey] || [],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,plan_code' },
    ).then(({ error }) => {
      if (error) setNotice('Your plan preferences are saved on this device, but account sync failed. Please try again later.');
    });
  }, [planPreferences, session?.user?.id, preferencesLoadedFor]);

  function navigateTo(nextPage: typeof page) {
    if (page !== nextPage) setPageHistory([...pageHistory.slice(-19), page]);
    setPage(nextPage);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBackPage() {
    const previousPage = pageHistory[pageHistory.length - 1];
    if (previousPage) {
      setPage(previousPage);
      setPageHistory(pageHistory.slice(0, -1));
    } else {
      setPage(session ? 'discover' : 'register');
      setPageHistory([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closePage() {
    setSubscriptionPortalOpen(false); setMenuOpen(false); setPageHistory([]);
    setPage(session ? 'discover' : 'register'); setActiveMatchId(''); setReplyTo(null); setDemoChatPerson(null); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function togglePlanPreference(planId: string, preference: string) {
    setPlanPreferences(current => {
      const currentChoices = current[planId] || [];
      return { ...current, [planId]: currentChoices.includes(preference) ? currentChoices.filter(choice => choice !== preference) : [...currentChoices, preference] };
    });
  }

  useEffect(() => {
    if (session?.user) setPage('discover');
    else setPage('register');
  }, [session?.user?.id]);

  useEffect(() => {
    const client = supabase;
    const userId = session?.user?.id;
    if (!client || !userId) {
      setPreferencesLoadedFor('');
      return;
    }
    let cancelled = false;
    setPreferencesLoadedFor('');
    setPlanPreferences({});
    client.from('member_plan_preferences').select('plan_code,preferences').eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setNotice('Could not load your saved plan preferences from your account. Your existing device settings remain available.');
          return;
        }
        const uiKeys: Record<string, string> = { week: 'week', month: 'month', three_months: 'quarter', six_months: 'half', yearly: 'year' };
        const saved = Object.fromEntries((data || []).map(row => [uiKeys[row.plan_code] || row.plan_code, row.preferences || []])) as Record<string, string[]>;
        setPlanPreferences(saved);
        setPreferencesLoadedFor(userId);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user) { setIsAdmin(false); return; }
    supabase!.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session?.user?.id]);
  
  useEffect(() => {
    const client = supabase;
    if (!client || !session?.user) {
      setAffiliateCode('');
      setAffiliateReferrals([]);
      setAffiliateActivitySeconds(0);
      setSubscriptionInfo(null);
      return;
    }
    let cancelled = false;
    const userId = session.user.id;
    const pendingKey = 'dateme-pending-referral';
    const params = new URLSearchParams(window.location.search);
    const referralFromUrl = params.get('ref');
    const storedReferral = localStorage.getItem(pendingKey);
    const referralCode = referralFromUrl || storedReferral;
    const loadMemberData = async () => {
      const [account, referrals, activity, subscription] = await Promise.all([
        client.from('affiliate_accounts').select('referral_code').eq('user_id', userId).maybeSingle(),
        client.from('affiliate_referrals').select('id,referred_user_id,status,qualifying_minutes_today,promo_ends_at,created_at').eq('referrer_id', userId).order('created_at', { ascending: false }).limit(100),
        client.from('affiliate_activity_daily').select('qualifying_seconds').eq('user_id', userId).eq('activity_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
        client.from('member_subscriptions').select('plan_code,status,ends_at,payment_verified,promo_chat_until').eq('user_id', userId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (account.data?.referral_code) setAffiliateCode(account.data.referral_code);
      if (!account.data && account.error) setNotice('Your affiliate account is still being prepared. Refresh your profile shortly.');
      setAffiliateReferrals((referrals.data || []) as typeof affiliateReferrals);
      setAffiliateActivitySeconds(activity.data?.qualifying_seconds || 0);
      if (subscription.data) setSubscriptionInfo(subscription.data as typeof subscriptionInfo);
      if (referralCode) {
        const { error } = await client.rpc('attach_affiliate_referral', { p_referral_code: referralCode });
        if (!error) {
          localStorage.removeItem(pendingKey);
          if (referralFromUrl) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('ref');
            window.history.replaceState({}, '', cleanUrl.toString());
          }
        } else if (referralFromUrl) {
          localStorage.setItem(pendingKey, referralCode);
        }
      }
    };
    void loadMemberData();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user || page !== 'discover' || tab !== 'matches' || !activeMatchId || document.visibilityState !== 'visible') return;
    let cancelled = false;
    const heartbeat = async () => {
      const { data, error } = await supabase!.rpc('record_affiliate_heartbeat');
      if (cancelled || error) return;
      const seconds = Number((data as { qualifying_seconds_today?: number } | null)?.qualifying_seconds_today);
      if (Number.isFinite(seconds)) setAffiliateActivitySeconds(seconds);
    };
    void heartbeat();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void heartbeat(); }, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session?.user?.id, page, tab, activeMatchId]);


  useEffect(() => {
    if (!supabase || !session?.user || !isAdmin || page !== 'admin') return;
    let cancelled = false;
    setReportsLoading(true);
    Promise.all([
      supabase!.from('member_reports').select('id, reporter_id, reported_user_id, reason, details, status, created_at').order('created_at', { ascending: false }).limit(100),
      supabase!.from('member_safety_events').select('id, user_id, original_message, detected_reasons, strike_number, action_taken, created_at').order('created_at', { ascending: false }).limit(200),
      supabase!.from('member_safety_status').select('user_id, strike_count, suspended_until, updated_at').order('updated_at', { ascending: false }).limit(200),
      supabase!.from('member_subscriptions').select('user_id,plan_code,status,created_at,payment_verified').eq('status','pending').order('created_at',{ascending:false}).limit(200),
      supabase!.from('subscription_plan_prices').select('plan_code,price_zar,price_usd,enabled').order('plan_code'),
      supabase!.from('subscription_payment_orders').select('id,user_id,plan_code,provider,status,amount,currency,created_at,paid_at').order('created_at',{ascending:false}).limit(100),
    ]).then(([reports, events, statuses, subscriptions, prices, payments]) => {
      if (cancelled) return;
      if (reports.error) setNotice('Could not load reports. Please check administrator policies.');
      else setAdminReports((reports.data || []) as typeof adminReports);
      if (events.error) setNotice('Safety history could not be loaded. Check administrator policies.');
      else setSafetyEvents((events.data || []) as typeof safetyEvents);
      if (statuses.error) setNotice('Safety status could not be loaded. Check administrator policies.');
      else setSafetyStatus((statuses.data || []) as typeof safetyStatus);
      if (!subscriptions.error) setAdminSubscriptions((subscriptions.data || []) as typeof adminSubscriptions);
      if (!prices.error) {
        const rows = (prices.data || []) as typeof adminPlanPrices;
        setAdminPlanPrices(rows);
        setPriceDrafts(Object.fromEntries(rows.map(row => [row.plan_code, { price_zar: row.price_zar == null ? '' : String(row.price_zar), price_usd: row.price_usd == null ? '' : String(row.price_usd), enabled: row.enabled }])));
      } else setNotice('Subscription pricing could not be loaded. Apply the subscription payment migration first.');
      if (!payments.error) setAdminPayments((payments.data || []) as typeof adminPayments);
      else setNotice('Payment history could not be loaded. Apply the subscription payment migration first.');
      setReportsLoading(false);
    });
    return () => { cancelled = true; };
  }, [session?.user?.id, isAdmin, page]);

  async function saveSubscriptionPrice(planCode: string) {
    if (!supabase || !session || !isAdmin || priceSaving) return;
    const draft = priceDrafts[planCode];
    if (!draft) return;
    const zar = draft.price_zar.trim() ? Number(draft.price_zar) : null;
    const usd = draft.price_usd.trim() ? Number(draft.price_usd) : null;
    if ((zar !== null && (!Number.isFinite(zar) || zar <= 0)) || (usd !== null && (!Number.isFinite(usd) || usd <= 0))) {
      setNotice('Prices must be positive amounts, or left blank while you configure them.');
      return;
    }
    if (draft.enabled && (zar === null || usd === null)) {
      setNotice('Enter both the ZAR and USD prices before enabling this plan.');
      return;
    }
    setPriceSaving(true);
    setNotice('');
    const { error } = await supabase.from('subscription_plan_prices').update({
      price_zar: zar, price_usd: usd, enabled: draft.enabled,
      updated_at: new Date().toISOString(),
    }).eq('plan_code', planCode);
    setPriceSaving(false);
    if (error) { setNotice('Could not save prices. Check admin permissions and apply the subscription payment migration.'); return; }
    setAdminPlanPrices(rows => rows.map(row => row.plan_code === planCode ? { ...row, price_zar: zar, price_usd: usd, enabled: draft.enabled } : row));
    setSubscriptionPrices(current => ({ ...current, [planCode]: { price_zar: zar, price_usd: usd, enabled: draft.enabled } }));
    setNotice('Subscription pricing saved.');
  }

  async function loadSubscriptionPrices() {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke('subscription-pricing', { method: 'GET' });
    if (error || !data?.plans) {
      setCheckoutMessage('Prices are not available yet. Please try again later.');
      return;
    }
    const next: Record<string, { price_zar: number | string | null; price_usd: number | string | null; enabled: boolean }> = {};
    for (const item of data.plans as Array<{ plan_code: string; price_zar: number | string | null; price_usd: number | string | null; enabled: boolean }>) {
      next[item.plan_code] = { price_zar: item.price_zar, price_usd: item.price_usd, enabled: item.enabled };
    }
    setSubscriptionPrices(next);
  }

  async function submitSubscriptionRequest() {
    if (!supabase || !session) { setNotice('Sign in before purchasing a subscription.'); return; }
    if (subscriptionSubmitting) return;
    if (paymentMethod === 'kora_1voucher' && !/^\d{16}$/.test(voucherPin.replace(/\s/g, ''))) {
      setCheckoutMessage('Enter the 16-digit OneVoucher PIN.');
      return;
    }
    if (paymentMethod === 'kora_1voucher' && !/^\+27\d{9}$/.test(voucherPhone.trim())) {
      setCheckoutMessage('Enter your South African mobile number in +27 format.');
      return;
    }
    const planMap: Record<string, string> = { week: 'week', month: 'month', quarter: 'three_months', half: 'six_months', year: 'yearly' };
    setSubscriptionSubmitting(true);
    setCheckoutMessage('');
    setNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
        body: {
          plan_code: planMap[selectedPlan] || 'week',
          provider: paymentMethod,
          idempotency_key: crypto.randomUUID(),
          ...(paymentMethod === 'kora_1voucher' ? { voucher_pin: voucherPin.replace(/\s/g, ''), phone_number: voucherPhone.trim() } : {}),
        },
      });
      if (error || !data) {
        setCheckoutMessage(data?.error || error?.message || 'Could not start checkout. Please try again.');
        return;
      }
      if (data.error) {
        setCheckoutMessage(String(data.error));
        return;
      }
      if (data.checkout_url) {
        setCheckoutMessage('Your secure crypto invoice is ready. Redirecting to NOWPayments…');
        window.location.assign(String(data.checkout_url));
        return;
      }
      if (data.status === 'succeeded') {
        setVoucherPin('');
        setCheckoutMessage(String(data.message || 'Payment confirmed. Refreshing your membership status…'));
      } else {
        setVoucherPin('');
        setCheckoutMessage(String(data.message || 'Payment submitted. Your plan stays locked until the provider confirms payment.'));
      }
      const { data: subscription } = await supabase.from('member_subscriptions')
        .select('plan_code,status,ends_at,payment_verified,promo_chat_until')
        .eq('user_id', session.user.id).maybeSingle();
      if (subscription) setSubscriptionInfo(subscription as typeof subscriptionInfo);
    } catch {
      setCheckoutMessage('A network error prevented checkout. Please try again.');
    } finally {
      setSubscriptionSubmitting(false);
    }
  }

  async function refreshSubscriptionStatus() {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from('member_subscriptions')
      .select('plan_code,status,ends_at,payment_verified,promo_chat_until')
      .eq('user_id', session.user.id).maybeSingle();
    if (error) setCheckoutMessage('Could not refresh membership status. Please try again.');
    else if (data) {
      setSubscriptionInfo(data as typeof subscriptionInfo);
      setCheckoutMessage(data.status === 'active' && data.payment_verified
        ? 'Payment verified. Your subscription is active.'
        : 'Payment is still awaiting provider confirmation. Paid features remain locked.');
    }
  }

  async function reviewSubscription(userId: string, planCode: string, approve: boolean) {
    if (!supabase || !session || !isAdmin) return;
    const confirmation = approve
      ? `Confirm you independently verified payment for the ${planCode} plan from member ${userId}. This will activate the subscription immediately.`
      : `Decline the ${planCode} subscription request from member ${userId}?`;
    if (!window.confirm(confirmation)) return;
    const { error } = await supabase!.rpc('admin_set_subscription', { p_user_id: userId, p_plan_code: planCode, p_approve: approve });
    if (error) { setNotice('Subscription review failed. Check administrator permissions.'); return; }
    setAdminSubscriptions(current => current.filter(item => item.user_id !== userId));
    setNotice(approve ? 'Subscription approved and activated.' : 'Subscription request declined.');
  }

  async function updateReportStatus(reportId: string, status: 'reviewing' | 'resolved' | 'dismissed') {
    if (!supabase || !session || !isAdmin) return;
    const { error } = await supabase!.from('member_reports').update({ status }).eq('id', reportId);
    if (error) { setNotice('Could not update this report.'); return; }
    setAdminReports(current => current.map(report => report.id === reportId ? { ...report, status } : report));
    setNotice('Report marked ' + status + '.');
  }

  async function setMemberSuspension(userId: string, suspend: boolean) {
    if (!supabase || !session || !isAdmin) return;
    const label = suspend ? 'suspend this member for 24 hours' : 'lift this member’s suspension';
    if (!window.confirm('Are you sure you want to ' + label + '?')) return;
    const { error } = await supabase.rpc('admin_set_member_suspension', { p_user_id: userId, p_suspend: suspend });
    if (error) {
      setNotice(error.message.includes('Administrator access required') ? 'Your account is not authorized for this action.' : 'Could not update the member suspension. Please try again.');
      return;
    }
    const until = suspend ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    setSafetyStatus(current => {
      const existing = current.find(item => item.user_id === userId);
      const nextItem = { user_id: userId, strike_count: existing?.strike_count || 0, suspended_until: until, updated_at: new Date().toISOString() };
      return existing ? current.map(item => item.user_id === userId ? nextItem : item) : [nextItem, ...current];
    });
    setNotice(suspend ? 'Member suspended for 24 hours.' : 'Member suspension lifted.');
  }

  useEffect(() => {
    if (!supabase) { setCheckingSession(false); return; }
    supabase!.auth.getSession().then(({ data, error }) => {
      if (error) setNotice(error.message);
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setMyProfile(null); setMatches([]); setLiked(() => { try { return JSON.parse(localStorage.getItem('dateme-ai-likes') || '[]') as string[]; } catch { return []; } }); setMessages([]);
      setProfiles(aiProfiles);
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
      setProfiles([...(people.data as Profile[] || []).filter((profile) => !profile.id.startsWith('ai-')), ...aiProfiles]);
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
      const { data, error } = await supabase!.from('messages').select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path, deleted_at, deleted_by').eq('match_id', activeMatchId).order('created_at', { ascending: true }).limit(200);
      // Expired messages are removed whenever a conversation is opened/refreshed.
      await supabase!.from('messages').delete().eq('match_id', activeMatchId).lt('expires_at', new Date().toISOString());
      if (cancelled) return;
      if (error) setNotice('Could not load this conversation.');
      else {
        const rows = (data || []) as Message[];
        const { data: hiddenRows } = await supabase!.from('message_hidden_for').select('message_id').eq('user_id', session!.user.id);
        const hidden = (hiddenRows || []).map((row) => String(row.message_id));
        if (cancelled) return;
        setHiddenMessageIds(hidden);
        setMessages(rows.filter((message) => !hidden.includes(message.id)));
        if (rows.length) {
          const { data: receiptRows } = await supabase!.from('message_receipts').select('message_id,user_id,delivered_at,read_at').in('message_id', rows.map((message) => message.id));
          if (receiptRows) setMessageReceipts((current) => ({ ...current, ...Object.fromEntries((receiptRows as MessageReceipt[]).map((receipt) => [receipt.message_id, receipt])) }));
          const incoming = rows.filter((message) => message.sender_id !== session!.user.id && !message.deleted_at);
          await Promise.all(incoming.map((message) => supabase!.from('message_receipts').upsert({ message_id: message.id, user_id: session!.user.id, delivered_at: new Date().toISOString(), read_at: new Date().toISOString() }, { onConflict: 'message_id,user_id' })));
        }
      }
    }
    void loadMessages();
    const channel = supabase!.channel(`messages-${activeMatchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` }, (payload) => {
        const next = payload.new as Message;
        if (next.expires_at && new Date(next.expires_at).getTime() <= Date.now()) return;
        setMessages((current) => current.some((item) => item.id === next.id) || hiddenMessageIds.includes(next.id) ? current : [...current, next]);
        if (next.sender_id !== session!.user.id) void supabase!.from('message_receipts').upsert({ message_id: next.id, user_id: session!.user.id, delivered_at: new Date().toISOString(), read_at: new Date().toISOString() }, { onConflict: 'message_id,user_id' });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts' }, async () => {
        const { data: currentMessages } = await supabase!.from('messages').select('id').eq('match_id', activeMatchId).limit(200);
        const ids = (currentMessages || []).map((message) => message.id);
        if (!ids.length) return;
        const { data } = await supabase!.from('message_receipts').select('message_id,user_id,delivered_at,read_at').in('message_id', ids);
        if (data) setMessageReceipts((current) => ({ ...current, ...Object.fromEntries((data as MessageReceipt[]).map((receipt) => [receipt.message_id, receipt])) }));
      }).subscribe();
    return () => { cancelled = true; void supabase!.removeChannel(channel); };
  }, [session, activeMatchId]);

  const ageFilterError = (() => {
    const minAge = minAgeFilter.trim() ? Number(minAgeFilter) : null;
    const maxAge = maxAgeFilter.trim() ? Number(maxAgeFilter) : null;
    if (minAge !== null && (!Number.isInteger(minAge) || minAge < 18 || minAge > 120)) return 'Minimum age must be a whole number from 18 to 120.';
    if (maxAge !== null && (!Number.isInteger(maxAge) || maxAge < 18 || maxAge > 120)) return 'Maximum age must be a whole number from 18 to 120.';
    if (minAge !== null && maxAge !== null && minAge > maxAge) return 'Minimum age cannot be greater than maximum age.';
    return '';
  })();

  const visibleProfiles = useMemo(
    () => (tab === 'likes' ? profiles.filter((profile) => liked.includes(profile.id)) : profiles).filter((profile) => {
      if (ageFilterError || blockedIds.includes(profile.id)) return false;
      const searchable = (profile.display_name + ' ' + (profile.city || '') + ' ' + (profile.bio || '') + ' ' + (profile.interests || []).join(' ')).toLowerCase();
      if (!searchable.includes(searchText.toLowerCase())) return false;
      const minAge = minAgeFilter ? Number(minAgeFilter) : null;
      const maxAge = maxAgeFilter ? Number(maxAgeFilter) : null;
      if (minAge !== null && (!profile.age || profile.age < minAge)) return false;
      if (maxAge !== null && (!profile.age || profile.age > maxAge)) return false;
      if (cityFilter.trim() && !(profile.city || '').toLowerCase().includes(cityFilter.trim().toLowerCase())) return false;
      return true;
    }),
    [profiles, liked, tab, blockedIds, searchText, minAgeFilter, maxAgeFilter, cityFilter, ageFilterError],
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
      if (mode === 'forgot') {
        const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` });
        if (error) throw error;
        setNotice('If an account exists for that email, a password reset link has been sent. Check your inbox.');
      } else if (mode === 'signup') {
        const enteredReferral = referralInput.trim();
        if (enteredReferral) {
          let referralCode = enteredReferral;
          try {
            const parsed = new URL(enteredReferral);
            referralCode = parsed.searchParams.get('ref') || enteredReferral;
          } catch {
            referralCode = enteredReferral.replace(/^ref=/i, '').trim();
          }
          if (referralCode) localStorage.setItem('dateme-pending-referral', referralCode);
        }
        const age = Number(signupAge);
        if (!Number.isInteger(age) || age < 18 || age > 120) throw new Error('DateMe is for adults aged 18 and over. Please enter a valid age.');
        if (displayName.trim().length < 2) throw new Error('Please enter a name with at least 2 characters.');
        const { data, error } = await supabase!.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim(), age } } });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase!.from('profiles').upsert({ id: data.user.id, display_name: displayName.trim(), age, city: null, bio: null, photo_url: null }, { onConflict: 'id', ignoreDuplicates: true });
          if (profileError) setNotice('Your account was created, but your profile needs finishing in My profile.');
        }
        if (data.session) setNotice('Welcome to DateMe! Your account is ready.');
        else { setNotice('Check your email for a confirmation link, then come back to sign in.'); setMode('signin'); }
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setNotice('You are signed in. Welcome back!');
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase!.auth.signOut();
    setNotice(error ? error.message : 'You have signed out.');
    setTab('discover'); setActiveMatchId('');
  }

  async function handleLike(profile: Profile) {
    if (!session || !supabase) {
      setLiked((current) => { const next = current.includes(profile.id) ? current : [...current, profile.id]; try { localStorage.setItem('dateme-ai-likes', JSON.stringify(next.filter((id) => id.startsWith('ai-')))); } catch {} return next; });
      setNotice('Like saved on this device.');
      return;
    }
    if (profile.id.startsWith('ai-')) {
      if (liked.includes(profile.id)) { setNotice(`You have already liked ${profile.display_name}.`); return; }
      setLiked((current) => { const next = [...current, profile.id]; try { localStorage.setItem('dateme-ai-likes', JSON.stringify(next.filter((id) => id.startsWith('ai-')))); } catch {} return next; });
      setNotice(`You liked ${profile.display_name}. This AI profile is a demo profile.`);
      return;
    }
    if (liked.includes(profile.id)) {
      setNotice(`You have already liked ${profile.display_name}.`);
      return;
    }
    const { error } = await supabase!.from('likes').upsert(
      { user_id: session.user.id, liked_user_id: profile.id },
      { onConflict: 'user_id,liked_user_id', ignoreDuplicates: true },
    );
    if (error) { setNotice('Could not save that like. Please try again.'); return; }
    setLiked((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    // The database trigger creates a match on a mutual like. Check matches rather
    // than querying another member's likes, which RLS correctly keeps private.
    const { data: newMatches } = await supabase!.from('matches').select('id, user_one, user_two, created_at').or(`user_one.eq.${session.user.id},user_two.eq.${session.user.id}`).order('created_at', { ascending: false });
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
    const { error } = await supabase!.from('member_reports').insert({ reporter_id: session.user.id, reported_user_id: profile.id, reason: reason.trim().slice(0, 120), details: details.trim().slice(0, 2000), status: 'open' });
    setNotice(error ? 'Report could not be submitted. Please try again.' : 'Thank you. Your report has been sent for review.');
  }

  async function blockMember(profile: Profile) {
    if (!supabase || !session) { setNotice('Sign in to block a member.'); return; }
    if (!window.confirm('Block ' + profile.display_name + '? Their profile will be hidden from your discovery list.')) return;
    const { error } = await supabase!.from('member_blocks').upsert({ blocker_id: session.user.id, blocked_user_id: profile.id }, { onConflict: 'blocker_id,blocked_user_id', ignoreDuplicates: true });
    if (error) { setNotice('Could not block this member. Please try again.'); return; }
    setBlockedIds((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    setNotice(profile.display_name + ' has been blocked from your discovery list.');
  }

  async function unblockMember(blockedUserId: string) {
    if (!supabase || !session) return;
    const blockedPerson = profiles.find((profile) => profile.id === blockedUserId);
    const displayName = blockedPerson?.display_name || 'This member';
    if (!window.confirm('Unblock ' + displayName + '? Their profile may appear in discovery again.')) return;
    const { error } = await supabase.from('member_blocks').delete()
      .eq('blocker_id', session.user.id).eq('blocked_user_id', blockedUserId);
    if (error) { setNotice('Could not unblock this member. Please try again.'); return; }
    setBlockedIds((current) => current.filter((id) => id !== blockedUserId));
    setNotice(displayName + ' has been unblocked. You can block them again at any time.');
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
      const { error: uploadError } = await supabase!.storage.from('dateme-avatars').upload(filePath, photoFile, { contentType: photoFile.type, upsert: false });
      if (uploadError) { setBusy(false); setNotice('Photo upload failed. Please try another image.'); return; }
      photoUrl = supabase!.storage.from('dateme-avatars').getPublicUrl(filePath).data.publicUrl;
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
    const { data, error } = await supabase!.from('profiles').upsert(payload, { onConflict: 'id' }).select('id, display_name, age, city, bio, photo_url, interests, prompt_question, prompt_answer, looking_for, languages').single();
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
    if (demoChatPerson && contactPattern.test(body)) {
      setNotice('********* Message hidden: phone numbers, emails, links and social/contact details are not allowed in DateMe chat. Repeated attempts may suspend your account for 24 hours. This is a demo chat.');
      return;
    }
    if (demoChatPerson) {
      const now = new Date().toISOString();
      const mine: Message = { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: 'demo-you', body, created_at: now, demo: true };
      setDemoMessages(current => [...current, mine]);
      setMessageText('');
      const count = demoReplyCount + 1;
      setDemoReplyCount(count);
      const lower = body.toLowerCase();
      const reply = /\b(hi|hello|hey)\b/.test(lower) ? `Hey 😊 I'm ${demoChatPerson.display_name}. How's your day going?` : /\b(work|job|career)\b/.test(lower) ? 'Tell me more about what you do. What do you enjoy most about it? 😊' : /\b(hobby|hobbies|love doing|free time)\b/.test(lower) ? 'That sounds interesting! I enjoy discovering new things too. What got you into that? 💛' : /\b(date|meet|coffee)\b/.test(lower) ? 'A relaxed coffee and a good conversation sounds lovely ☕ What kind of place do you like?' : /\b(sad|bad day|upset|stress)\b/.test(lower) ? "I'm sorry it's been a tough one. Want to tell me what happened? I'm listening 💛" : demoReplies[(count - 1) % demoReplies.length];
      window.setTimeout(() => setDemoMessages(current => [...current, { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: demoChatPerson.id, body: reply, created_at: new Date().toISOString(), demo: true }]), 850);
      return;
    }
    if (!supabase || !session || !activeMatchId) return;
    const { data: matchRow } = await supabase!.from('matches').select('user_one, user_two').eq('id', activeMatchId).maybeSingle();
    if (!matchRow || ![matchRow.user_one, matchRow.user_two].includes(session.user.id)) { setNotice('This conversation is no longer available.'); return; }
    const otherUserId = matchRow.user_one === session.user.id ? matchRow.user_two : matchRow.user_one;
    const { data: blockRows } = await supabase!.from('member_blocks').select('id').or(`and(blocker_id.eq.${session.user.id},blocked_user_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_user_id.eq.${session.user.id})`).limit(1);
    if (blockRows?.length) { setNotice('Messaging is unavailable because one of these accounts has blocked the other.'); return; }
    const { data, error } = await supabase!.from('messages').insert({ match_id: activeMatchId, sender_id: session.user.id, body, reply_to: replyTo?.id || null, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').single();
    if (error) {
      if (error.message?.includes('ACCOUNT_SUSPENDED_24H')) setNotice('Your account has been suspended for 24 hours. Contact the DateMe administrator.');
      else setNotice('Message could not be sent. Messaging is only available to matched members.');
      return;
    }
    if (data) {
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
      if (data.body === '*********') setNotice('********* Your message contained blocked contact details or suspicious number/link patterns. It was replaced with asterisks. Repeated attempts may suspend your account for 24 hours. Contact the administrator if suspended.');
    }
    setMessageText(''); setReplyTo(null); setShowEmojiPicker(false);
  }

  async function translateMessage(message: Message, target = translationTarget) {
    setTranslationPanel({ messageId: message.id, original: message.body, translated: '', loading: true, error: '' });
    try {
      const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(message.body)}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Translation service is temporarily unavailable.');
      const payload = await response.json() as unknown[][];
      const segments = Array.isArray(payload[0]) ? payload[0] as unknown[][] : [];
      const translated = segments.map((segment) => typeof segment[0] === 'string' ? segment[0] : '').join('');
      if (!translated) throw new Error('No translation was returned. Try again shortly.');
      setTranslationPanel({ messageId: message.id, original: message.body, translated, loading: false, error: '' });
    } catch {
      setTranslationPanel({ messageId: message.id, original: message.body, translated: '', loading: false, error: 'Translation is temporarily unavailable. Check your connection or try again.' });
    }
  }

  async function deleteMessage(message: Message, forEveryone: boolean) {
    if (!supabase || !session) return;
    if (forEveryone && message.sender_id !== session.user.id) return;
    const prompt = forEveryone ? 'Delete this message for everyone in this conversation?' : 'Delete this message from your chat only?';
    if (!window.confirm(prompt)) return;
    if (forEveryone) {
      const { error } = await supabase.from('messages').update({ body: 'This message was deleted', audio_path: null, deleted_at: new Date().toISOString(), deleted_by: session.user.id }).eq('id', message.id).eq('sender_id', session.user.id);
      if (error) { setNotice('Could not delete this message for everyone. Please try again.'); return; }
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: 'This message was deleted', audio_path: null, deleted_at: new Date().toISOString(), deleted_by: session.user.id } : item));
    } else {
      const { error } = await supabase.from('message_hidden_for').upsert({ message_id: message.id, user_id: session.user.id }, { onConflict: 'message_id,user_id' });
      if (error) { setNotice('Could not delete this message from your view. Please try again.'); return; }
      setHiddenMessageIds((current) => current.includes(message.id) ? current : [...current, message.id]);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      if (translationPanel?.messageId === message.id) setTranslationPanel(null);
    }
    setNotice(forEveryone ? 'Message deleted for everyone.' : 'Message deleted from your chat.');
  }

  async function hasPaidMediaAccess(): Promise<boolean> {
    if (!supabase || !session || !activeMatchId) return false;
    const { data: matchRow } = await supabase!.from('matches').select('user_one,user_two').eq('id', activeMatchId).maybeSingle();
    if (!matchRow || ![matchRow.user_one, matchRow.user_two].includes(session.user.id)) return false;
    const otherId = matchRow.user_one === session.user.id ? matchRow.user_two : matchRow.user_one;
    const { data: plans } = await supabase!.from('member_subscriptions').select('user_id,plan_code,status,payment_verified,ends_at').in('user_id', [session.user.id, otherId]);
    return Boolean(plans && plans.length === 2 && plans.every(p => p.status === 'active' && p.payment_verified && p.ends_at && new Date(p.ends_at).getTime() > Date.now()) && plans[0].plan_code === plans[1].plan_code);
  }

  async function startVoiceRecording() {
    if (!await hasPaidMediaAccess()) { setNotice('Voice notes require both matched members to have the same active, verified paid subscription tier.'); return; }
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
    if (!await hasPaidMediaAccess()) { setNotice('Voice notes require both matched members to have the same active, verified paid subscription tier.'); return; }
    if (voiceBlob.size > 5 * 1024 * 1024) {
      setNotice('That voice note is too large. Please record a shorter note (maximum 5 MB).');
      return;
    }
    setRecordingBusy(true);
    const { data: matchRow } = await supabase!.from('matches').select('user_one, user_two').eq('id', activeMatchId).maybeSingle();
    if (!matchRow || ![matchRow.user_one, matchRow.user_two].includes(session.user.id)) {
      setNotice('This conversation is no longer available.');
      setRecordingBusy(false);
      return;
    }
    const otherUserId = matchRow.user_one === session.user.id ? matchRow.user_two : matchRow.user_one;
    const { data: blockRows } = await supabase!.from('member_blocks').select('id').or(`and(blocker_id.eq.${session.user.id},blocked_user_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_user_id.eq.${session.user.id})`).limit(1);
    if (blockRows?.length) {
      setNotice('Sending voice notes is unavailable because one of these accounts has blocked the other.');
      setRecordingBusy(false);
      return;
    }
    const path = `${activeMatchId}/${session.user.id}/${crypto.randomUUID()}.webm`;
    const { error: uploadError } = await supabase!.storage.from('dateme-voice-notes').upload(path, voiceBlob, { contentType: voiceBlob.type || 'audio/webm', upsert: false });
    if (uploadError) { setNotice('Voice note upload is not ready yet. Please check the voice-note storage bucket setup.'); setRecordingBusy(false); return; }
    const { data, error } = await supabase!.from('messages').insert({ match_id: activeMatchId, sender_id: session.user.id, body: '🎙️ Voice note', audio_path: path, reply_to: replyTo?.id || null, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').single();
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
      void supabase!.from('profiles').select('id, display_name, age, city, bio, photo_url').eq('id', otherId).maybeSingle()
        .then(({ data }) => { if (data) setProfiles((current) => [...current.filter((p) => p.id !== data.id), data as Profile]); });
    }
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-menu-wrap">
          <button className="brand-logo brand-logo-small logo-home-button" onClick={() => { navigateTo(session ? "discover" : "register"); setMenuOpen(false); window.scrollTo(0,0); }} aria-label="DateMe home"><DateMeLogo /></button>
          <button className="portal-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span></span><span></span><span></span></button>
          {menuOpen && <nav className="portal-menu" aria-label="DateMe portals">
            <button onClick={() => { navigateTo(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Main page</button>
            <button onClick={() => { navigateTo(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo(0,0); }}>Discover / member portal</button>
            <button onClick={() => { navigateTo('plans'); setMenuOpen(false); window.scrollTo(0,0); }}>Subscription plans</button>
            <button onClick={() => { navigateTo('how'); setMenuOpen(false); window.scrollTo(0,0); }}>How DateMe works</button>
            <button onClick={() => { navigateTo('safety'); setMenuOpen(false); window.scrollTo(0,0); }}>Safety centre</button>
            <button onClick={() => { navigateTo('admin'); setMenuOpen(false); window.scrollTo(0,0); }}>Admin portal</button>
            <button onClick={() => { setTheme(theme === 'rose' ? 'navy' : theme === 'navy' ? 'green' : 'rose'); setMenuOpen(false); }}>Change theme: {theme === 'rose' ? 'Rose' : theme === 'navy' ? 'Navy' : 'Green'}</button>
            {!session && <button onClick={() => { navigateTo('register'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Register / sign in</button>}
          </nav>}
        </div>
        <nav className="top-links" aria-label="Main navigation"><button onClick={() => { navigateTo("how"); setMenuOpen(false); window.scrollTo(0,0); }}>How it works</button><button onClick={() => { navigateTo("safety"); setMenuOpen(false); window.scrollTo(0,0); }}>Your safety</button>{session && <button onClick={() => { setPage("plans"); setMenuOpen(false); window.scrollTo(0,0); }}>Membership</button>}</nav>
        {session ? <button className="button button-outline top-action" onClick={() => void handleSignOut()}>Sign out</button> : <button className="button button-outline top-action" onClick={() => { navigateTo(session ? 'discover' : 'register'); setMode('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Log in</button>}
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
            <div className="portal-page-actions auth-page-actions"><button type="button" onClick={() => { setMode(mode === 'forgot' ? 'signin' : mode === 'signin' ? 'signup' : 'signin'); setNotice(''); }}>← Back</button><button type="button" onClick={() => { navigateTo('discover'); setNotice(''); window.scrollTo({top:0,behavior:'smooth'}); }}>× Close</button></div><div className="registration-logo"><DateMeLogo /></div>
            <div className="card-heading"><h2>{mode === 'signup' ? 'Create your DateMe account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2><p>{mode === 'signup' ? 'Your story starts with a few details.' : mode === 'forgot' ? 'We’ll email you a secure reset link.' : 'Your next chapter is waiting.'}</p></div>
            <div className="auth-switch" role="tablist" aria-label="Account type"><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }} role="tab" aria-selected={mode === 'signup'}>Create account</button><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(''); }} role="tab" aria-selected={mode === 'signin'}>Log in</button></div>
            <form onSubmit={handleAuth} className="auth-form">
              {mode === 'signup' && <><label>Full name<input autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your full name" required minLength={2} maxLength={100} /></label><label>Your age (18+)<input type="number" inputMode="numeric" min={18} max={120} value={signupAge} onChange={(e) => setSignupAge(e.target.value)} placeholder="18 or older" required /></label><label>Referral link or code (optional)<input autoComplete="off" value={referralInput} onChange={(e) => setReferralInput(e.target.value)} placeholder="Paste a DateMe referral link or code" aria-describedby="referral-help" /></label><small id="referral-help">Invited by a DateMe member? Paste their full link or referral code here.</small></>}
              <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
              <>{mode !== 'forgot' && <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button></div></label>}
              <button className="button button-primary submit-button" type="submit" disabled={busy || checkingSession}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : mode === 'forgot' ? 'Send reset link' : 'Log in'} <span>→</span></button>
              {mode === 'signin' && <button className="forgot-password" type="button" onClick={() => { setMode('forgot'); setNotice(''); }}>Forgot password?</button>}
              {mode === 'forgot' && <button className="forgot-password" type="button" onClick={() => { setMode('signin'); setNotice(''); }}>Back to log in</button>}</>
              <p className="terms">By continuing, you agree to treat people with kindness and respect.</p>
            </form>
            {notice && <p className="notice" role="status">{notice}</p>}
            {!isSupabaseConfigured && <p className="setup-hint"><span>ⓘ</span> Preview mode: add your Supabase keys to enable real accounts.</p>}
          </div>
        </section>}

        {page === 'discover' && <section className="discover-section" id="discover">
          <div className="portal-page-actions discover-page-actions"><button type="button" onClick={() => { setTab('discover'); setActiveMatchId(''); setReplyTo(null); }}>← Back</button><button type="button" onClick={() => { setActiveMatchId(''); setReplyTo(null); setVoicePreview(null); setVoiceBlob(null); setTab('discover'); }}>× Close</button></div><div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE, REAL POSSIBILITIES</span><h2>{session ? tab === 'matches' ? 'Your connections' : tab === 'profile' ? 'Your story, your way' : 'People you might like' : 'A little closer to your person'}</h2><p>Start with a smile. See where a conversation takes you.</p></div><span className="section-flower" aria-hidden="true">✳</span></div>
          {session && <div className="discover-search"><span>⌕</span><input aria-label="Search members" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name, city or interests…" /><button type="button" onClick={() => setSearchText('')}>Clear</button></div>}
          {session && tab !== 'profile' && <div className="discover-filter-row" aria-label="Profile filters">
            <label>City<input aria-label="Filter by city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Any city" maxLength={80} /></label>
            <label>Minimum age<input aria-label="Minimum age" type="number" min={18} max={120} value={minAgeFilter} onChange={(e) => setMinAgeFilter(e.target.value)} placeholder="18" /></label>
            <label>Maximum age<input aria-label="Maximum age" type="number" min={18} max={120} value={maxAgeFilter} onChange={(e) => setMaxAgeFilter(e.target.value)} placeholder="120" /></label>
            <button type="button" onClick={() => { setCityFilter(''); setMinAgeFilter(''); setMaxAgeFilter(''); setSearchText(''); }}>Clear filters</button>
            {ageFilterError && <p className="filter-validation" role="alert">{ageFilterError}</p>}
          </div>}
          {session && tab !== 'profile' && !ageFilterError && <p className="filter-result-count" role="status">Showing {visibleProfiles.length} {visibleProfiles.length === 1 ? 'profile' : 'profiles'}{tab === 'likes' ? ' you liked' : ''}.</p>}
          {session && <div className="member-bar"><span>Signed in as <strong>{session.user.email}</strong></span><div className="member-tabs">
            <button className={tab === 'discover' ? 'selected' : ''} onClick={() => { setTab('discover'); setActiveMatchId(''); }}>Discover</button>
            <button className={tab === 'likes' ? 'selected' : ''} onClick={() => { setTab('likes'); setActiveMatchId(''); }}>Likes ({liked.length})</button>
            <button className={tab === 'matches' ? 'selected' : ''} onClick={() => setTab('matches')}>Matches ({matches.length})</button>
            <button className={tab === 'profile' ? 'selected' : ''} onClick={() => { setTab('profile'); setActiveMatchId(''); }}>My profile</button>
          </div></div>}

          {session && tab === 'profile' && <section className="profile-editor affiliate-panel">
            <div className="editor-fields">
              <h2>Your safety controls</h2>
              <p>Manage members you have blocked. Unblocking allows their profile to appear in discovery again; it does not automatically restore a match or conversation.</p>
              <div className="blocked-member-list">
                {blockedIds.length === 0 ? <p>No members blocked.</p> : blockedIds.map((blockedUserId) => {
                  const blockedPerson = profiles.find((profile) => profile.id === blockedUserId);
                  return <div className="report-row" key={blockedUserId}>
                    <strong>{blockedPerson?.display_name || 'Blocked member'}</strong>
                    <small>{blockedPerson?.city || 'Member profile'}</small>
                    <button className="button button-outline" type="button" onClick={() => void unblockMember(blockedUserId)}>Unblock</button>
                  </div>;
                })}
              </div>
              <h2>Your affiliate link</h2>
              <p>Invite people to DateMe with your personal referral link. This promotion is being rolled out; rewards and unlimited-chat eligibility are subject to the activity and subscription rules.</p>
              {affiliateCode ? <><label>Your personal link<input readOnly value={`${window.location.origin}/?ref=${affiliateCode}`} /></label><button className="button button-primary" type="button" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/?ref=${affiliateCode}`).then(() => setNotice('Your affiliate link has been copied.')).catch(() => setNotice('Copy failed. Please copy the link manually.')); }}>Copy my affiliate link</button><p>Referral code: <strong>{affiliateCode}</strong></p></> : <p>Generating your personal referral link…</p>}
              <h3>Your referrals ({affiliateReferrals.length})</h3>
              {affiliateReferrals.length === 0 ? <p>No referrals yet. Share your link to invite your first member.</p> : affiliateReferrals.map((referral) => <div className="report-row" key={referral.id}><strong>{referral.status}</strong><span>{referral.qualifying_minutes_today || 0} qualifying minutes today</span><small>Joined {new Date(referral.created_at).toLocaleDateString()}</small>{referral.promo_ends_at && <small>Promotion ends {new Date(referral.promo_ends_at).toLocaleString()}</small>}</div>)}
              <p>Qualifying chat activity today: {Math.floor(affiliateActivitySeconds / 60)} minutes / 120 minutes. Activity is counted only while you are signed in, the app is visible, and a matched conversation is open.</p>
            </div>
          </section>}
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

          {session && tab === 'matches' && <div className={activeMatchId ? 'match-layout chat-open' : 'match-layout'}>
            <aside className="match-list"><h3>Your matches</h3>{matches.length === 0 ? <p className="muted-copy">When you and another member like each other, your match will appear here.</p> : matches.map((match) => {
              const otherId = match.user_one === session.user.id ? match.user_two : match.user_one;
              const person = profiles.find((p) => p.id === otherId);
              return <button key={match.id} className={activeMatchId === match.id ? 'match-row active' : 'match-row'} onClick={() => openChat(match)}><span className="match-avatar">{person?.photo_url ? <img src={person.photo_url} alt="" /> : '♡'}</span><span><strong>{person?.display_name || 'Your match'}</strong><small>{person?.city || 'Say hello'}</small></span><span className="match-arrow">›</span></button>;
            })}</aside>
            <section className="chat-panel">{activeMatch ? <>
              <div className="chat-heading"><button type="button" className="chat-back-button" aria-label="Back to matches" onClick={() => { setActiveMatchId(''); setReplyTo(null); setTranslationPanel(null); }}>←</button><span className="match-avatar">{activePerson?.photo_url ? <img src={activePerson.photo_url} alt="" /> : '♡'}</span><div className="chat-heading-person"><strong>{activePerson?.display_name || 'Your match'}</strong><small>● Online chat · private conversation</small></div><button type="button" className="chat-header-more" title="Close conversation" onClick={() => { setActiveMatchId(''); setReplyTo(null); setTranslationPanel(null); }}>×</button></div>
              <div className="chat-tools-note">🔒 Private chat · messages expire after 24 hours</div>
              <div className="chat-messages">{messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).length === 0 ? <p className="chat-empty">Every great conversation starts somewhere. Say hello 👋</p> : messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).map((message) => { const mine = message.sender_id === session.user.id; const receipt = messageReceipts[message.id]; return <div key={message.id} className={mine ? 'message-bubble mine' : 'message-bubble'}><div className="message-actions"><button type="button" title="Reply to message" aria-label="Reply to message" disabled={Boolean(message.deleted_at)} onClick={() => { setReplyTo(message); setMessageText(''); }}>↶ Reply</button><button type="button" title="Copy message" aria-label="Copy message" disabled={Boolean(message.deleted_at)} onClick={() => { void navigator.clipboard?.writeText(message.body).then(() => setNotice('Message copied.')).catch(() => setNotice('Copy was blocked by your browser.')); }}>Copy</button><button type="button" title="Translate message" aria-label="Translate message" disabled={Boolean(message.deleted_at)} onClick={() => void translateMessage(message)}>Translate</button><button type="button" title="Delete for me" aria-label="Delete for me" onClick={() => void deleteMessage(message, false)}>Delete for me</button>{mine && !message.deleted_at && <button type="button" title="Delete for everyone" aria-label="Delete for everyone" onClick={() => void deleteMessage(message, true)}>Delete for everyone</button>}</div>{message.reply_to && <p className="reply-reference">↶ Replying to an earlier message</p>}{message.deleted_at ? <p className="deleted-message">{message.body || 'This message was deleted'}</p> : message.audio_path && supabase ? <audio controls preload="none" src={voiceUrls[message.id] || undefined} /> : <p>{message.body}</p>}<time>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && !message.deleted_at && <span className={receipt?.read_at ? 'message-status read' : receipt?.delivered_at ? 'message-status delivered' : 'message-status sent'} title={receipt?.read_at ? 'Read' : receipt?.delivered_at ? 'Delivered' : 'Sent'} aria-label={receipt?.read_at ? 'Read' : receipt?.delivered_at ? 'Delivered' : 'Sent'}>{receipt?.read_at ? '●' : receipt?.delivered_at ? '●' : '·'}</span>} {!message.deleted_at && ' · disappears in 24h'}</time></div>; })}</div>
              {translationPanel && <aside className="translation-panel" aria-live="polite"><div className="translation-panel-title"><strong>Message translation</strong><button type="button" onClick={() => setTranslationPanel(null)} aria-label="Close translation">×</button></div><label>Translate to <select value={translationTarget} onChange={(event) => { setTranslationTarget(event.target.value); if (translationPanel) void translateMessage({ id: translationPanel.messageId, match_id: activeMatchId, sender_id: '', body: translationPanel.original, created_at: new Date().toISOString() }, event.target.value); }}><option value="en">English</option><option value="af">Afrikaans</option><option value="zu">isiZulu</option><option value="xh">isiXhosa</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option><option value="de">German</option><option value="zh-CN">Chinese (Simplified)</option><option value="zh-TW">Chinese (Traditional)</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="hi">Hindi</option><option value="ar">Arabic</option><option value="sw">Swahili</option><option value="ru">Russian</option><option value="it">Italian</option><option value="nl">Dutch</option><option value="tr">Turkish</option><option value="th">Thai</option></select></label><p className="translation-original"><small>Original message</small>{translationPanel.original}</p><p className="translation-result"><small>Translation</small>{translationPanel.loading ? 'Translating…' : translationPanel.error || translationPanel.translated}</p></aside>}
              {replyTo && <div className="reply-composer"><span>↶ Replying to: {replyTo.body.slice(0, 90)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></div>}
              {voicePreview && <div className="voice-preview"><audio controls src={voicePreview} /><button type="button" onClick={() => { URL.revokeObjectURL(voicePreview); setVoicePreview(null); setVoiceBlob(null); }}>Discard</button><button type="button" onClick={() => void sendVoiceNote()} disabled={recordingBusy}>Send voice note</button></div>}
              {showEmojiPicker && <div className="emoji-picker" aria-label="Emoji picker">{['😀','😂','🥰','😍','😘','😊','😉','❤️','💕','💖','🔥','👏','👍','🙏','🌹','✨','😢','😅','🤗','💋'].map((emoji) => <button type="button" key={emoji} onClick={() => setMessageText((text) => text + emoji)}>{emoji}</button>)}</div>}
              <form className="chat-compose" onSubmit={sendMessage}><button type="button" className="chat-tool-button" aria-label="Choose emoji" title="Emoji" onClick={() => setShowEmojiPicker((show) => !show)}>☺</button><input value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder={replyTo ? 'Write a reply…' : 'Write a kind message…'} aria-label="Message" /><button type="button" className="chat-tool-button" aria-label={recording ? 'Stop recording' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'} onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()} disabled={recordingBusy}>{recording ? '■' : '🎙'}</button><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form>
            </> : <div className="chat-placeholder"><span>♡</span><h3>A little hello goes a long way.</h3><p>Choose a match to start your conversation.</p></div>}</section>
          </div>}

          {(tab === 'discover' || tab === 'likes' || !session) && (visibleProfiles.length ? <div className="profile-grid">
            {visibleProfiles.map((profile, index) => <article className="person-card" key={profile.id}>
              <div className="person-photo-wrap">{profile.photo_url ? <img className="person-photo" src={profile.photo_url} alt={`${profile.display_name}'s profile`} loading="eager" decoding="async" /> : <div className="photo-placeholder">♡</div>}<span className="profile-number">{String(index + 1).padStart(2, '0')}</span>{profile.id.startsWith('ai-') && <span className="profile-number" style={{left:'auto',right:'12px',top:'12px'}}>AI DEMO</span>}<button className={liked.includes(profile.id) ? 'like-button liked' : 'like-button'} onClick={() => void handleLike(profile)} aria-label={`Like ${profile.display_name}`}>{liked.includes(profile.id) ? '♥' : '♡'}</button></div>
              <div className="person-info"><h3>{profile.display_name}{profile.age ? <span>, {profile.age}</span> : null}</h3><p className="person-city"><span>⌖</span> {profile.city || 'Location not set'}</p><p className="person-bio">{profile.bio || 'A little mystery makes the first hello more fun.'}</p>{profile.prompt_question && <div className="profile-prompt"><small>{profile.prompt_question}</small><p>{profile.prompt_answer}</p></div>}{profile.interests?.length ? <div className="interest-chips">{profile.interests.slice(0,5).map((interest) => <span key={interest}>{interest}</span>)}</div> : null}{profile.looking_for && <p className="looking-for">♡ {profile.looking_for}</p>}<button className="say-hello" onClick={() => profile.id.startsWith('ai-') ? (setDemoChatPerson(profile), setDemoMessages([{ id: 'welcome-' + profile.id, match_id: profile.id, sender_id: profile.id, body: `Hi! I'm ${profile.display_name}. 😊 What would you like to talk about today?`, created_at: new Date().toISOString(), demo: true }]), setDemoReplyCount(0), setMessageText('')) : void handleLike(profile)}>{profile.id.startsWith('ai-') ? 'Open AI chat' : liked.includes(profile.id) ? 'Liked' : 'Say hello'} <span>↗</span></button>{session && <div className="profile-safety-actions"><button onClick={() => void reportMember(profile)}>Report</button><button onClick={() => void blockMember(profile)}>Block</button></div>}</div>
            </article>)}
          </div> : <div className="empty-state"><span>♡</span><h3>{tab === 'likes' ? 'No likes match these filters' : 'No profiles match yet'}</h3><p>{tab === 'likes' ? 'Try clearing your filters, or explore people and tap the heart on someone who catches your eye.' : 'Try widening the age range, changing the city, or clearing your search filters. New member profiles will show up here as people join DateMe.'}</p><button className="button button-primary" onClick={() => { setCityFilter(''); setMinAgeFilter(''); setMaxAgeFilter(''); setSearchText(''); if (tab === 'likes') setTab('discover'); }}>Clear filters and discover</button></div>)}
          {!session && <div className="ai-demo-entry"><h3>Try a conversation</h3><p>Choose a simulated profile to test the chat. These are automated demos, not real members.</p><div className="ai-demo-buttons">{aiProfiles.map(person => <button key={person.id} className="button button-outline" onClick={() => { setDemoChatPerson(person); setDemoMessages([{ id: 'welcome-' + person.id, match_id: person.id, sender_id: person.id, body: person.display_name === 'Sarah' ? 'Hi! 😊 I’m Sarah. What’s something that always makes your day better?' : 'Hey there! 👋 What do you enjoy doing on weekends?', created_at: new Date().toISOString(), demo: true }]); setDemoReplyCount(0); setMessageText(''); navigateTo('discover'); setTab('discover'); window.scrollTo(0,0); }}>Chat with {person.display_name} · Demo</button>)}</div></div>}
          {demoChatPerson && <section className="demo-chat-panel"><div className="chat-heading"><span className="match-avatar">{demoChatPerson.photo_url ? <img src={demoChatPerson.photo_url} alt="" /> : '♡'}</span><div><strong>{demoChatPerson.display_name} · AI demo</strong><small>Automated practice chat — not a real member</small></div><button className="button button-outline" onClick={() => { setDemoChatPerson(null); setDemoMessages([]); }}>Close</button></div><div className="chat-tools-note">🔒 Simulated chat · contact details are blocked</div><div className="chat-messages">{demoMessages.map(message => <div key={message.id} className={message.sender_id === 'demo-you' ? 'message-bubble mine' : 'message-bubble'}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>)}</div><form className="chat-compose" onSubmit={sendMessage}><input value={messageText} onChange={e => setMessageText(e.target.value)} maxLength={2000} placeholder="Try saying hello…" aria-label="Demo chat message" /><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form></section>}
          {!session && <p className="demo-caption">Demo profiles and simulated chats are examples only, not real members. Create an account to connect with real members.</p>}
          {notice && session && <p className="notice member-notice" role="status">{notice}</p>}
        </section>}

        {page === 'plans' && <section className="portal-page membership-section" id="membership-plans"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">YOUR JOURNEY, YOUR PACE</span><h2>Membership <span>plans.</span></h2><p>Choose a subscription period and pay securely with cryptocurrency or OneVoucher. Paid features unlock only after the payment provider confirms your payment.</p>{session && <p>Your current status: <strong>{subscriptionInfo?.status || 'free'}</strong> · Plan: <strong>{subscriptionInfo?.plan_code || 'free'}</strong>{subscriptionInfo?.ends_at ? ` · Ends ${new Date(subscriptionInfo.ends_at).toLocaleDateString()}` : ''} <button type="button" onClick={() => void refreshSubscriptionStatus()}>Refresh status</button></p>}<div className="plan-periods">{[{id:'week',label:'Per Week',period:'7 days'},{id:'month',label:'Per Month',period:'1 month'},{id:'quarter',label:'3 Months',period:'3 months'},{id:'half',label:'6 Months',period:'6 months'},{id:'year',label:'1 Year',period:'12 months'}].map(plan => <button key={plan.id} className={selectedPlan===plan.id?'plan-period selected':'plan-period'} onClick={() => { setSelectedPlan(plan.id); setSubscriptionPortalOpen(true); setCheckoutMessage(''); setVoucherPin(''); if (!Object.keys(subscriptionPrices).length) void loadSubscriptionPrices(); }}>{plan.label}<small>{plan.period}</small></button>)}</div>{subscriptionPortalOpen ? <div className="plan-detail subscription-plan-detail"><div className="portal-page-actions"><button type="button" onClick={() => setSubscriptionPortalOpen(false)}>← Back to plans</button><button type="button" onClick={closePage}>× Close</button></div><span className="draft-label">SECURE MEMBERSHIP CHECKOUT</span><h3>{{week:'Per Week · 7 days',month:'Per Month',quarter:'3 Months',half:'6 Months',year:'1 Year · 12 months'}[selectedPlan]}</h3><p>{(() => { const code = ({week:'week',month:'month',quarter:'three_months',half:'six_months',year:'yearly'} as Record<string,string>)[selectedPlan]; const price = subscriptionPrices[code]; const amount = paymentMethod==='nowpayments' ? price?.price_usd : price?.price_zar; const currency = paymentMethod==='nowpayments' ? 'USD' : 'ZAR'; return price?.enabled && amount != null && Number(amount)>0 ? `Price: ${new Intl.NumberFormat(paymentMethod==='nowpayments' ? 'en-US' : 'en-ZA',{style:'currency',currency}).format(Number(amount))}` : 'Price is being configured. Checkout will remain unavailable until this plan has an official price.'; })()} Do not send payment to anyone outside this checkout.</p><div className="subscription-promo"><h4>Choose payment method</h4><div className="subscription-preferences plan-preference-controls"><label><input type="radio" name="payment-method" value="nowpayments" checked={paymentMethod==='nowpayments'} onChange={() => { setPaymentMethod('nowpayments'); setCheckoutMessage(''); }} /> Cryptocurrency · NOWPayments</label><label><input type="radio" name="payment-method" value="kora_1voucher" checked={paymentMethod==='kora_1voucher'} onChange={() => { setPaymentMethod('kora_1voucher'); setCheckoutMessage(''); }} /> OneVoucher · South African rand (ZAR)</label></div>{paymentMethod==='kora_1voucher' && <div className="subscription-preferences plan-preference-controls"><label htmlFor="voucher-pin">OneVoucher PIN</label><input id="voucher-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={19} value={voucherPin} onChange={e => setVoucherPin(e.target.value.replace(/[^0-9 ]/g, '').slice(0,19))} placeholder="Enter your 16-digit PIN" /><label htmlFor="voucher-phone">Mobile number used for the voucher</label><input id="voucher-phone" type="tel" autoComplete="tel" value={voucherPhone} onChange={e => setVoucherPhone(e.target.value)} placeholder="+27XXXXXXXXX" /><p>Your voucher PIN is sent directly to the payment provider for processing and is not saved in DateMe payment records.</p></div>}</div><h4>Your preferences for this plan</h4><p>Save which proposed features matter most to you. These preferences do not activate paid features.</p><div className="subscription-preferences plan-preference-controls">
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('text-chat')} onChange={() => togglePlanPreference(selectedPlan, 'text-chat')} /> Text chat (proposed)</label>
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('photo-sharing')} onChange={() => togglePlanPreference(selectedPlan, 'photo-sharing')} disabled={selectedPlan==='week'} /> Photo sharing {selectedPlan==='week' ? '(not proposed for this tier)' : '(proposed)'}</label>
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('voice-calls')} onChange={() => togglePlanPreference(selectedPlan, 'voice-calls')} disabled={selectedPlan!=='half' && selectedPlan!=='year'} /> Voice calls {selectedPlan==='half' || selectedPlan==='year' ? '(proposed)' : '(not proposed for this tier)'}</label>
<label><input type="checkbox" checked={(planPreferences[selectedPlan] || []).includes('video-calls')} onChange={() => togglePlanPreference(selectedPlan, 'video-calls')} disabled={selectedPlan!=='year'} /> Video calls {selectedPlan==='year' ? '(proposed)' : '(not proposed for this tier)'}</label>
<p className="preference-save-note" role="status">{(planPreferences[selectedPlan] || []).length} preferences selected · {session ? 'account sync enabled' : 'saved on this device'}</p>
</div><h4>Included with this plan (proposed)</h4><ul><li>Create and edit your dating profile</li><li>Discover member profiles and send likes</li><li>Report and block inappropriate behaviour</li>{selectedPlan==='week' && <li>Basic text chat (proposed).</li>}{selectedPlan==='month' && <li>Text chat and limited photo sharing (proposed).</li>}{selectedPlan==='quarter' && <li>Text chat and photo sharing (proposed).</li>}{selectedPlan==='half' && <li>Text, photo and limited video sharing; voice calls proposed.</li>}{selectedPlan==='year' && <><li>Text messages, photo and video sharing subject to safety limits.</li><li>In-app voice and video calling with mutual matches (proposed).</li></>}</ul>{session ? <button className="button button-primary" type="button" onClick={() => void submitSubscriptionRequest()} disabled={subscriptionSubmitting}>{subscriptionSubmitting ? 'Connecting securely…' : paymentMethod==='nowpayments' ? 'Continue to crypto checkout' : 'Pay with OneVoucher'}</button> : <p>Sign in to purchase a subscription.</p>}{checkoutMessage && <p className="notice member-notice" role="status">{checkoutMessage}</p>}<p>Payment confirmation is handled server-side. A browser redirect alone never unlocks paid features. If your payment is processing, use “Refresh status” after the provider confirms it.</p></div> : <div className="plan-detail"><h3>Choose a subscription period</h3><p>Select a plan above to review its proposed benefits and choose your payment method. All five periods support cryptocurrency and OneVoucher when pricing and merchant configuration are complete.</p></div>}</section>}
        {page === 'admin' && <section className="portal-page membership-section"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">OWNER ACCESS</span><h2>Administrator <span>portal.</span></h2>{isAdmin ? <div className="plan-detail"><h3>Admin access verified</h3><p>Signed in as {session?.user.email}. The secure admin area is reserved for accounts granted access in the database.</p><p>Review member reports, contact-sharing violations, strike history, and 24-hour suspensions below. Messages containing detected contact details are stored as asterisks for other members; the restricted safety log preserves the original message for administrator review.</p><div className="admin-report-list"><h3>Subscription pricing</h3><p>Set both the South African rand price for OneVoucher and the USD price for crypto checkout. A plan can only be enabled when both prices are set. No default prices have been invented.</p>{adminPlanPrices.length===0 ? <p>No pricing rows loaded. Apply the subscription payment migrations and refresh this page.</p> : adminPlanPrices.map(row => <article className="admin-report" key={row.plan_code}><strong>{({week:'1 week',month:'1 month',three_months:'3 months',six_months:'6 months',yearly:'1 year'} as Record<string,string>)[row.plan_code] || row.plan_code}</strong><div className="editor-fields"><label>OneVoucher price (ZAR)<input type="number" min="0.01" step="0.01" value={priceDrafts[row.plan_code]?.price_zar ?? ''} onChange={e => setPriceDrafts(current => ({...current,[row.plan_code]:{...(current[row.plan_code] || {price_zar:'',price_usd:'',enabled:false}),price_zar:e.target.value}}))} placeholder="e.g. 49.00" /></label><label>Crypto price (USD)<input type="number" min="0.01" step="0.01" value={priceDrafts[row.plan_code]?.price_usd ?? ''} onChange={e => setPriceDrafts(current => ({...current,[row.plan_code]:{...(current[row.plan_code] || {price_zar:'',price_usd:'',enabled:false}),price_usd:e.target.value}}))} placeholder="e.g. 3.00" /></label><label><input type="checkbox" checked={priceDrafts[row.plan_code]?.enabled ?? false} onChange={e => setPriceDrafts(current => ({...current,[row.plan_code]:{...(current[row.plan_code] || {price_zar:'',price_usd:'',enabled:false}),enabled:e.target.checked}}))} /> Enable plan for checkout</label></div><small>Status: {row.enabled ? 'Enabled' : 'Not for sale'} · Existing price: {row.price_zar == null ? 'ZAR not set' : `R${Number(row.price_zar).toFixed(2)}`} / {row.price_usd == null ? 'USD not set' : `${Number(row.price_usd).toFixed(2)}`}</small><div className="admin-report-actions"><button type="button" disabled={priceSaving} onClick={() => void saveSubscriptionPrice(row.plan_code)}>{priceSaving ? 'Saving…' : 'Save prices'}</button></div></article>)}</div><div className="admin-report-list"><h3>Recent subscription payments</h3>{adminPayments.length===0 ? <p>No payment orders recorded yet.</p> : adminPayments.map(payment => <article className="admin-report" key={payment.id}><div className="admin-report-heading"><strong>{payment.plan_code.replace('_',' ')} · {payment.provider==='nowpayments' ? 'Crypto' : 'OneVoucher'}</strong><span className={'report-status status-' + (payment.status==='succeeded' ? 'resolved' : payment.status==='failed' || payment.status==='expired' ? 'dismissed' : 'reviewing')}>{payment.status}</span></div><p>{payment.currency} {Number(payment.amount).toFixed(2)} · Member {payment.user_id}</p><small>Created {new Date(payment.created_at).toLocaleString()}{payment.paid_at ? ` · Paid ${new Date(payment.paid_at).toLocaleString()}` : ''}</small></article>)}</div><div className="admin-report-list"><h3>Subscription approval queue</h3>{adminSubscriptions.length === 0 ? <p>No pending subscription requests.</p> : adminSubscriptions.map(item => <article className="admin-report" key={item.user_id}><strong>Member: {item.user_id}</strong><p>Requested plan: {item.plan_code}</p><small>Requested: {new Date(item.created_at).toLocaleString()}</small><div className="admin-report-actions"><button onClick={() => void reviewSubscription(item.user_id, item.plan_code, true)}>Approve after payment verified</button><button onClick={() => void reviewSubscription(item.user_id, item.plan_code, false)}>Decline</button></div><p>Only approve after independently confirming the payment has been received.</p></article>)}</div><div className="admin-report-list"><h3>Safety history &amp; suspensions</h3>{reportsLoading ? <p>Loading safety history…</p> : safetyEvents.length === 0 ? <p>No contact-sharing violations recorded.</p> : safetyEvents.map(item => <article className="admin-report" key={item.id}><div className="admin-report-heading"><strong>{item.action_taken === 'suspended_24h' ? '24-hour suspension applied' : 'Message redacted · warning issued'}</strong><span className={'report-status ' + (item.action_taken === 'suspended_24h' ? 'status-open' : 'status-reviewing')}>Strike {item.strike_number}</span></div><p><strong>Original message (admin only):</strong> {item.original_message}</p><p><strong>Detection reasons:</strong> {item.detected_reasons.join(', ')}</p><small>Member ID: {item.user_id} · {new Date(item.created_at).toLocaleString()}</small></article>)}<h3>Current safety status</h3>{safetyStatus.length === 0 ? <p>No safety status records yet. Use the suspension controls on a member report to create a safety record.</p> : safetyStatus.map(item => <article className="admin-report" key={item.user_id}><strong>Member ID: {item.user_id}</strong><p>Recent strikes: {item.strike_count}</p><p>Suspended until: {item.suspended_until && new Date(item.suspended_until).getTime() > Date.now() ? new Date(item.suspended_until).toLocaleString() : 'Not currently suspended'}</p><div className="admin-report-actions">{item.suspended_until && new Date(item.suspended_until).getTime() > Date.now() ? <button type="button" onClick={() => void setMemberSuspension(item.user_id, false)}>Lift suspension</button> : <button type="button" onClick={() => void setMemberSuspension(item.user_id, true)}>Suspend for 24 hours</button>}</div><small>Last updated: {new Date(item.updated_at).toLocaleString()}</small></article>)}</div><div className="admin-report-list"><h3>Member safety reports</h3>{reportsLoading ? <p>Loading reports…</p> : adminReports.length === 0 ? <p>No reports have been submitted.</p> : adminReports.map(report => <article className="admin-report" key={report.id}><div className="admin-report-heading"><strong>{report.reason || 'Member report'}</strong><span className={'report-status status-' + report.status}>{report.status}</span></div><p>{report.details || 'No extra details provided.'}</p><small>Reported member: {report.reported_user_id} · Submitted: {new Date(report.created_at).toLocaleString()}</small><div className="admin-report-actions"><button onClick={() => void updateReportStatus(report.id, 'reviewing')}>Mark reviewing</button><button onClick={() => void updateReportStatus(report.id, 'resolved')}>Resolve</button><button onClick={() => void updateReportStatus(report.id, 'dismissed')}>Dismiss</button><button onClick={() => void setMemberSuspension(report.reported_user_id, true)}>Suspend member 24h</button></div></article>)}</div></div> : <div className="plan-detail"><h3>Restricted access</h3><p>Your account has not been granted administrator privileges. For security, admin access cannot be self-assigned from this public page.</p><p>Create a separate owner account below. After you register and confirm its email, send me that email address only so the account can be granted administrator access securely. Do not send your password or verification codes. Admin accounts will be exempt from subscription charges once the owner role is provisioned.</p><div className="admin-report-actions"><button className="button button-primary" onClick={() => { navigateTo('register'); setMode('signup'); setNotice('Register the separate account you want to use as DateMe owner. After email confirmation, send the account email address only so owner access can be provisioned.'); window.scrollTo(0,0); }}>Register owner account</button><button className="button button-outline" onClick={() => { navigateTo('register'); setMode('signin'); setNotice('Sign in with your separate owner account. If it has not yet been granted administrator access, send its email address only.'); window.scrollTo(0,0); }}>Sign in to owner account</button></div></div>}</section>}
        {page === 'how' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2><div className="steps-grid"><article><span className="step-num">01</span><h3>Show up as you</h3><p>Create a profile that feels like you.</p></article><article><span className="step-num">02</span><h3>Find your people</h3><p>Discover people you would like to know.</p></article><article><span className="step-num">03</span><h3>Make the first move</h3><p>A kind hello can start a conversation.</p></article></div></section>}
        {page === 'safety' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={goBackPage}>← Back</button><button onClick={closePage}>× Close</button></div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Safety <span>centre.</span></h2><p>Protect your personal details, take your time getting to know people, and meet in public places. Report suspicious or abusive behaviour. Never send phone numbers, external links, social handles or contact details in chat. Repeated attempts may be blocked and trigger a temporary account freeze and safety review. Never send money to someone you have not met. Meet in public, tell a trusted person where you are going, and report or block anyone who makes you uncomfortable.</p></section>}

      </main>
      <footer><a className="brand-logo brand-logo-footer" href="#" aria-label="DateMe home"><DateMeLogo /></a><p>Made for the moments that matter.</p><span>© {new Date().getFullYear()} DateMe</span></footer>
    </div>
  );
}
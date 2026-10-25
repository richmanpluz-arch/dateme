import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import MemberFeatures from './MemberFeatures';
import VideoCall from './VideoCall';

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
type SubscriptionPrice = { plan_code: string; price_zar: number | null; price_usd: number | null; enabled: boolean };
type PaymentOrder = { id: string; user_id?: string; plan_code: string; provider: string; status: string; amount: number; currency: string; checkout_url: string | null; created_at: string; paid_at?: string | null };

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
  const [page, setPage] = useState<'register' | 'home' | 'discover' | 'plans' | 'plan-detail' | 'features' | 'how' | 'safety' | 'admin'>('register');
  const [selectedPlan, setSelectedPlan] = useState('week');
  const [theme, setTheme] = useState<'rose' | 'navy' | 'green'>('navy');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupAge, setSignupAge] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>(aiProfiles);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [liked, setLiked] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('dateme-ai-likes') || '[]') as string[]; } catch { return []; } });
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
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
  const [focusedChatOnly, setFocusedChatOnly] = useState(false);
  const [videoCallAllowed, setVideoCallAllowed] = useState(false);
  const [videoCallRecipientId, setVideoCallRecipientId] = useState('');
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translationBusyId, setTranslationBusyId] = useState<string | null>(null);
  const [translationLanguage, setTranslationLanguage] = useState('en');
  const [tab, setTab] = useState<'discover' | 'likes' | 'matches' | 'profile'>('discover');
  const [searchText, setSearchText] = useState('');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [nearbyProfiles, setNearbyProfiles] = useState<Profile[]>([]);
  const [nearbyRadius, setNearbyRadius] = useState(10);
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
  const [incomingLikes, setIncomingLikes] = useState<Profile[]>([]);
  const [incomingLikeCount, setIncomingLikeCount] = useState(0);
  const [dailyChatsUsed, setDailyChatsUsed] = useState(0);
  const [dailyChatLimitReached, setDailyChatLimitReached] = useState(false);
  const [adminSubscriptions, setAdminSubscriptions] = useState<Array<{ user_id: string; plan_code: string; status: string; created_at: string; payment_verified: boolean }>>([]);
  const [adminMembers, setAdminMembers] = useState<Array<{ id: string; display_name: string; age: number | null; city: string | null; created_at: string; plan_code: string; subscription_status: string; payment_verified: boolean; ends_at: string | null }>>([]);
  const [adminMemberSearch, setAdminMemberSearch] = useState('');
  const [memberActionBusyId, setMemberActionBusyId] = useState<string | null>(null);
  const [subscriptionPrices, setSubscriptionPrices] = useState<SubscriptionPrice[]>([]);
  const [priceSavingPlan, setPriceSavingPlan] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'nowpayments' | 'kora_1voucher'>('kora_1voucher');
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
  const [voucherPin, setVoucherPin] = useState('');
  const [voucherPhone, setVoucherPhone] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [myPaymentOrders, setMyPaymentOrders] = useState<PaymentOrder[]>([]);
  const [adminPaymentOrders, setAdminPaymentOrders] = useState<PaymentOrder[]>([]);
  const referralCodeFromUrl = new URLSearchParams(window.location.search).get('ref');

  useEffect(() => {
    if (referralCodeFromUrl) localStorage.setItem('dateme-pending-referral', referralCodeFromUrl);
  }, []);

  useEffect(() => {
    if (session?.user) setPage(localStorage.getItem('dateme-needs-verification') === session.user.id ? 'features' : 'discover');
    else setPage('register');
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
      supabase!.from('subscription_payment_orders').select('id,user_id,plan_code,provider,status,amount,currency,checkout_url,created_at,paid_at').order('created_at',{ascending:false}).limit(100),
      supabase!.from('subscription_plan_prices').select('plan_code,price_zar,price_usd,enabled').order('plan_code'),
    ]).then(([reports, events, statuses, subscriptions, paymentOrders, prices]) => {
      if (cancelled) return;
      if (reports.error) setNotice('Could not load reports. Please check administrator policies.');
      else setAdminReports((reports.data || []) as typeof adminReports);
      if (events.error) setNotice('Safety history could not be loaded. Check administrator policies.');
      else setSafetyEvents((events.data || []) as typeof safetyEvents);
      if (statuses.error) setNotice('Safety status could not be loaded. Check administrator policies.');
      else setSafetyStatus((statuses.data || []) as typeof safetyStatus);
      if (!subscriptions.error) setAdminSubscriptions((subscriptions.data || []) as typeof adminSubscriptions);
      if (!paymentOrders.error) setAdminPaymentOrders((paymentOrders.data || []) as PaymentOrder[]);
      if (!prices.error) setSubscriptionPrices((prices.data || []) as SubscriptionPrice[]);
      setReportsLoading(false);
    });
    return () => { cancelled = true; };
  }, [session?.user?.id, isAdmin, page]);

  useEffect(() => {
    if (!supabase || !session?.user.id || !isAdmin || page !== 'admin') return;
    let cancelled = false;
    async function loadAdminMembers() {
      const [profilesResult, subscriptionsResult] = await Promise.all([
        supabase!.from('profiles').select('id,display_name,age,city,created_at').order('created_at', { ascending: false }).limit(200),
        supabase!.from('member_subscriptions').select('user_id,plan_code,status,payment_verified,ends_at').limit(500),
      ]);
      if (cancelled) return;
      if (profilesResult.error || subscriptionsResult.error) {
        setNotice('The member directory could not be loaded. Check administrator access and database policies.');
        return;
      }
      const subscriptionByUser = new Map((subscriptionsResult.data || []).map((item) => [item.user_id, item]));
      setAdminMembers((profilesResult.data || []).map((profile) => {
        const subscription = subscriptionByUser.get(profile.id);
        return { ...profile, plan_code: subscription?.plan_code || 'free', subscription_status: subscription?.status || 'free', payment_verified: Boolean(subscription?.payment_verified), ends_at: subscription?.ends_at || null };
      }) as typeof adminMembers);
    }
    void loadAdminMembers();
    return () => { cancelled = true; };
  }, [session?.user.id, isAdmin, page]);

  const planCodeBySelection: Record<string, string> = { week: 'week', month: 'month', quarter: 'three_months', half: 'six_months', year: 'yearly' };
  const planLabelByCode: Record<string, string> = { week: '1 week', month: '1 month', three_months: '3 months', six_months: '6 months', yearly: '1 year' };
  const selectedPlanCode = planCodeBySelection[selectedPlan] || 'week';
  const selectedPrice = subscriptionPrices.find((item) => item.plan_code === selectedPlanCode);
  const selectedPaymentAmount = paymentProvider === 'nowpayments' ? selectedPrice?.price_usd : selectedPrice?.price_zar;

  async function refreshPaymentOrders() {
    if (!supabase || !session) { setMyPaymentOrders([]); return; }
    const { data, error } = await supabase!.from('subscription_payment_orders')
      .select('id,plan_code,provider,status,amount,currency,checkout_url,created_at,paid_at')
      .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10);
    if (!error) setMyPaymentOrders((data || []) as PaymentOrder[]);
  }

  async function refreshAdminPaymentOrders() {
    if (!supabase || !session || !isAdmin) return;
    const { data, error } = await supabase!.from('subscription_payment_orders')
      .select('id,user_id,plan_code,provider,status,amount,currency,checkout_url,created_at,paid_at')
      .order('created_at', { ascending: false }).limit(100);
    if (!error) setAdminPaymentOrders((data || []) as PaymentOrder[]);
  }

  async function startSubscriptionCheckout() {
    if (!supabase || !session) { setNotice('Sign in before purchasing a subscription.'); return; }
    if (!selectedPrice?.enabled || !selectedPaymentAmount || Number(selectedPaymentAmount) <= 0) {
      setNotice('This plan is not available for payment yet. The DateMe owner must set a price and enable it first.');
      return;
    }
    if (paymentProvider === 'kora_1voucher') {
      if (!/^\d{16}$/.test(voucherPin.replace(/\s/g, ''))) { setNotice('Enter the 16-digit OneVoucher PIN.'); return; }
      if (!/^\+27\d{9}$/.test(voucherPhone.trim())) { setNotice('Enter a South African mobile number in +27 format.'); return; }
    }
    setCheckoutBusy(true);
    setCheckoutUrl(null);
    setNotice('Starting secure checkout…');
    const { data, error } = await supabase!.functions.invoke('create-subscription-payment', {
      body: {
        plan_code: selectedPlanCode,
        provider: paymentProvider,
        idempotency_key: crypto.randomUUID(),
        ...(paymentProvider === 'kora_1voucher' ? { voucher_pin: voucherPin.replace(/\s/g, ''), phone_number: voucherPhone.trim() } : {}),
      },
    });
    setCheckoutBusy(false);
    setVoucherPin('');
    if (error) {
      const providerMessage = (data as { error?: string } | null)?.error;
      setNotice(providerMessage || error.message || 'Could not start checkout. Please try again.');
      return;
    }
    const result = data as { order_id?: string; checkout_url?: string; status?: string; message?: string; error?: string } | null;
    if (result?.error) { setNotice(result.error); return; }
    if (result?.checkout_url) {
      setCheckoutUrl(result.checkout_url);
      setNotice('Your secure checkout is ready. Open it below to complete payment. Your subscription activates only after the provider confirms payment.');
    } else {
      setNotice(result?.message || 'Payment started. Your subscription will unlock only after the payment provider confirms it.');
    }
    await refreshPaymentOrders();
  }

  async function saveSubscriptionPrice(planCode: string) {
    if (!supabase || !session || !isAdmin) return;
    const item = subscriptionPrices.find((price) => price.plan_code === planCode);
    if (!item) return;
    const zar = item.price_zar === null || String(item.price_zar).trim() === '' ? null : Number(item.price_zar);
    const usd = item.price_usd === null || String(item.price_usd).trim() === '' ? null : Number(item.price_usd);
    if ((zar !== null && (!Number.isFinite(zar) || zar <= 0)) || (usd !== null && (!Number.isFinite(usd) || usd <= 0))) {
      setNotice('Prices must be positive numbers. Leave a currency blank if it is not ready.');
      return;
    }
    if (item.enabled && zar === null && usd === null) { setNotice('Set at least one price before enabling this plan.'); return; }
    setPriceSavingPlan(planCode);
    const { error } = await supabase!.from('subscription_plan_prices').upsert({
      plan_code: planCode, price_zar: zar, price_usd: usd, enabled: item.enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_code' });
    setPriceSavingPlan(null);
    if (error) { setNotice('Could not save this plan price. Confirm administrator permissions.'); return; }
    setSubscriptionPrices(current => current.map(price => price.plan_code === planCode ? { ...price, price_zar: zar, price_usd: usd } : price));
    setNotice(`${planLabelByCode[planCode] || planCode} pricing saved${item.enabled ? ' and enabled for checkout' : ' (checkout remains disabled)'}.`);
  }

  function updateSubscriptionPrice(planCode: string, patch: Partial<SubscriptionPrice>) {
    setSubscriptionPrices(current => current.map(price => price.plan_code === planCode ? { ...price, ...patch } : price));
  }

  async function submitSubscriptionRequest() {
    await startSubscriptionCheckout();
  }

  async function setMemberSuspension(userId: string, suspend: boolean) {
    if (!supabase || !session || !isAdmin || memberActionBusyId) return;
    setMemberActionBusyId(userId);
    const { error } = await supabase.rpc('admin_set_member_suspension', { p_user_id: userId, p_suspend: suspend });
    setMemberActionBusyId(null);
    if (error) { setNotice(suspend ? 'Could not suspend this member. Check administrator permissions.' : 'Could not lift this suspension. Check administrator permissions.'); return; }
    const updatedAt = new Date().toISOString();
    setSafetyStatus(current => {
      const exists = current.some(item => item.user_id === userId);
      const next = current.map(item => item.user_id === userId ? { ...item, suspended_until: suspend ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null, updated_at: updatedAt } : item);
      return exists ? next : [...next, { user_id: userId, strike_count: 0, suspended_until: suspend ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null, updated_at: updatedAt }];
    });
    setNotice(suspend ? 'Member suspended for 24 hours.' : 'Member suspension lifted.');
  }

  async function reviewSubscription(userId: string, planCode: string, approve: boolean) {
    if (!supabase || !session || !isAdmin) return;
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

  useEffect(() => {
    if (!supabase || !session?.user.id) { setMyPaymentOrders([]); return; }
    void refreshPaymentOrders();
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase || !session?.user.id || page !== 'plans') return;
    let cancelled = false;
    const refreshStatus = async () => {
      const [subscription, orders] = await Promise.all([
        supabase!.from('member_subscriptions').select('plan_code,status,ends_at,payment_verified,promo_chat_until').eq('user_id', session!.user.id).maybeSingle(),
        supabase!.from('subscription_payment_orders').select('id,plan_code,provider,status,amount,currency,checkout_url,created_at,paid_at').eq('user_id', session!.user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      if (subscription.data) setSubscriptionInfo(subscription.data as typeof subscriptionInfo);
      if (!orders.error) setMyPaymentOrders((orders.data || []) as PaymentOrder[]);
    };
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshStatus(); }, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session?.user.id, page]);

  useEffect(() => {
    if (!supabase || (page !== 'plans' && page !== 'admin')) return;
    let cancelled = false;
    async function loadSubscriptionPrices() {
      if (page === 'admin' && isAdmin) {
        const { data, error } = await supabase!.from('subscription_plan_prices').select('plan_code,price_zar,price_usd,enabled').order('plan_code');
        if (!cancelled && !error) setSubscriptionPrices((data || []) as SubscriptionPrice[]);
        return;
      }
      const { data, error } = await supabase!.functions.invoke('subscription-pricing', { method: 'GET' });
      if (!cancelled && !error) setSubscriptionPrices(((data as { plans?: SubscriptionPrice[] } | null)?.plans || []) as SubscriptionPrice[]);
    }
    void loadSubscriptionPrices();
    return () => { cancelled = true; };
  }, [page, isAdmin]);

  useEffect(() => {
    const paymentReturn = new URLSearchParams(window.location.search).get('payment');
    if (!paymentReturn) return;
    setNotice(paymentReturn === 'return' ? 'You returned from checkout. We are waiting for verified payment confirmation; refresh your subscription status shortly.' : 'Checkout was cancelled. Your subscription has not changed.');
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('payment');
    window.history.replaceState({}, '', cleanUrl.toString());
  }, []);

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
    if (!session?.user.id) { setHiddenMessageIds([]); return; }
    try { setHiddenMessageIds(JSON.parse(localStorage.getItem(`dateme-hidden-messages-${session.user.id}`) || '[]') as string[]); } catch { setHiddenMessageIds([]); }
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase || !session || !activeMatchId) { setMessages([]); return; }
    let cancelled = false;
    async function loadMessages() {
      const { data, error } = await supabase!.from('messages').select('id, match_id, sender_id, body, created_at, expires_at, reply_to, audio_path').eq('match_id', activeMatchId).order('created_at', { ascending: true }).limit(200);
      // Expired messages are removed whenever a conversation is opened/refreshed.
      await supabase!.from('messages').delete().eq('match_id', activeMatchId).lt('expires_at', new Date().toISOString());
      if (cancelled) return;
      if (error) setNotice('Could not load this conversation.');
      else {
        const loadedMessages = (data || []) as Message[];
        setMessages(loadedMessages);
        const incomingIds = loadedMessages.filter((message) => message.sender_id !== session!.user.id && (!message.expires_at || new Date(message.expires_at).getTime() > Date.now())).map((message) => message.id);
        if (incomingIds.length) {
          const readAt = new Date().toISOString();
          const receipts = incomingIds.map((message_id) => ({ message_id, user_id: session!.user.id, delivered_at: readAt, read_at: readAt }));
          const { error: receiptError } = await supabase!.from('message_receipts').upsert(receipts, { onConflict: 'message_id,user_id' });
          if (receiptError) console.warn('Could not update message read receipts.', receiptError.message);
        }
      }
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

  const activeMatch = matches.find((match) => match.id === activeMatchId) || null;
  const hasActivePaidSubscription = Boolean(subscriptionInfo && subscriptionInfo.plan_code !== 'free' && subscriptionInfo.status === 'active' && subscriptionInfo.payment_verified && subscriptionInfo.ends_at && new Date(subscriptionInfo.ends_at).getTime() > Date.now());

  useEffect(() => {
    if (!supabase || !session?.user.id || matches.length === 0) { setUnreadMessageCount(0); return; }
    let cancelled = false;
    const matchIds = matches.map((match) => match.id);
    async function refreshUnreadCount() {
      const [messageResult, receiptResult] = await Promise.all([
        supabase!.from('messages').select('id, sender_id, expires_at').in('match_id', matchIds),
        supabase!.from('message_receipts').select('message_id, read_at').eq('user_id', session!.user.id),
      ]);
      if (cancelled) return;
      if (messageResult.error || receiptResult.error) return;
      const readAtByMessage = new Map((receiptResult.data || []).map((receipt) => [receipt.message_id, receipt.read_at]));
      const now = Date.now();
      const unread = (messageResult.data || []).filter((message) => message.sender_id !== session!.user.id && (!message.expires_at || new Date(message.expires_at).getTime() > now) && !readAtByMessage.get(message.id)).length;
      setUnreadMessageCount(unread);
    }
    void refreshUnreadCount();
    const channel = supabase.channel(`message-notifications-${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { void refreshUnreadCount(); })
      .subscribe();
    const refreshTimer = window.setInterval(() => { void refreshUnreadCount(); }, 30000);
    return () => { cancelled = true; window.clearInterval(refreshTimer); void supabase!.removeChannel(channel); };
  }, [session?.user.id, matches.map((match) => match.id).join('|')]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setIncomingLikes([]);
      setIncomingLikeCount(0);
      setDailyChatsUsed(0);
      setDailyChatLimitReached(false);
      return;
    }
    let cancelled = false;
    async function loadSubscriptionGatedData() {
      const [countResult, likesResult, usageResult] = await Promise.all([
        supabase!.rpc('get_incoming_like_count'),
        supabase!.rpc('get_incoming_likes'),
        supabase!.rpc('get_my_daily_chat_usage'),
      ]);
      if (cancelled) return;
      if (!countResult.error) setIncomingLikeCount(Number(countResult.data || 0));
      if (!likesResult.error) setIncomingLikes((likesResult.data || []) as Profile[]);
      else setIncomingLikes([]);
      if (!usageResult.error) setDailyChatsUsed(Number(usageResult.data || 0));
      if (hasActivePaidSubscription) setDailyChatLimitReached(false);
    }
    void loadSubscriptionGatedData();
    return () => { cancelled = true; };
  }, [session?.user.id, hasActivePaidSubscription]);

  useEffect(() => {
    if (!session?.user.id) return;
    let lastSouthAfricanDay = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
    const timer = window.setInterval(() => {
      const currentSouthAfricanDay = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
      if (currentSouthAfricanDay !== lastSouthAfricanDay) {
        lastSouthAfricanDay = currentSouthAfricanDay;
        setDailyChatLimitReached(false);
        void loadDailyChatUsage();
      }
    }, 60000);
    return () => window.clearInterval(timer);
  }, [session?.user.id]);

  const visibleProfiles = useMemo(
    () => (tab === 'likes' ? (hasActivePaidSubscription ? incomingLikes : []) : nearbyOnly && tab === 'discover' ? nearbyProfiles : profiles).filter((profile) => !blockedIds.includes(profile.id) && (profile.display_name + ' ' + (profile.city || '') + ' ' + (profile.bio || '') + ' ' + (profile.interests || []).join(' ')).toLowerCase().includes(searchText.toLowerCase())),
    [profiles, incomingLikes, nearbyProfiles, nearbyOnly, hasActivePaidSubscription, tab, blockedIds, searchText],
  );

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

  useEffect(() => {
    if (!supabase || !session || !activeMatchId) { setVideoCallAllowed(false); setVideoCallRecipientId(''); return; }
    const match = matches.find((item) => item.id === activeMatchId);
    if (!match) return;
    const otherId = match.user_one === session.user.id ? match.user_two : match.user_one;
    setVideoCallRecipientId(otherId);
    let cancelled = false;
    supabase.from('member_subscriptions').select('user_id,plan_code,status,payment_verified,ends_at').in('user_id', [session.user.id, otherId]).then(({ data }) => {
      if (cancelled) return;
      const valid = Boolean(data && data.length === 2 && data.every((item) => item.plan_code === 'yearly' && item.status === 'active' && item.payment_verified && item.ends_at && new Date(item.ends_at).getTime() > Date.now()));
      setVideoCallAllowed(valid);
    });
    return () => { cancelled = true; };
  }, [session?.user.id, activeMatchId, matches]);

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
          localStorage.setItem('dateme-needs-verification', data.user.id);
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

  async function showNearbyProfiles() {
    if (!supabase || !session) { setNotice('Sign in to use nearby discovery.'); return; }
    const prefs = await supabase.from('member_location_preferences').select('max_distance_km,latitude,longitude').eq('user_id', session.user.id).maybeSingle();
    if (prefs.error || prefs.data?.latitude == null || prefs.data?.longitude == null) { setNotice('Open More member features → Location discovery, grant approximate location permission, and save your preferences first.'); setPage('features'); return; }
    const radius = [5,10,50].includes(Number(prefs.data.max_distance_km)) ? Number(prefs.data.max_distance_km) : 10;
    const result = await supabase.rpc('get_nearby_profiles', { p_max_distance_km: radius });
    if (result.error) { setNotice('Nearby discovery could not load. Check location consent and database setup.'); return; }
    setNearbyRadius(radius); setNearbyProfiles((result.data || []) as Profile[]); setNearbyOnly(true); setTab('discover'); setActiveMatchId('');
    setNotice((result.data || []).length ? 'Showing members who opted in to nearby discovery within ' + radius + ' km.' : 'No opted-in members were found within ' + radius + ' km.');
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

  async function sendSuperLike(profile: Profile) {
    if (!supabase || !session) { setNotice('Sign in to send a Super Like.'); return; }
    if (profile.id.startsWith('ai-')) { setNotice('Super Likes are only available for real member profiles.'); return; }
    const { data, error } = await supabase.rpc('send_super_like', { p_target_user_id: profile.id });
    if (error) { setNotice(error.message.includes('coin') ? 'You need a coin to send a Super Like. Coin balance: open More member features → Super Likes & coins.' : error.message); return; }
    await handleLike(profile);
    setNotice('Super Like sent to ' + profile.display_name + '. Coins remaining: ' + String(data) + '.');
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

  function copyChatMessage(message: Message) {
    void navigator.clipboard?.writeText(message.body).then(() => setNotice('Message copied.')).catch(() => setNotice('Copy was blocked by your browser.'));
    setOpenMessageMenuId(null);
  }

  async function translateChatMessage(message: Message) {
    if (!message.body.trim() || message.audio_path) {
      setNotice('Only text messages can be translated.');
      setOpenMessageMenuId(null);
      return;
    }
    setTranslationBusyId(message.id);
    setOpenMessageMenuId(null);
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(message.body.slice(0, 120))}&langpair=autodetect|${encodeURIComponent(translationLanguage)}`);
      if (!response.ok) throw new Error('Translation service unavailable');
      const payload = await response.json() as { responseStatus?: number; responseData?: { translatedText?: string }; responseDetails?: string };
      const translated = payload.responseData?.translatedText;
      if (payload.responseStatus && payload.responseStatus !== 200) throw new Error(payload.responseDetails || 'Translation failed');
      if (!translated) throw new Error('No translation was returned');
      setTranslatedMessages((current) => ({ ...current, [message.id]: translated }));
    } catch {
      setNotice('Translation is temporarily unavailable. Please try again.');
    } finally {
      setTranslationBusyId(null);
    }
  }

  function playVoiceMessage(message: Message) {
    const audio = document.getElementById(`voice-${message.id}`) as HTMLAudioElement | null;
    if (audio) void audio.play().catch(() => setNotice('Could not play this voice note yet. Please wait for it to load.'));
    setOpenMessageMenuId(null);
  }

  async function downloadVoiceMessage(message: Message) {
    const url = voiceUrls[message.id];
    if (!url) {
      setNotice('This voice note is still loading. Please try again in a moment.');
      setOpenMessageMenuId(null);
      return;
    }
    setOpenMessageMenuId(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download unavailable');
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `dateme-voice-note-${message.id}.webm`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setNotice('Could not download this voice note. Please try again.');
    }
  }

  function getReplyMessageBody(replyToId: string) {
    const original = [...messages, ...demoMessages].find((item) => item.id === replyToId);
    if (!original) return 'Original message unavailable';
    return original.audio_path ? '🎙️ Voice note' : original.body;
  }

  function replyToChatMessage(message: Message) {
    setReplyTo(message);
    setMessageText('');
    setOpenMessageMenuId(null);
  }

  function deleteChatMessageForMe(message: Message, isDemo = false) {
    if (isDemo) {
      setDemoMessages((current) => current.filter((item) => item.id !== message.id));
    } else {
      const next = [...new Set([...hiddenMessageIds, message.id])];
      setHiddenMessageIds(next);
      if (session?.user.id) localStorage.setItem(`dateme-hidden-messages-${session.user.id}`, JSON.stringify(next));
    }
    setOpenMessageMenuId(null);
  }

  async function deleteChatMessageForEveryone(message: Message, isDemo = false) {
    if (isDemo) {
      setDemoMessages((current) => current.filter((item) => item.id !== message.id));
      setOpenMessageMenuId(null);
      return;
    }
    if (!supabase || !session || message.sender_id !== session.user.id) {
      setNotice('You can delete a message for everyone only if you sent it.');
      setOpenMessageMenuId(null);
      return;
    }
    const { data, error } = await supabase.from('messages').delete().eq('id', message.id).eq('sender_id', session.user.id).select('id').maybeSingle();
    if (error || !data) {
      setNotice('Could not delete this message for everyone. The database must allow the sender to delete their own messages.');
    } else {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setNotice('Message deleted for everyone.');
    }
    setOpenMessageMenuId(null);
  }

  async function loadDailyChatUsage() {
    if (!supabase || !session) { setDailyChatsUsed(0); return; }
    const { data, error } = await supabase!.rpc('get_my_daily_chat_usage');
    if (!error) setDailyChatsUsed(Number(data || 0));
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
      const mine: Message = { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: 'demo-you', body, created_at: now, reply_to: replyTo?.id || null, demo: true };
      setDemoMessages(current => [...current, mine]);
      setMessageText('');
      setReplyTo(null);
      setShowEmojiPicker(false);
      setOpenMessageMenuId(null);
      const count = demoReplyCount + 1;
      setDemoReplyCount(count);
      const lower = body.toLowerCase();
      const reply = /\b(hi|hello|hey)\b/.test(lower) ? `Hey 😊 I'm ${demoChatPerson.display_name}. How's your day going?` : /\b(work|job|career)\b/.test(lower) ? 'Tell me more about what you do. What do you enjoy most about it? 😊' : /\b(hobby|hobbies|love doing|free time)\b/.test(lower) ? 'That sounds interesting! I enjoy discovering new things too. What got you into that? 💛' : /\b(date|meet|coffee)\b/.test(lower) ? 'A relaxed coffee and a good conversation sounds lovely ☕ What kind of place do you like?' : /\b(sad|bad day|upset|stress)\b/.test(lower) ? "I'm sorry it's been a tough one. Want to tell me what happened? I'm listening 💛" : demoReplies[(count - 1) % demoReplies.length];
      window.setTimeout(() => setDemoMessages(current => [...current, { id: crypto.randomUUID(), match_id: demoChatPerson.id, sender_id: demoChatPerson.id, body: reply, created_at: new Date().toISOString(), reply_to: mine.id, demo: true }]), 850);
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
      else if (error.message?.includes('FREE_DAILY_CHAT_LIMIT')) {
        setDailyChatLimitReached(true);
        setNotice('You have used your four new chats for today. Subscribe to start more conversations. Your limit resets at midnight South African time.');
      } else if (error.message?.includes('VOICE_SUBSCRIPTION_REQUIRED')) setNotice('Voice notes require both matched members to have the same active, verified subscription tier.');
      else if (error.message?.includes('Messaging is unavailable')) setNotice('Messaging is unavailable because one of these accounts has blocked the other.');
      else setNotice('Message could not be sent. Check that this is an available match and try again.');
      return;
    }
    if (data) {
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
      if (data.body === '*********') setNotice('********* Your message contained blocked contact details or suspicious number/link patterns. It was replaced with asterisks. Repeated attempts may suspend your account for 24 hours. Contact the administrator if suspended.');
    }
    setMessageText(''); setReplyTo(null); setShowEmojiPicker(false);
    setDailyChatLimitReached(false);
    void loadDailyChatUsage();
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
    setDailyChatLimitReached(false);
    setFocusedChatOnly(true);
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
          <button className="brand-logo brand-logo-small logo-home-button" onClick={() => { setPage(session ? "discover" : "register"); setMenuOpen(false); window.scrollTo(0,0); }} aria-label="DateMe home"><DateMeLogo /></button>
          <button className="portal-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span></span><span></span><span></span></button>
          {menuOpen && <nav className="portal-menu" aria-label="DateMe portals">
            <button onClick={() => { setPage(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>Main page</button>
            <button onClick={() => { setPage(session ? 'discover' : 'register'); setMenuOpen(false); window.scrollTo(0,0); }}>Discover / member portal</button>
            <button onClick={() => { setPage('plans'); setMenuOpen(false); window.scrollTo(0,0); }}>Subscription plans</button>
            <button onClick={() => { setPage('how'); setMenuOpen(false); window.scrollTo(0,0); }}>How DateMe works</button>
            <button onClick={() => { setPage('safety'); setMenuOpen(false); window.scrollTo(0,0); }}>Safety centre</button>
             <button onClick={() => { setPage('features'); setMenuOpen(false); window.scrollTo(0,0); }}>More member features</button>
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
          <div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE, REAL POSSIBILITIES</span><h2>{session ? tab === 'matches' ? 'Your connections' : tab === 'profile' ? 'Your story, your way' : tab === 'likes' ? 'People who liked you' : 'People you might like' : 'A little closer to your person'}</h2><p>{tab === 'likes' ? 'Your likes are private until your subscription unlocks them.' : 'Start with a smile. See where a conversation takes you.'}</p></div><span className="section-flower" aria-hidden="true">✳</span></div>
          {session && <div className="discover-search"><span>⌕</span><input aria-label="Search members" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name, city or interests…" /><button type="button" onClick={() => setSearchText('')}>Clear</button></div>}
          {session && <div className="member-bar"><span>Signed in as <strong>{session.user.email}</strong></span><div className="member-tabs">
            <button className={tab === 'discover' && !nearbyOnly ? 'selected' : ''} onClick={() => { setTab('discover'); setNearbyOnly(false); setActiveMatchId(''); }}>Discover</button>
            <button className={nearbyOnly ? 'selected' : ''} onClick={() => void showNearbyProfiles()}>Near me ({nearbyRadius} km)</button>
            <button className={tab === 'likes' ? 'selected' : ''} onClick={() => { setTab('likes'); setActiveMatchId(''); }}>Likes ({incomingLikeCount})</button>
            <button className={tab === 'matches' ? 'selected' : ''} onClick={() => setTab('matches')}>Matches ({matches.length})</button>
            <button className="inbox-notification-button" onClick={() => { setTab('matches'); setActiveMatchId(''); setNotice(unreadMessageCount ? `You have ${unreadMessageCount} unread message${unreadMessageCount === 1 ? '' : 's'}. Open a match to read them.` : 'You are all caught up.'); }} aria-label={`Inbox, ${unreadMessageCount} unread messages`}>Inbox {unreadMessageCount > 0 && <span className="unread-message-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>}</button>
            <button className={tab === 'profile' ? 'selected' : ''} onClick={() => { setTab('profile'); setActiveMatchId(''); }}>My profile</button>
          </div></div>}

          {session && tab === 'profile' && <section className="profile-editor affiliate-panel">
            <div className="editor-fields">
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

          {session && tab === 'matches' && <div className={focusedChatOnly && activeMatch ? 'match-layout focused-chat-only' : 'match-layout'}>
            {!focusedChatOnly && <aside className="match-list"><h3>Your matches</h3>{matches.length === 0 ? <p className="muted-copy">When you and another member like each other, your match will appear here.</p> : matches.map((match) => {
              const otherId = match.user_one === session.user.id ? match.user_two : match.user_one;
              const person = profiles.find((p) => p.id === otherId);
              return <button key={match.id} className={activeMatchId === match.id ? 'match-row active' : 'match-row'} onClick={() => openChat(match)}><span className="match-avatar">{person?.photo_url ? <img src={person.photo_url} alt="" /> : '♡'}</span><span><strong>{person?.display_name || 'Your match'}</strong><small>{person?.city || 'Say hello'}</small></span><span className="match-arrow">›</span></button>;
            })}</aside>}
            <section className="chat-panel">{activeMatch ? <>
              <div className="chat-heading">{focusedChatOnly && <button type="button" className="chat-back-button" onClick={() => setFocusedChatOnly(false)} aria-label="Back to matches" title="Back to matches">‹</button>}<span className="match-avatar">{activePerson?.photo_url ? <img src={activePerson.photo_url} alt="" /> : '♡'}</span><div><strong>{activePerson?.display_name || 'Your match'}</strong><small>{focusedChatOnly ? 'Private conversation' : 'Only you and your match can see this chat'}</small></div></div>
              <div className="chat-tools-note">🔒 Private chat · messages expire after 24 hours{hasActivePaidSubscription ? ' · Unlimited text chats' : ` · Free new chats today: ${Math.min(dailyChatsUsed, 4)}/4`}</div>
              {dailyChatLimitReached && <div className="chat-limit-banner"><p>You’ve used all four free new chats for today. Existing conversations remain available. Subscribe to start more new conversations.</p><button type="button" className="button button-primary" onClick={() => { setFocusedChatOnly(false); setActiveMatchId(''); setPage('plans'); }}>View subscription plans</button></div>}
              <div className="chat-messages">{messages.filter((m) => (!m.expires_at || new Date(m.expires_at).getTime() > Date.now()) && !hiddenMessageIds.includes(m.id)).length === 0 ? <p className="chat-empty">Every great conversation starts somewhere. Say hello 👋</p> : messages.filter((m) => (!m.expires_at || new Date(m.expires_at).getTime() > Date.now()) && !hiddenMessageIds.includes(m.id)).map((message) => <div key={message.id} className={message.sender_id === session.user.id ? 'message-bubble mine' : 'message-bubble'}><div className="message-actions"><button type="button" className="message-menu-trigger" title="Message options" aria-label="Message options" aria-expanded={openMessageMenuId === message.id} onClick={() => setOpenMessageMenuId((current) => current === message.id ? null : message.id)}>⋯</button>{openMessageMenuId === message.id && <div className="message-options-menu" role="menu"><button type="button" role="menuitem" onClick={() => replyToChatMessage(message)}>↶ Reply</button>{!message.audio_path && <button type="button" role="menuitem" onClick={() => void translateChatMessage(message)}>{translationBusyId === message.id ? '… Translating' : '文 Translate in DateMe'}</button>}{message.audio_path && <><button type="button" role="menuitem" onClick={() => playVoiceMessage(message)}>▶ Play voice note</button><button type="button" role="menuitem" onClick={() => void downloadVoiceMessage(message)}>↓ Download voice note</button></>}<button type="button" role="menuitem" onClick={() => copyChatMessage(message)}>▢ Copy</button><button type="button" role="menuitem" onClick={() => deleteChatMessageForMe(message)}>Delete for me</button>{message.sender_id === session.user.id && <button type="button" role="menuitem" className="message-delete-action" onClick={() => void deleteChatMessageForEveryone(message)}>Delete for everyone</button>}</div>}</div>{message.reply_to && <p className="reply-reference">↶ {getReplyMessageBody(message.reply_to)}</p>}{message.audio_path && supabase ? <audio id={`voice-${message.id}`} className="message-audio-engine" preload="none" src={voiceUrls[message.id] || undefined} /> : <p>{message.body}</p>}{translatedMessages[message.id] && <div className="message-translation"><label>Translated in DateMe <select aria-label="Translation language" value={translationLanguage} onChange={(e) => setTranslationLanguage(e.target.value)}><option value="en">English</option><option value="af">Afrikaans</option><option value="zu">isiZulu</option><option value="xh">isiXhosa</option><option value="st">Sesotho</option><option value="tn">Setswana</option><option value="nso">Sepedi</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option><option value="de">German</option><option value="it">Italian</option><option value="sw">Swahili</option><option value="ar">Arabic</option><option value="zh-CN">Chinese</option><option value="hi">Hindi</option><option value="ja">Japanese</option><option value="ru">Russian</option><option value="nl">Dutch</option><option value="pl">Polish</option></select></label><p>{translatedMessages[message.id]}</p><button type="button" onClick={() => void translateChatMessage(message)}>Translate again</button></div>}<time>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · disappears in 24h</time></div>)}</div>
              {replyTo && <div className="reply-composer"><span>↶ Replying to: {replyTo.body.slice(0, 90)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></div>}
              {voicePreview && <div className="voice-preview"><audio controls src={voicePreview} /><button type="button" onClick={() => { URL.revokeObjectURL(voicePreview); setVoicePreview(null); setVoiceBlob(null); }}>Discard</button><button type="button" onClick={() => void sendVoiceNote()} disabled={recordingBusy}>Send voice note</button></div>}
              {showEmojiPicker && <div className="emoji-picker" aria-label="Emoji picker">{['😀','😂','🥰','😍','😘','😊','😉','❤️','💕','💖','🔥','👏','👍','🙏','🌹','✨','😢','😅','🤗','💋'].map((emoji) => <button type="button" key={emoji} onClick={() => setMessageText((text) => text + emoji)}>{emoji}</button>)}</div>}
              <form className="chat-compose" onSubmit={sendMessage}><button type="button" className="chat-tool-button" aria-label="Choose emoji" title="Emoji" onClick={() => setShowEmojiPicker((show) => !show)}>☺</button><input value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder={replyTo ? 'Write a reply…' : 'Write a kind message…'} aria-label="Message" /><button type="button" className="chat-tool-button" aria-label={recording ? 'Stop recording' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'} onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()} disabled={recordingBusy}>{recording ? '■' : '🎙'}</button><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form>
            </> : <div className="chat-placeholder"><span>♡</span><h3>A little hello goes a long way.</h3><p>Choose a match to start your conversation.</p></div>}</section>
          </div>}

          {(tab === 'discover' || tab === 'likes' || !session) && (visibleProfiles.length ? <div className={session ? 'profile-grid compact-profile-list' : 'profile-grid'}>
            {visibleProfiles.map((profile) => <article className="person-card compact-person-card" key={profile.id}>
              <div className="compact-person-avatar">{profile.photo_url ? <img className="person-photo" src={profile.photo_url} alt={`${profile.display_name}'s profile`} loading="eager" decoding="async" /> : <div className="photo-placeholder">♡</div>}</div>
              <div className="compact-person-info"><div className="compact-person-title"><h3>{profile.display_name}{profile.age ? <span>, {profile.age}</span> : null}</h3>{profile.id.startsWith('ai-') && <span className="compact-demo-tag">AI demo</span>}</div><p className="person-city"><span>⌖</span> {profile.city || 'Location not set'}</p><p className="person-bio">{profile.bio || 'A little mystery makes the first hello more fun.'}</p>{profile.interests?.length ? <div className="interest-chips">{profile.interests.slice(0,3).map((interest) => <span key={interest}>{interest}</span>)}</div> : null}{profile.looking_for && <p className="looking-for">♡ {profile.looking_for}</p>}{session && <div className="profile-safety-actions"><button onClick={() => void reportMember(profile)}>Report</button><button onClick={() => void blockMember(profile)}>Block</button></div>}</div>
              <div className="compact-person-actions"><button className={liked.includes(profile.id) ? 'compact-like-button liked' : 'compact-like-button'} type="button" onClick={() => void handleLike(profile)} aria-label={`${liked.includes(profile.id) ? 'Unlike' : 'Like'} ${profile.display_name}`} title={liked.includes(profile.id) ? 'Unlike' : 'Like'}>{liked.includes(profile.id) ? '♥' : '♡'}</button>{session && !profile.id.startsWith('ai-') && <button className="compact-superlike-button" type="button" onClick={() => void sendSuperLike(profile)} title="Send a Super Like (uses one coin)" aria-label={`Super Like ${profile.display_name}`}>★</button>}<button className="compact-envelope-button" type="button" aria-label={`Open chat with ${profile.display_name}`} title="Open chats" onClick={() => { if (profile.id.startsWith('ai-')) { setDemoChatPerson(profile); setDemoMessages([{ id: 'welcome-' + profile.id, match_id: profile.id, sender_id: profile.id, body: `Hi! I'm ${profile.display_name}. 😊 What would you like to talk about today?`, created_at: new Date().toISOString(), demo: true }]); setDemoReplyCount(0); setMessageText(''); setFocusedChatOnly(true); setNotice(''); return; } const match = matches.find((item) => item.user_one === profile.id || item.user_two === profile.id); if (match) { openChat(match); return; } setTab('matches'); setFocusedChatOnly(false); setActiveMatchId(''); setNotice(`You need to match with ${profile.display_name} before starting a private chat.`); }}>{/* envelope icon */}<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></button></div>
            </article>)}
          </div> : <div className="empty-state"><span>{tab === 'likes' && incomingLikeCount > 0 && !hasActivePaidSubscription ? '🔒' : '♡'}</span><h3>{tab === 'likes' ? incomingLikeCount > 0 && !hasActivePaidSubscription ? `${incomingLikeCount} people like you` : 'No incoming likes yet' : 'No profiles yet'}</h3><p>{tab === 'likes' ? incomingLikeCount > 0 && !hasActivePaidSubscription ? 'Your liked-by profiles are hidden. Subscribe to reveal the people behind them.' : 'When someone likes your profile, they will appear here.' : 'New member profiles will show up here as people join DateMe.'}</p>{tab === 'likes' && incomingLikeCount > 0 && !hasActivePaidSubscription && <div className="locked-likes-preview"><div className="locked-likes-cards">{Array.from({ length: Math.min(incomingLikeCount, 4) }, (_, index) => <div className="locked-like-card" key={index}><div className="locked-like-avatar"><span className="locked-like-heart">♡</span><span className="locked-like-lock">🔒</span></div><strong>Secret admirer</strong><small>Profile hidden</small></div>)}</div><button className="button button-primary" type="button" onClick={() => setPage('plans')}>Unlock who likes you</button></div>}<button className="button button-outline" onClick={() => setTab('discover')}>Back to discover</button></div>)}
          {!session && <div className="ai-demo-entry"><h3>Try a conversation</h3><p>Choose a simulated profile to test the chat. These are automated demos, not real members.</p><div className="ai-demo-buttons">{aiProfiles.map(person => <button key={person.id} className="button button-outline" onClick={() => { setDemoChatPerson(person); setDemoMessages([{ id: 'welcome-' + person.id, match_id: person.id, sender_id: person.id, body: person.display_name === 'Sarah' ? 'Hi! 😊 I’m Sarah. What’s something that always makes your day better?' : 'Hey there! 👋 What do you enjoy doing on weekends?', created_at: new Date().toISOString(), demo: true }]); setDemoReplyCount(0); setMessageText(''); setPage('discover'); setTab('discover'); window.scrollTo(0,0); }}>Chat with {person.display_name} · Demo</button>)}</div></div>}
          {demoChatPerson && <section className="demo-chat-panel"><div className="chat-heading"><span className="match-avatar">{demoChatPerson.photo_url ? <img src={demoChatPerson.photo_url} alt="" /> : '♡'}</span><div><strong>{demoChatPerson.display_name} · AI demo</strong><small>Automated practice chat — not a real member</small></div><button className="button button-outline" onClick={() => { setDemoChatPerson(null); setDemoMessages([]); }}>Close</button></div><div className="chat-tools-note">🔒 Simulated chat · contact details are blocked</div><div className="chat-messages">{demoMessages.map(message => <div key={message.id} className={message.sender_id === 'demo-you' ? 'message-bubble mine' : 'message-bubble'}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>)}</div><form className="chat-compose" onSubmit={sendMessage}><input value={messageText} onChange={e => setMessageText(e.target.value)} maxLength={2000} placeholder="Try saying hello…" aria-label="Demo chat message" /><button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button></form></section>}
          {!session && <p className="demo-caption">Demo profiles and simulated chats are examples only, not real members. Create an account to connect with real members.</p>}
          {notice && session && <p className="notice member-notice" role="status">{notice}</p>}
        </section>}

        {(page === 'plans' || page === 'plan-detail') && <section className="portal-page membership-section subscription-detail-route" id="membership-plans"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">YOUR JOURNEY, YOUR PACE</span><h2>Membership <span>plans.</span></h2><p>Choose your subscription period and save more with longer memberships. Free members can start four new text conversations per South African calendar day; existing conversations remain available. Incoming likes stay locked until a paid subscription is active and verified. Premium communication features require both matched members to have the same active, verified tier.</p>{session && <p className="current-subscription-status">Your current status: <strong>{subscriptionInfo?.status || 'free'}</strong> · Plan: <strong>{subscriptionInfo?.plan_code || 'free'}</strong>{subscriptionInfo?.ends_at ? ` · Ends ${new Date(subscriptionInfo.ends_at).toLocaleDateString()}` : ''}</p>}<div className="subscription-showcase"><div className="subscription-showcase-brand"><span className="subscription-heart-mark">♡</span><div><strong>Date<span>Me</span></strong><small>REAL PEOPLE · REAL CONNECTIONS · LASTING MOMENTS</small></div></div><p className="subscription-showcase-tagline">More time. More chances.<br/>Find your special someone.</p><div className="subscription-showcase-heading"><span></span><h3>CHOOSE YOUR SUBSCRIPTION PLAN</h3><span></span></div><p className="subscription-showcase-subtitle">Unlock more features, connect with more people, and get the most out of your DateMe experience.</p><div className="plan-periods subscription-plan-cards">{[{id:'week',label:'1 WEEK',period:'MEMBERSHIP',code:'week',tone:'violet',badge:''},{id:'month',label:'1 MONTH',period:'MEMBERSHIP',code:'month',tone:'blue',badge:''},{id:'quarter',label:'3 MONTHS',period:'MEMBERSHIP',code:'three_months',tone:'gold',badge:'Save 15%'},{id:'half',label:'6 MONTHS',period:'MEMBERSHIP',code:'six_months',tone:'pink',badge:'Save 28%'},{id:'year',label:'1 YEAR',period:'MEMBERSHIP',code:'yearly',tone:'purple',badge:'Best Value'}].map(plan => { const price = subscriptionPrices.find(item => item.plan_code === plan.code); return <button key={plan.id} className={`plan-period subscription-plan-card ${plan.tone} ${selectedPlan===plan.id?'selected':''}`} onClick={() => { setSelectedPlan(plan.id); setPlanDetailsOpen(true); setCheckoutUrl(null); setPage('plan-detail'); }}><span className="subscription-card-icon">{plan.id==='year'?'♛':'▦'}</span>{plan.badge && <span className="subscription-card-badge">{plan.badge}</span>}<strong>{plan.label}</strong><small>{plan.period}</small><b>{price?.price_usd != null ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(price.price_usd)) : 'Price pending'}</b><small className="subscription-card-rand">{price?.price_zar != null ? '≈ '+new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(Number(price.price_zar)) : 'Rand estimate pending'}</small><span className="subscription-card-choose">{selectedPlan===plan.id?'Selected ✓':'Select →'}</span></button>; })}</div><div className="subscription-trust-row" hidden><div><span>▢</span><strong>Secure Payments</strong><small>Your information is always safe.</small></div><div><span>✓</span><strong>Verified Members</strong><small>Real people, real profiles.</small></div><div><span>♥</span><strong>Premium Features</strong><small>Features for matching plans.</small></div><div><span>♛</span><strong>Your Dream Is Closer</strong><small>Join today and connect.</small></div></div><div className="subscription-payment-methods" hidden><strong>Pay with:</strong><span>♥ OneVoucher <small>(South Africa · ZAR)</small></span><i></i><span>₿ Cryptocurrency <small>(USD)</small></span></div><small className="subscription-rate-note">Prices are in USD. Rand equivalents are estimates and may vary with exchange rates.</small></div>{planDetailsOpen && <div className="subscription-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setPlanDetailsOpen(false); }}><div className="plan-detail subscription-plan-detail subscription-detail-portal" id="selected-plan-details" role="dialog" aria-modal="true" aria-labelledby="subscription-detail-title"><div className="subscription-detail-heading"><div><span className="eyebrow">YOUR SELECTED MEMBERSHIP</span><h3 id="subscription-detail-title">{planLabelByCode[selectedPlanCode]}</h3></div><div className="portal-page-actions"><button type="button" onClick={() => { setPlanDetailsOpen(false); setCheckoutUrl(null); setPage('plans'); }}>← Back</button><button type="button" onClick={() => { setPlanDetailsOpen(false); setPage(session ? "discover" : "register"); }}>× Close</button></div></div><div><span className={selectedPrice?.enabled ? 'draft-label price-enabled-label' : 'draft-label'}>{selectedPrice?.enabled ? 'AVAILABLE FOR CHECKOUT' : 'NOT YET AVAILABLE'}</span><h3>{{week:'Per Week · 7 days',month:'Per Month',quarter:'3 Months',half:'6 Months',year:'1 Year · 12 months'}[selectedPlan]}</h3><div className="subscription-price-summary"><span>Subscription price</span><div className="subscription-price-display"><strong>{selectedPrice?.price_usd != null ? new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(selectedPrice.price_usd)) : 'Price not set yet'}</strong>{selectedPrice?.price_zar != null && <small className="subscription-price-rand">Approximately {new Intl.NumberFormat('en-ZA', { style:'currency', currency:'ZAR' }).format(Number(selectedPrice.price_zar))}</small>}</div></div><p className="muted-copy">{selectedPrice?.enabled ? 'Prices are managed by the DateMe owner. The payment provider confirms payment before the subscription can activate.' : 'This plan cannot be purchased yet because its price has not been configured and enabled by the DateMe owner.'}</p><h4>Membership benefits</h4><ul><li>Build and update your dating profile.</li><li>Discover profiles and send likes.</li><li>Report and block inappropriate behaviour.</li><li>Ordinary text chat with your matches across subscription tiers, subject to the free daily limit.</li>{selectedPlan==='week' && <li>Premium features are available only when both matched members have the same active, verified tier.</li>}{selectedPlan==='month' && <li>Photo sharing when both matched members have this same active, verified tier.</li>}{selectedPlan==='quarter' && <li>Photo sharing when both matched members have this same active, verified tier.</li>}{selectedPlan==='half' && <><li>Photo and video sharing when both matched members have this same active, verified tier.</li><li>Voice features subject to same-tier access and rollout availability.</li></>}{selectedPlan==='year' && <><li>Photo and video sharing when both matched members have this same active, verified tier.</li><li>Voice features subject to same-tier access and rollout availability.</li><li>Access to the premium features enabled for this tier.</li></>}</ul>{session ? <div className="checkout-panel"><h4>Secure payment</h4><label>Payment method<select value={paymentProvider} onChange={(event) => { setPaymentProvider(event.target.value as 'nowpayments' | 'kora_1voucher'); setCheckoutUrl(null); }}><option value="kora_1voucher">OneVoucher · South African rand (ZAR)</option><option value="nowpayments">Cryptocurrency · US dollars (USD)</option></select></label>{paymentProvider === 'kora_1voucher' && <div className="voucher-fields"><label>16-digit OneVoucher PIN<input type="password" inputMode="numeric" autoComplete="off" maxLength={19} value={voucherPin} onChange={(event) => setVoucherPin(event.target.value.replace(/[^0-9 ]/g, '').slice(0,19))} placeholder="Enter voucher PIN" /></label><label>South African mobile number<input type="tel" inputMode="tel" autoComplete="tel" value={voucherPhone} onChange={(event) => setVoucherPhone(event.target.value)} placeholder="+27821234567" /></label><small>Your voucher PIN is sent only to the secure payment function and is cleared from this form after submission.</small></div>}{paymentProvider === 'nowpayments' && <div className="crypto-asset-panel"><strong>Crypto assets and wallet payment</strong><p>After you continue, the secure payment provider will show the supported coins and networks for this invoice, the exact crypto amount, wallet address and QR code. Select the asset there and send only the displayed amount on the matching network.</p><div className="crypto-asset-chips"><span>Bitcoin (BTC)</span><span>Ethereum (ETH)</span><span>Tether (USDT)</span><span>Other assets if supported</span></div><small>Available assets depend on the provider’s live invoice options. DateMe does not invent wallet addresses or ask you to send funds to a manually supplied address.</small></div>}<button className="button button-primary" type="button" onClick={() => void submitSubscriptionRequest()} disabled={checkoutBusy || !selectedPrice?.enabled || !selectedPaymentAmount}>{checkoutBusy ? 'Starting secure checkout…' : 'Continue to secure payment'}</button>{checkoutUrl && <a className="button button-outline checkout-open-link" href={checkoutUrl} target="_blank" rel="noopener noreferrer">Open secure checkout ↗</a>}</div> : <p>Sign in to purchase a subscription.</p>}<p className="payment-assurance">DateMe never activates paid features from a screenshot or an unverified return page. Only the payment provider’s verified notification can confirm a payment.</p><div className="subscription-trust-row"><div><span>▢</span><strong>Secure Payments</strong><small>Your information is always safe.</small></div><div><span>✓</span><strong>Verified Members</strong><small>Real people, real profiles.</small></div><div><span>♥</span><strong>Premium Features</strong><small>Features for matching plans.</small></div><div><span>♛</span><strong>Your Dream Is Closer</strong><small>Join today and connect.</small></div></div><div className="subscription-payment-methods"><strong>Payment methods:</strong><span>♥ OneVoucher <small>South Africa · ZAR</small></span><i></i><span>₿ Cryptocurrency <small>USD</small></span></div></div></div></div>}{session && <div className="admin-report-list member-payment-history"><div className="payment-history-heading"><h3>Your payment history</h3><button type="button" className="button button-outline" onClick={() => void refreshPaymentOrders()}>Refresh status</button></div>{myPaymentOrders.length === 0 ? <p>No payment orders yet.</p> : myPaymentOrders.map(order => <article className="admin-report" key={order.id}><div className="admin-report-heading"><strong>{planLabelByCode[order.plan_code] || order.plan_code} membership</strong><span className={'report-status ' + (order.status === 'succeeded' ? 'status-resolved' : order.status === 'failed' || order.status === 'expired' ? 'status-open' : 'status-reviewing')}>{order.status}</span></div><p>{new Intl.NumberFormat(order.currency === 'USD' ? 'en-US' : 'en-ZA', { style:'currency', currency:order.currency }).format(Number(order.amount))} · {order.provider === 'kora_1voucher' ? 'OneVoucher' : 'Cryptocurrency'}</p><small>{new Date(order.created_at).toLocaleString()}</small>{order.checkout_url && order.status === 'pending' && <a href={order.checkout_url} target="_blank" rel="noopener noreferrer">Continue payment ↗</a>}</article>)}</div>}</section>}
        {page === 'features' && <MemberFeatures session={session} profile={myProfile} isAdmin={isAdmin} onNotice={setNotice} onClose={() => setPage('discover')} />}
         {page === 'admin' && <section className="portal-page membership-section"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">OWNER ACCESS</span><h2>Administrator <span>portal.</span></h2>{isAdmin ? <div className="plan-detail"><h3>Admin access verified</h3><p>Signed in as {session?.user.email}. The secure admin area is reserved for accounts granted access in the database.</p><p>Review member reports, contact-sharing violations, strike history, and 24-hour suspensions below. Messages containing detected contact details are stored as asterisks for other members; the restricted safety log preserves the original message for administrator review.</p><div className="admin-report-list admin-member-directory"><h3>Member directory ({adminMembers.length})</h3><p>Search registered members and review their subscription verification at a glance. This directory is read-only; account or subscription changes must use approved admin workflows.</p><label className="admin-member-search">Search members<input value={adminMemberSearch} onChange={(event) => setAdminMemberSearch(event.target.value)} placeholder="Name, city or member ID…" /></label>{adminMembers.filter((member) => `${member.display_name} ${member.city || ''} ${member.id} ${member.plan_code} ${member.subscription_status}`.toLowerCase().includes(adminMemberSearch.toLowerCase())).map((member) => { const suspended = safetyStatus.find((item) => item.user_id === member.id && item.suspended_until && new Date(item.suspended_until).getTime() > Date.now()); const active = member.subscription_status === 'active' && member.payment_verified && member.ends_at && new Date(member.ends_at).getTime() > Date.now(); return <article className="admin-report admin-member-row" key={member.id}><div className="admin-report-heading"><strong>{member.display_name || 'Unnamed member'}{member.age ? ` · ${member.age}` : ''}</strong><span className={'report-status ' + (suspended ? 'status-open' : active ? 'status-resolved' : 'status-reviewing')}>{suspended ? 'Suspended' : active ? 'Verified active' : member.subscription_status === 'pending' ? 'Payment pending' : 'Free / inactive'}</span></div><p>{member.city || 'City not provided'} · Plan: {member.plan_code}</p><small>Member ID: {member.id}</small><small>Joined: {new Date(member.created_at).toLocaleDateString()}{member.ends_at ? ` · Expires: ${new Date(member.ends_at).toLocaleDateString()}` : ''}</small><div className="admin-report-actions"><button type="button" className="button button-outline" disabled={memberActionBusyId !== null} onClick={() => void setMemberSuspension(member.id, !suspended)}>{memberActionBusyId === member.id ? 'Saving…' : suspended ? 'Lift suspension' : 'Suspend 24 hours'}</button></div></article>; })}{adminMembers.length === 0 && <p>Loading registered members…</p>}</div><div className="admin-report-list admin-pricing-manager"><h3>Subscription pricing</h3><p>Set the live price for each period. Checkout remains disabled until the plan is enabled and has a valid price.</p>{[{code:'week',label:'1 week'},{code:'month',label:'1 month'},{code:'three_months',label:'3 months'},{code:'six_months',label:'6 months'},{code:'yearly',label:'1 year'}].map(plan => { const price = subscriptionPrices.find(item => item.plan_code === plan.code); if (!price) return <article className="admin-report" key={plan.code}><strong>{plan.label}</strong><p>Price record not found. Refresh the portal and try again.</p></article>; return <article className="admin-report admin-price-row" key={plan.code}><strong>{plan.label}</strong><div className="admin-price-fields"><label>Price in ZAR<input type="number" min="0.01" step="0.01" value={price.price_zar ?? ''} onChange={event => updateSubscriptionPrice(plan.code,{price_zar:event.target.value === '' ? null : Number(event.target.value)})} placeholder="e.g. 49.00" /></label><label>Price in USD<input type="number" min="0.01" step="0.01" value={price.price_usd ?? ''} onChange={event => updateSubscriptionPrice(plan.code,{price_usd:event.target.value === '' ? null : Number(event.target.value)})} placeholder="e.g. 3.00" /></label></div><label className="admin-price-enable"><input type="checkbox" checked={price.enabled} onChange={event => updateSubscriptionPrice(plan.code,{enabled:event.target.checked})} /> Enable checkout for this plan</label><button className="button button-outline" type="button" disabled={priceSavingPlan === plan.code} onClick={() => void saveSubscriptionPrice(plan.code)}>{priceSavingPlan === plan.code ? 'Saving…' : 'Save price settings'}</button></article>; })}</div><div className="admin-report-list"><h3>Subscription approval queue</h3>{adminSubscriptions.length === 0 ? <p>No pending subscription requests.</p> : adminSubscriptions.map(item => <article className="admin-report" key={item.user_id}><strong>Member: {item.user_id}</strong><p>Requested plan: {item.plan_code}</p><small>Requested: {new Date(item.created_at).toLocaleString()}</small><div className="admin-report-actions"><button onClick={() => void reviewSubscription(item.user_id, item.plan_code, true)}>Approve after payment verified</button><button onClick={() => void reviewSubscription(item.user_id, item.plan_code, false)}>Decline</button></div><p>Only approve after independently confirming the payment has been received.</p></article>)}</div><div className="admin-report-list admin-payment-orders"><div className="payment-history-heading"><h3>Payment transactions</h3><button type="button" className="button button-outline" onClick={() => void refreshAdminPaymentOrders()}>Refresh transactions</button></div><p>Provider-confirmed payments activate subscriptions automatically. Never activate a subscription based only on a screenshot or a member’s claim.</p>{adminPaymentOrders.length === 0 ? <p>No payment transactions yet.</p> : adminPaymentOrders.map(order => <article className="admin-report" key={order.id}><div className="admin-report-heading"><strong>{planLabelByCode[order.plan_code] || order.plan_code} membership</strong><span className={'report-status ' + (order.status === 'succeeded' ? 'status-resolved' : order.status === 'failed' || order.status === 'expired' ? 'status-open' : 'status-reviewing')}>{order.status}</span></div><p>Member: {order.user_id || 'Unknown'}</p><p>{new Intl.NumberFormat(order.currency === 'USD' ? 'en-US' : 'en-ZA', { style:'currency', currency:order.currency }).format(Number(order.amount))} · {order.provider === 'kora_1voucher' ? 'OneVoucher' : 'Cryptocurrency'}</p><small>Created: {new Date(order.created_at).toLocaleString()}{order.paid_at ? ` · Paid: ${new Date(order.paid_at).toLocaleString()}` : ''}</small>{order.checkout_url && order.status === 'pending' && <p><a href={order.checkout_url} target="_blank" rel="noopener noreferrer">Open provider checkout ↗</a></p>}</article>)}</div><div className="admin-report-list"><h3>Safety history &amp; suspensions</h3>{reportsLoading ? <p>Loading safety history…</p> : safetyEvents.length === 0 ? <p>No contact-sharing violations recorded.</p> : safetyEvents.map(item => <article className="admin-report" key={item.id}><div className="admin-report-heading"><strong>{item.action_taken === 'suspended_24h' ? '24-hour suspension applied' : 'Message redacted · warning issued'}</strong><span className={'report-status ' + (item.action_taken === 'suspended_24h' ? 'status-open' : 'status-reviewing')}>Strike {item.strike_number}</span></div><p><strong>Original message (admin only):</strong> {item.original_message}</p><p><strong>Detection reasons:</strong> {item.detected_reasons.join(', ')}</p><small>Member ID: {item.user_id} · {new Date(item.created_at).toLocaleString()}</small></article>)}<h3>Current safety status</h3>{safetyStatus.length === 0 ? <p>No safety status records yet.</p> : safetyStatus.map(item => <article className="admin-report" key={item.user_id}><strong>Member ID: {item.user_id}</strong><p>Recent strikes: {item.strike_count}</p><p>Suspended until: {item.suspended_until ? new Date(item.suspended_until).toLocaleString() : 'Not currently suspended'}</p><small>Last updated: {new Date(item.updated_at).toLocaleString()}</small></article>)}</div><div className="admin-report-list"><h3>Member safety reports</h3>{reportsLoading ? <p>Loading reports…</p> : adminReports.length === 0 ? <p>No reports have been submitted.</p> : adminReports.map(report => <article className="admin-report" key={report.id}><div className="admin-report-heading"><strong>{report.reason || 'Member report'}</strong><span className={'report-status status-' + report.status}>{report.status}</span></div><p>{report.details || 'No extra details provided.'}</p><small>Reported member: {report.reported_user_id} · Submitted: {new Date(report.created_at).toLocaleString()}</small><div className="admin-report-actions"><button onClick={() => void updateReportStatus(report.id, 'reviewing')}>Mark reviewing</button><button onClick={() => void updateReportStatus(report.id, 'resolved')}>Resolve</button><button onClick={() => void updateReportStatus(report.id, 'dismissed')}>Dismiss</button></div></article>)}</div></div> : <div className="plan-detail"><h3>Restricted access</h3><p>Your account has not been granted administrator privileges. For security, admin access cannot be self-assigned from this public page.</p><p>Create a separate owner account below. After you register and confirm its email, send me that email address only so the account can be granted administrator access securely. Do not send your password or verification codes. Admin accounts will be exempt from subscription charges once the owner role is provisioned.</p><div className="admin-report-actions"><button className="button button-primary" onClick={() => { setPage('register'); setMode('signup'); setNotice('Register the separate account you want to use as DateMe owner. After email confirmation, send the account email address only so owner access can be provisioned.'); window.scrollTo(0,0); }}>Register owner account</button><button className="button button-outline" onClick={() => { setPage('register'); setMode('signin'); setNotice('Sign in with your separate owner account. If it has not yet been granted administrator access, send its email address only.'); window.scrollTo(0,0); }}>Sign in to owner account</button></div></div>}</section>}
        {page === 'how' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">NOT COMPLICATED. JUST HUMAN.</span><h2>Good things start <span>simply.</span></h2><div className="steps-grid"><article><span className="step-num">01</span><h3>Show up as you</h3><p>Create a profile that feels like you.</p></article><article><span className="step-num">02</span><h3>Find your people</h3><p>Discover people you would like to know.</p></article><article><span className="step-num">03</span><h3>Make the first move</h3><p>A kind hello can start a conversation.</p></article></div></section>}
        {page === 'safety' && <section className="portal-page how-section"><div className="portal-page-actions"><button onClick={() => setPage(session ? 'discover' : 'register')}>← Back</button><button onClick={() => setPage(session ? 'discover' : 'register')}>× Close</button></div><span className="eyebrow">ALWAYS YOUR CHOICE</span><h2>Safety <span>centre.</span></h2><p>Protect your personal details, take your time getting to know people, and meet in public places. Contact details are blocked for free members and for members on different subscription tiers; matched members on the same active, verified tier can exchange contact details. Repeated attempts to bypass restrictions may be blocked and trigger a temporary account freeze and safety review. Never send money to someone you have not met. Meet in public, tell a trusted person where you are going, and report or block anyone who makes you uncomfortable.</p></section>}

      </main>
      <footer><a className="brand-logo brand-logo-footer" href="#" aria-label="DateMe home"><DateMeLogo /></a><p>Made for the moments that matter.</p><span>© {new Date().getFullYear()} DateMe</span></footer>
      {focusedChatOnly && (demoChatPerson || activeMatch) && <section className="focused-chat-overlay" aria-label={`Private conversation with ${demoChatPerson?.display_name || activePerson?.display_name || 'your match'}`}>
        <div className="focused-chat-window">
          <header className="focused-chat-header">
            <button type="button" className="focused-chat-nav" onClick={() => { setFocusedChatOnly(false); setDemoChatPerson(null); setDemoMessages([]); setNotice(''); }} aria-label="Back" title="Back">‹ <span>Back</span></button>
            <span className="match-avatar">{(demoChatPerson?.photo_url || activePerson?.photo_url) ? <img src={(demoChatPerson?.photo_url || activePerson?.photo_url) as string} alt="" /> : '♡'}</span>
            <div className="focused-chat-person"><strong>{demoChatPerson?.display_name || activePerson?.display_name || 'Your match'}{demoChatPerson ? ' · Demo' : ''}</strong><small>{demoChatPerson ? 'Simulated conversation' : 'Private conversation'}</small></div>
            {!demoChatPerson && activeMatch && session && videoCallRecipientId && <VideoCall session={session} matchId={activeMatch.id} recipientId={videoCallRecipientId} allowed={videoCallAllowed} onNotice={setNotice} />}
             <button type="button" className="focused-chat-close" onClick={() => { setFocusedChatOnly(false); setDemoChatPerson(null); setDemoMessages([]); setActiveMatchId(''); setTab('discover'); setNotice(''); }} aria-label="Close conversation" title="Close">×</button>
          </header>
          <div className="focused-chat-messages">
            {(demoChatPerson ? demoMessages : messages.filter((m) => (!m.expires_at || new Date(m.expires_at).getTime() > Date.now()) && !hiddenMessageIds.includes(m.id))).map((message) => <div key={message.id} className={message.sender_id === (demoChatPerson ? 'demo-you' : session?.user.id) ? 'message-bubble mine' : 'message-bubble'}><div className="message-actions"><button type="button" className="message-menu-trigger" title="Message options" aria-label="Message options" aria-expanded={openMessageMenuId === message.id} onClick={() => setOpenMessageMenuId((current) => current === message.id ? null : message.id)}>⋯</button>{openMessageMenuId === message.id && <div className="message-options-menu" role="menu"><button type="button" role="menuitem" onClick={() => replyToChatMessage(message)}>↶ Reply</button>{!message.audio_path && <button type="button" role="menuitem" onClick={() => void translateChatMessage(message)}>{translationBusyId === message.id ? '… Translating' : '文 Translate in DateMe'}</button>}{message.audio_path && <><button type="button" role="menuitem" onClick={() => playVoiceMessage(message)}>▶ Play voice note</button><button type="button" role="menuitem" onClick={() => downloadVoiceMessage(message)}>↓ Download voice note</button></>}<button type="button" role="menuitem" onClick={() => copyChatMessage(message)}>▢ Copy</button><button type="button" role="menuitem" onClick={() => deleteChatMessageForMe(message, Boolean(demoChatPerson))}>Delete for me</button>{(demoChatPerson || message.sender_id === session?.user.id) && <button type="button" role="menuitem" className="message-delete-action" onClick={() => void deleteChatMessageForEveryone(message, Boolean(demoChatPerson))}>Delete for everyone</button>}</div>}</div>{message.reply_to && !demoChatPerson && <p className="reply-reference">↶ {getReplyMessageBody(message.reply_to)}</p>}{message.audio_path && supabase ? <audio id={`voice-${message.id}`} className="message-audio-engine" preload="none" src={voiceUrls[message.id] || undefined} /> : <p>{message.body}</p>}{translatedMessages[message.id] && <div className="message-translation"><label>Translated in DateMe <select aria-label="Translation language" value={translationLanguage} onChange={(e) => setTranslationLanguage(e.target.value)}><option value="en">English</option><option value="af">Afrikaans</option><option value="zu">isiZulu</option><option value="xh">isiXhosa</option><option value="st">Sesotho</option><option value="tn">Setswana</option><option value="nso">Sepedi</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option><option value="de">German</option><option value="it">Italian</option><option value="sw">Swahili</option><option value="ar">Arabic</option><option value="zh-CN">Chinese</option><option value="hi">Hindi</option><option value="ja">Japanese</option><option value="ru">Russian</option><option value="nl">Dutch</option><option value="pl">Polish</option></select></label><p>{translatedMessages[message.id]}</p><button type="button" onClick={() => void translateChatMessage(message)}>Translate again</button></div>}<time>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>)}
            {(demoChatPerson ? demoMessages.length === 0 : messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).length === 0) && <p className="chat-empty">Say hello to start your conversation.</p>}
          </div>
          {replyTo && !demoChatPerson && <div className="reply-composer"><span>↶ Replying to: {replyTo.body.slice(0, 70)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></div>}
          {voicePreview && !demoChatPerson && <div className="voice-preview"><audio controls src={voicePreview} /><button type="button" onClick={() => { URL.revokeObjectURL(voicePreview); setVoicePreview(null); setVoiceBlob(null); }}>Discard</button><button type="button" onClick={() => void sendVoiceNote()} disabled={recordingBusy}>Send voice note</button></div>}
          {showEmojiPicker && <div className="emoji-picker" aria-label="Emoji picker">{['😀','😂','🥰','😍','😘','😊','😉','❤️','💕','💖','🔥','👏','👍','🙏','🌹','✨','😢','😅','🤗','💋'].map((emoji) => <button type="button" key={emoji} onClick={() => setMessageText((text) => text + emoji)}>{emoji}</button>)}</div>}
          <form className="focused-chat-compose" onSubmit={sendMessage}>
            {demoChatPerson ? null : <button type="button" className="chat-tool-button" aria-label="Choose emoji" title="Emoji" onClick={() => setShowEmojiPicker((show) => !show)}>☺</button>}
            <input value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder={replyTo && !demoChatPerson ? 'Write a reply…' : demoChatPerson ? 'Write a message to practise…' : 'Write a message…'} aria-label="Message" />
            {!demoChatPerson && <button type="button" className="chat-tool-button" aria-label={recording ? 'Stop recording' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'} onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()} disabled={recordingBusy}>{recording ? '■' : '🎙'}</button>}
            <button className="button button-primary" type="submit" disabled={!messageText.trim()}>Send ↗</button>
          </form>
        </div>
      </section>}
    </div>
  );
}
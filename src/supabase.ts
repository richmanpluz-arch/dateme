import { createClient } from '@supabase/supabase-js';

// The publishable key is intended for browser use. Database access remains
// protected by Supabase Auth and Row Level Security policies.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || 'https://xpyjxwcergdwjybdhjbf.supabase.co';
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || 'sb_publishable_I1K5SalJTaaUBCnmRFP3Cw_9zvtPOFS';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

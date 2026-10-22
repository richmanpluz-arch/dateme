# DateMe 💗

A mobile-friendly dating app built with React, TypeScript, Vite and Supabase, with a free-tier-first setup.

## Current features

- Responsive landing page and email/password registration and login
- Session persistence and sign-out through Supabase Auth
- Profile editor for display name, age (18+), city, bio and secure profile photo uploads (JPG, PNG or WebP up to 5 MB)
- Profile discovery and likes saved in Supabase
- Automatic mutual-like matching through a database trigger
- Match list and private chat UI with realtime message updates
- Row Level Security policies for profiles, likes, matches and messages

Demo profile cards shown before sign-in are illustrative examples, not actual members.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite.

## Connect Supabase

The app is already configured in the GitHub Pages workflow for the existing DateMe Supabase project. For local development, go to **Supabase → Project Settings → API** and copy the **Project URL** and **Publishable key** into `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The key used in a browser app must be a public publishable key (or legacy anon key). **Never use a service-role or secret key in client code, GitHub, or any `VITE_*` variable.**

The schema is in `supabase/schema.sql`. It has been applied to the connected Supabase project, including the mutual-like trigger, realtime message publication, and `dateme-avatars` storage bucket with per-member upload policies. If setting up a different project, run that SQL in its SQL Editor.

## Build checks

```bash
npm run typecheck
npm run build
```

## Before a public launch

This is still an early build. Important next steps include real photo uploads to Supabase Storage, report/block and moderation flows, account deletion, password reset, abuse prevention/rate limits, a more complete privacy/terms experience, and end-to-end testing with multiple accounts. Review the RLS policies and Supabase security advisors before accepting real users. Free-tier quotas can change.

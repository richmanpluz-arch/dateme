# DateMe 💗

A mobile-friendly dating app starter built with React, TypeScript, Vite and Supabase. Designed to start on free tiers.

## What's included

- Responsive DateMe landing page and account forms
- Email/password sign-up and sign-in using Supabase Auth
- Session persistence and sign-out
- Discovery cards and a starter likes flow
- SQL schema for profiles, likes, matches and messages
- Row Level Security policies for exposed tables
- Demo profile cards when Supabase environment variables are not configured

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. Edit `.env.local` with values from your existing Supabase project.

## Connect your existing Supabase project

1. Open Supabase and select your existing project.
2. Go to **Project Settings → API**.
3. Copy the **Project URL** and the **Publishable key** (usually begins with `sb_publishable_`). A legacy `anon` key is also suitable for a public browser client.
4. Put those values in `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Open **SQL Editor** and run the SQL from `supabase/schema.sql`.
6. Under **Authentication → URL Configuration**, allow your local development URL (normally `http://localhost:5173`) if you use email confirmation.
7. In **Authentication → Providers → Email**, choose whether new accounts require email confirmation.

**Security:** Never put a `service_role` key or a secret key in this browser app, GitHub, or a `VITE_*` variable. The database schema enables RLS on all app tables. Run Supabase security advisors after applying it and review the policies before public launch.

## Build checks

```bash
npm run typecheck
npm run build
```

## Current scope

This is the first foundation, not a finished dating service. Profile editing, reciprocal-match creation, chat UI, reporting/blocking, image upload, account deletion and moderation tools still need implementation before a public launch. Demo cards are examples only, not real or verified users.

## Free deployment

A static Vite app can be hosted on a compatible free static-hosting tier. Configure the same two public environment variables in the host settings. A custom domain is optional and may cost money. Free-tier limits and availability can change.

-- Keep voice-note uploads restricted to approved DateMe accounts and matched conversations.
-- Remove older permissive duplicate policies so they cannot bypass access checks.
drop policy if exists "Matched members can upload voice notes" on storage.objects;
drop policy if exists "Matched members can play voice notes" on storage.objects;
drop policy if exists "Uploader deletes own DateMe voice notes" on storage.objects;

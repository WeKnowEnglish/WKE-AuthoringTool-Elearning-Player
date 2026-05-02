# Security notes

## What “stealing keys” means for this app

### Supabase (anon / publishable key)

The key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or Supabase’s `sb_publishable_…` value) is **meant to be used in browsers**. It is **not** a secret like a database password. Anyone can extract it from the JavaScript bundle on `/teacher/login`.

**Real protection** is:

1. **Row Level Security (RLS)** in Postgres (see `supabase/migrations/001_initial.sql`) so that key only does what policies allow.
2. **Never** putting the **service role** key in the browser or in `NEXT_PUBLIC_*` variables.

If someone copies your anon/publishable key, they can only perform operations RLS allows (e.g. read published lessons). **Rotate** the key in the Supabase dashboard if abuse is suspected, and review RLS policies.

### Teacher media (`lesson_media` bucket)

Migration `005_teacher_media.sql` adds a **public** Storage bucket so anonymous students can load lesson images without signed URLs. Object paths use `{user_id}/{uuid}-filename` so URLs are hard to guess. **Teachers** can insert only under their own `user_id` prefix; **anyone** can read objects in the bucket. The `media_assets` table (teachers-only via RLS) powers the shared library picker in the teacher UI.

### Server-only env vars (recommended on Hostinger)

For server code and middleware, prefer:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (same value as the publishable/anon key)

These are **not** prefixed with `NEXT_PUBLIC_`, so they are **not** embedded in client-side bundles for code that only runs on the server. You should still set **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** for **teacher** sign-in in the browser (same values).

### Gemini (`GEMINI_API_KEY`)

Must be **server-only** (no `NEXT_PUBLIC_`). The app calls Gemini only from teacher API routes (`/api/teacher/ai/plan` drafts a saved lesson plan; `/api/teacher/ai/generate` builds screens from the plan document or, with legacy JSON fields, runs plan + screen generation in one request) after verifying a **teacher** session. Rate limiting reduces abuse if a session is compromised. Optional `GEMINI_MODEL` defaults to `gemini-2.5-flash` in code.

If this key leaks, revoke it in Google AI Studio and create a new one.

## Operational checklist

- Keep **`.env.local`** out of git (already in `.gitignore`).
- Do **not** paste **service role** or **Gemini** keys in chat, tickets, or screenshots.
- In Supabase: **Authentication → URL configuration** — restrict redirect URLs to your real domains.
- Optional: Supabase **Network restrictions** / project settings if your plan supports IP allowlists.
- Production: use **HTTPS** (Hostinger); the app sets security headers (see `next.config.ts`).

## Rate limits

Teacher AI generation is limited per teacher user in-memory (see `lib/rate-limit/memory.ts`). For multiple server instances, replace with Redis/Upstash or similar.

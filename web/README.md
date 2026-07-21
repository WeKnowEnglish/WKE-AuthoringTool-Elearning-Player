# We Know English — Lesson Player (Next.js)

## Planning source of truth

Start with [docs/lesson-player-master-document.md](./docs/lesson-player-master-document.md) for the current student-experience brief, architecture direction, archive policy, and roadmap.

For Cursor lesson-building work, use [docs/CURSOR_LESSON_CREATION_HANDOFF.md](./docs/CURSOR_LESSON_CREATION_HANDOFF.md).

## Setup

1. Create `web/.env.local` from `.env.example` and set:
   - `SUPABASE_URL` + `SUPABASE_ANON_KEY` — same project URL and anon/publishable key (server + middleware; **no** `NEXT_PUBLIC_` prefix)
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **same values** (required for teacher sign-in in the browser)
   - `GEMINI_API_KEY` — Google AI Studio key (**never** prefix with `NEXT_PUBLIC_`)
   - Optional: `GEMINI_MODEL` — defaults to `gemini-2.5-flash` (see `lib/ai/gemini.ts`)

   See **[SECURITY.md](./SECURITY.md)** for why the Supabase “public” key is not a secret and what actually protects your data (RLS, no service role in the client).

2. In Supabase **SQL Editor**, run migrations in order:
   - `supabase/migrations/001_initial.sql` (tables, RLS, seed lesson)
   - `supabase/migrations/002_grants_anon_authenticated.sql` (fixes **permission denied** for API access if you see catalog load errors)
   - Optional seeds: `003_*`, `004_*` if you want bundled curriculum
   - `supabase/migrations/005_teacher_media.sql` — **teacher Upload / Media library** (Storage bucket `lesson_media` + `media_assets` table)
   - `supabase/migrations/018_lesson_learning_goals.sql` — **lesson learning objectives** (`lessons.learning_goals` JSON array for the editor + AI generator)
   - `supabase/migrations/019_lesson_plan.sql` — **shared lesson plan** (`lessons.lesson_plan` text + optional `lesson_plan_meta` for AI)
   - `supabase/migrations/024_student_mastery.sql` — **student mastery + evidence** (`student_mastery_records`, `student_learning_evidence`; P1a schema + RLS)
   - `supabase/migrations/025_evidence_id_text.sql` — **evidence id as text** (matches composite event ids; P1c write-through)
   - `supabase/migrations/032_teacher_access_requests.sql` — teacher access request form storage (optional)
   - `supabase/migrations/034_grammar_modules.sql` — **grammar poster Save/Publish** (`grammar_modules` table + RLS)

3. **Teacher account** — pick one:
   - **Script (recommended):** add **`SUPABASE_SERVICE_ROLE_KEY`** to `.env.local` (Supabase → Project Settings → API → **service_role** secret). Then run:
     ```bash
     npm run create-teacher -- your@email.com YourPassword
     npm run create-teacher -- your@email.com 00000000 --tier light
     ```
     This creates (or updates) the user with **`app_metadata.role`: `teacher`**, **`teacher_tier`**: `light`|`plus` (default `plus`), and **`must_change_password`**: `true` by default (use `--no-must-change-password` to skip induction). Email is confirmed. On first sign-in, teachers with the induction flag are sent to `/teacher/set-password` (new password + confirm, with show/hide) before the portal.
   - **Dashboard:** Authentication → Users → Add user, then edit the user → **App metadata** → `{ "role": "teacher", "teacher_tier": "light", "must_change_password": true }`.

   Public teacher registration is intentionally disabled. The Teacher tab offers a **Request teacher access** form instead. To enable administrator notifications, apply `032_teacher_access_requests.sql` and configure `RESEND_API_KEY` plus `TEACHER_ACCESS_NOTIFICATION_EMAIL`. Requests are stored for review and never create an account automatically.

   **Grammar posters:** Teachers edit at `/teacher/grammar`. Run migration `034_grammar_modules.sql`, then use **Save** (draft) or **Publish** (live for students). Until published, students keep seeing the bundled JSON files in `content/grammar/`.

4. **Supabase Auth URLs** (required for password reset and magic links):
   - Dashboard → **Authentication** → **URL Configuration**
   - **Site URL**: the canonical origin students/teachers use (e.g. `http://localhost:3000` in dev, or your production `https://…`).
   - **Redirect URLs**: must include your callback route, for example:
     - `http://localhost:3000/auth/callback`
     - `https://your-production-domain.com/auth/callback`
     - You can use a wildcard such as `http://localhost:3000/**` if the dashboard allows it.
   - Reset links from **Forgot password** on `/teacher/login` send users to `/auth/callback?next=/teacher/reset-password`. If that URL is not allowed, the link will fail or bounce without a session.

5. Local dev: `npm run dev` → [http://localhost:3000](http://localhost:3000)

### Troubleshooting teacher login (e.g. after a paused Supabase project)

- **Invalid credentials:** Confirm `.env.local` still has the correct **Project URL** and **anon** key (Dashboard → **Project Settings** → **API**). Keys change if you create a new project or rotate secrets.
- **Email not confirmed:** In **Authentication → Users**, open the user and ensure the account is confirmed (or confirm via email).
- **`app_metadata.role` must be `teacher`:** Otherwise sign-in succeeds but the app signs you out with “not a teacher.” Run `npm run create-teacher -- your@email.com YourPassword` again (it updates role for an existing user) or set `{ "role": "teacher" }` under **App metadata** in the Dashboard.
- **Password reset email opens the site but there is no reset page:** The app must expose `/auth/callback` (see above) and **Redirect URLs** must allow it. Then use **Email me a reset link** on `/teacher/login`, or set **redirect URL** in the Dashboard “Reset password” template to `{your origin}/auth/callback?next=/teacher/reset-password`.

## Hostinger (Node.js)

- Build: `npm run build`
- Start: `npm run start` (set `PORT` in the panel if required)
- `next.config.ts` uses `output: "standalone"` for a smaller production bundle in Docker/Node hosting.

## Project layout

- Student UI: `/`, `/learn`, `/profile`, `/learn/[module]/[lesson]`
- Teacher UI: `/teacher` (requires `app_metadata.role === "teacher"`)
- Progress: `localStorage` key `wke-progress-v1` (anonymous students)

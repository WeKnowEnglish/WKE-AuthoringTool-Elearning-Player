# Route Inventory (Evidence)

Audit date: 2026-07-20  
Scope: `web/` Next.js app. Route groups `(student)` / `(secure)` do not appear in URLs.

## Auth layer

| Mechanism | Path | Behavior |
|-----------|------|----------|
| Proxy / session refresh | `web/proxy.ts` → `lib/supabase/middleware.ts` | Cookie refresh only; **no role redirects** |
| Role helpers | `lib/auth/roles.ts` | `teacher` / `student` from `app_metadata.role` (+ email allowlist) |
| Post-login | `lib/auth/post-login-path.ts` | `a2` → `/secondary`; else `/primary` |
| Band gate | `lib/auth/student-bands.ts` | Secondary-eligible = `a2` only |

## Primary portal

| URL | File | Auth | Notes |
|-----|------|------|-------|
| `/primary` | `app/(student)/primary/page.tsx` | Student required | Canonical dashboard (`STUDENT_DEFAULT_PATH`) |
| `/learn` | `app/(student)/learn/page.tsx` | Redirect only | → `/primary?nav=learn` |
| `/profile` | `app/(student)/profile/page.tsx` | Redirect | → `/primary?nav=progress` |
| `/testprimary` | `app/(student)/testprimary/page.tsx` | Redirect | → `/primary` |
| `/home` | `app/(student)/home/page.tsx` | Student required | **Legacy** world hub (`StudentHubClient`) |
| `/join-class` | `app/(student)/join-class/page.tsx` | Student required | Class enrollment |

## Secondary portal

| URL | File | Auth |
|-----|------|------|
| `/secondary` | `app/(student)/secondary/page.tsx` | `requireSecondaryStudentAccess()` |
| `/secondary/login` | `app/(student)/secondary/login/page.tsx` | Login / redirect |
| `/secondary/match` | `…/match/page.tsx` | Secondary access |
| `/secondary/cloze` | `…/cloze/page.tsx` | Secondary access |
| `/secondary/spelling` | `…/spelling/page.tsx` | Secondary access |
| `/secondary/sentence` | `…/sentence/page.tsx` | Secondary access |

Nested layout: `app/(student)/secondary/layout.tsx` → `SecondaryPracticeLayout`.

## Shared student (mixed gates)

| URL | Auth on page | Notes |
|-----|--------------|-------|
| `/` | Public landing | May redirect authenticated users |
| `/login` | Shared login | |
| `/grammar` | **No page-level student gate** | Published catalog |
| `/grammar/[slug]` | **No page-level student gate** | Published only → else `notFound()` |
| `/grammar/pilot/layouts` | Dev-only | Prod → `notFound()` |
| `/activities*` | Archived | `notFound()` |

## Live / collaborative (student join surfaces)

| URL family | Notes |
|------------|-------|
| `/whiteboard/*`, `/virtual-classroom/*`, `/document/*` | Session join / play |
| `/live-game/*`, `/board-game/*` | Live / board games |
| `/word-cards/[joinCode]` | Word cards join |
| `/activity/sentence-strip/*` | Sentence strip |
| `/teststartpage` | Prototype / test start |
| `/pilots/*` | Dev pilots |

## Teacher

Secure layout: `app/teacher/(secure)/layout.tsx` — teacher role required.

| URL | Purpose |
|-----|---------|
| `/teacher/classes`, `/new`, `/[classId]`, students | Class roster / diagnostics |
| `/teacher/grammar`, `/[slug]` | Grammar poster editor |
| `/teacher/media` | Media library |
| `/teacher/virtual-classroom/*`, `/whiteboard/*`, `/document/*`, `/word-cards/*` | Live classroom tools |
| `/teacher/activities` | Archived (`notFound()`) |

## CMS status (route evidence)

- No `/teacher/courses*` routes (archived per docs).
- Authoring that exists: grammar posters, media library, live-game question-set APIs/UI.
- Primary vocab: code modules under `lib/vocabulary-templates/sets/` — **not** a teacher CMS route.

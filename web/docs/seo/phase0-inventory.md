# Phase 0 ΓÇö SEO URL inventory (repository-based)

**Date:** 2026-07-27  
**Scope:** Lesson Player Next.js app (`web/`). Legacy WordPress / Grade 3 surfaces are noted but not fully inventoried here.

## External inputs (pending)

| Source | Status | Notes |
|--------|--------|-------|
| Search Console Page Indexing export | **Pending** | Primary indexed-URL inventory |
| Search Console performance export | **Pending** | Impressions/clicks by URL/query |
| URL Inspection (key URLs) | **Pending** | `/`, `/grammar`, published posters |
| Analytics landing pages | **Pending** | Organic landings |
| Backlink reports | **Pending** | Especially legacy Grade 3 / activity URLs |
| Production access logs | **Pending** | Optional crawl/404 patterns |
| `site:weknowenglish.online` | Spot-check only | Not exhaustive per Google |

## Query-to-page intent map (approved)

| Page | Primary intent | Secondary intent | Ship status |
|------|----------------|------------------|-------------|
| `/` | Interactive ESL teaching platform | ESL activities and teaching tools | Live (pre-rewrite) |
| `/esl-activities-for-kids` | Find usable online ESL activities | Browse by topic, level, skill | Not built (PR 3) |
| `/teach-english-online` | How to teach English online to kids | Tools and workflow | Not built (PR 3) |
| `/english-learning-for-kids-at-home` | Parent-guided home English practice | Structured child self-study | Not built (PR 3) |
| `/about` | Who built this, credentials | Trust signal | Not built (PR 2) |

## Canonical policy (repo)

- Production host: `https://weknowenglish.online`
- Path style: **no trailing slash** (Next.js default; do not enable `trailingSlash`)
- Bare homepage canonical: `https://weknowenglish.online` (no trailing slash; consistent with Next metadata output)

## Route classification (from app routes)

### Public / potentially indexable (allow crawl; index when intentional)

| Path | Notes | Sitemap (PR 1) |
|------|-------|----------------|
| `/` | Marketing homepage; auth users may redirect away | Yes |
| `/grammar` | Public grammar hub | Yes |
| `/grammar/[slug]` | Published posters only; unpublished ΓåÆ 404 | Yes (published only) |

### Login / account gateways (`noindex, follow`)

| Path | Notes |
|------|-------|
| `/login` | Unified portal login |
| `/secondary/login` | Secondary student login |
| `/teacher/login` | Redirects to `/login?portal=teacher` |
| `/join-class` | Class join (auth-gated today) |
| `/teacher/set-password`, `/teacher/reset-password` | Account utilities |

### Private / product shells (`noindex`; prefer `follow` for dashboards)

| Path | Notes |
|------|-------|
| `/primary`, `/primary/homework/[id]` | Student primary; already noindex |
| `/secondary`, `/secondary/*` (practice) | Auth-gated practice |
| `/teacher`, `/teacher/classes`, `/teacher/classes/*` | Teacher workspace |
| `/teacher/media`, `/teacher/admin/*` | Teacher / admin |
| `/teacher/grammar/*`, `/teacher/word-packs/*` | Auth editors; already noindex where set |
| `/home`, `/learn`, `/profile`, `/testprimary` | Redirect shells |

### Session / editor / player (`noindex, nofollow`)

| Path | Notes |
|------|-------|
| `/teacher/activity-builder`, `/teacher/activity-builder/*` | Authoring |
| `/teacher/whiteboard/*`, `/teacher/virtual-classroom/*`, `/teacher/document/*`, `/teacher/word-cards/*` | Live sessions |
| `/pilots`, `/pilots/*` | Internal triage / pilots |
| `/live-game`, `/live-game/*` | Live game surfaces |
| `/board-game`, `/board-game/**` | Board game surfaces |
| `/whiteboard/[sessionId]`, `/whiteboard/join` | Whiteboard |
| `/virtual-classroom/*` | VC join/session |
| `/wke/[handle]`, `/wke/[handle]/play/[itemId]` | Teacher space; already noindex |
| `/grammar/pilot`, `/grammar/pilot/editor`, `/grammar/pilot/editor/[slug]` | Grammar pilots / editors |
| `/activity/sentence-strip/*` | Activity sessions |

### Permanent redirects (no metadata; keep out of sitemap)

| From | To | Expected status |
|------|-----|-----------------|
| `/t/[handle]` | `/wke/[handle]` | **308** (PR 1: `permanentRedirect`) |
| `/t/[handle]/play/[itemId]` | `/wke/.../play/...` | **308** |
| `/teachers` | `/teacher` | Redirect |
| `/grammar/pilot` | published questions poster slug | Redirect |
| Various `/home`, `/learn`, `/profile`, `/testprimary` | primary / teacher paths | Redirect |

### Archived / gone (real 404 preferred)

| Path | Behavior | Legacy decision |
|------|----------|-----------------|
| `/activities` | `notFound()` | Keep 404 unless GSC shows valuable impressions ΓåÆ then map |
| `/activities/[activityId]` | `notFound()` | Same |
| `/teacher/activities` | `notFound()` | Same |

### APIs (disallow in robots.txt)

All `/api/**` ΓÇö not HTML; crawl disallowed in `robots.ts`.

## Unresolved legacy URL decisions (for Search Console review)

1. **Legacy Grade 3 / WordPress URLs on the same domain** ΓÇö inventory and 301 vs 404/410 when GSC/backlink data arrives. Do not mass-redirect to `/`.
2. **Archived activity-library URLs** ΓÇö currently 404 in-app; confirm whether any indexed URLs need a close-replacement 301.
3. **`/grammar/pilot` legacyRoutes** ΓÇö catalog notes `legacyRoutes: ["/grammar/pilot"]`; confirm Search Console treatment after redirect.
4. **`/t/*` bookmarks** ΓÇö permanent redirect to `/wke/*`; destination remains noindex (private teacher space).
5. **www vs apex** ΓÇö enforce apex in proxy; confirm DNS/Vercel domain aliases match.

## PR 1 acceptance (this inventory)

- Route matrix recorded from the repo.
- External GSC/backlink/index findings marked pending.
- No homepage rewrite, pillars, or public activity hubs in PR 1.

## PR 1 verification notes (2026-07-27)

- `/t/[handle]` returns **308** via `permanentRedirect` to `/wke/[handle]` (integration smoke).
- Preview/local hosts send `X-Robots-Tag: noindex, nofollow` via `proxy.ts`.
- Unit: `npm run test:seo:unit` ΓÇö pass.
- Integration: `npm run test:seo` after `npx next build --webpack` ΓÇö pass.
- Local `next build` currently requires `--webpack` (Turbopack package alias resolution for explore-hotspots); unrelated to SEO content.

## PR 2 verification notes (2026-07-27)

- Homepage H1: ΓÇ£Interactive ESL activities and teaching tools in one connected platformΓÇ¥.
- Persistent header + mobile strip: Student sign in / Join class / Teacher sign in.
- Free activities link to real grammar posters + playable hobbies pilots (no coming-soon).
- Trust routes live: `/about`, `/contact`, `/privacy`, `/terms`, `/child-safety` (in sitemap).
- Marketing events: privacy-safe sessionStorage recorder (`lib/seo/marketing-events.ts`).
- Primary/Secondary path picker demoted below the platform story.

## PR 3 verification notes (2026-07-27)

- Three pillar routes live (SSR, indexable):
  - `/esl-activities-for-kids`
  - `/teach-english-online` (Article JSON-LD + author byline)
  - `/english-learning-for-kids-at-home`
- Shared marketing shell: `MarketingPageShell`, `PillarBreadcrumbs`, `BreadcrumbList` JSON-LD.
- Pillars in sitemap registry; internal links from homepage `LandingTrustSection` + `SiteFooter` guides column.
- `.marketing-prose` typography in `globals.css`.
- Unit: `npm run test:seo:unit` — **16 passed** on `feat/student-portal-classroom-spine`.

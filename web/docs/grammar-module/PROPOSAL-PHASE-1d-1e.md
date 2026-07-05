# Proposal: Grammar Builder Phase 1d & 1e

**Status:** Implemented (2026-07-05)  
**Author:** Cursor agent (implementation planning)  
**Date:** 2026-07-05  
**Reviewers:** Product / content / engineering  

---

## 1. Executive summary

Phase **1d** generalizes the grammar poster pipeline from a single hardcoded pilot route to a **slug-based catalog** with a canonical student route at `/grammar/[slug]`. Phase **1e** adds a **second live A1 poster** (There is / There are — Affirmative) using only layout types already supported by the mapper (`two-equal`, `banner`).

Together, these phases prove the system is **multi-module ready** before investing in Phase 2 layout mappers (`three-column`, `full-width-split`, etc.).

| Phase | Outcome | Estimated effort |
|-------|---------|------------------|
| **1d** | Catalog + slug routing + pilot redirect + validation | 1 focused session |
| **1e** | Second poster JSON, author sync, visual QA | 1 focused session (content-heavy) |

**Out of scope:** Grammar hub (`/grammar` index), component rename (`pilot` → `poster`), new layout mappers, Lesson Player integration, home-screen links.

---

## 2. Background

### 2.1 Completed work (Phase 1a–1c + hardening)

- Zod validation, theme tokens, poster mappers (`two-equal`, `banner`)
- `/grammar/pilot` loads `content/grammar/there-is-there-are-poster-a1.json`
- `npm run validate:grammar` — 42 unit tests + content validation script
- Content sync test vs `docs/grammar-module/examples/`
- Error boundary at `/grammar/pilot/error.tsx`
- Layout lab dev-only (`notFound()` in production)

### 2.2 Current limitations

| Limitation | Impact on 1d/1e |
|------------|-----------------|
| `loadPilotPosterModule()` hard-imports one JSON file | Must replace with slug loader |
| No module catalog | Cannot discover or validate module set |
| Mapper supports 2/9 `layoutType` values | 1e must use `two-equal` + `banner` only |
| Author affirmative fixture uses `three-column` + `full-width-split` | Cannot ship author JSON as-is; need A1 poster variant |
| `/grammar/pilot` is the only student URL | Bookmarks exist; need redirect strategy |

### 2.3 Reference material

| Resource | Path |
|----------|------|
| Questions A1 runtime JSON | `content/grammar/there-is-there-are-poster-a1.json` |
| Questions A1 author copy | `docs/grammar-module/examples/there-is-there-are-poster-a1.json` |
| Affirmative author JSON (full) | `docs/grammar-module/examples/there-is-there-are.json` |
| Reference JPG (affirmative) | `z8010050168940_2be6fd374453a0e8018271a22e4b4c73.jpg` |
| UI spec | `docs/grammar-module/SOURCE_OF_TRUTH_UI_GUIDE.md` §8 |

---

## 3. Phase 1d — Slug routing & module catalog

### 3.1 Goals

1. **Canonical route:** `/grammar/[slug]` for all student grammar posters.
2. **Catalog as source of truth:** One registry lists published modules, maps slug → JSON file.
3. **Build-time safety:** Invalid catalog entries or missing files fail `validate:grammar` and `next build`.
4. **Backward compatibility:** `/grammar/pilot` continues to work via redirect.
5. **No new UI components:** Reuse `GrammarPilotPage` as-is.

### 3.2 Non-goals

- Dynamic runtime `fs` reads (use static imports for known modules).
- Grammar hub / listing page.
- Supabase or CMS-backed catalog.
- Renaming `components/grammar/pilot/` (deferred to Phase 1f).

---

### 3.3 Catalog design

**File:** `content/grammar/catalog.json`

```json
{
  "version": 1,
  "modules": [
    {
      "slug": "there-is-there-are-questions-a1",
      "title": "There is / There are — Questions",
      "description": "Learn when to use Is there and Are there.",
      "difficulty": "A1",
      "file": "there-is-there-are-poster-a1.json",
      "status": "published",
      "thumbnailEmoji": "❓",
      "legacyRoutes": ["/grammar/pilot"]
    }
  ]
}
```

**Zod schema:** `lib/grammar-builder/catalog-schema.ts`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `slug` | string | yes | `^[a-z0-9]+(-[a-z0-9]+)*$`, unique |
| `title` | string | yes | Student-facing display name |
| `description` | string | no | Used in `generateMetadata` |
| `difficulty` | A1 \| A2 \| B1 | no | Must match module JSON when present |
| `file` | string | yes | Basename under `content/grammar/`, must end in `.json`, not `catalog.json` |
| `status` | `draft` \| `published` | yes | Only `published` slugs get static params |
| `thumbnailEmoji` | string | no | Reserved for Phase 3 hub |
| `legacyRoutes` | string[] | no | Documented redirects (informational) |

**Catalog validation rules (refinement):**

- Slugs unique within `modules[]`
- `file` values unique
- Each `file` exists on disk
- Each referenced module parses + maps successfully
- `status: published` requires `displayMode: poster` in module JSON
- Optional: `difficulty` in catalog matches module JSON

---

### 3.4 Loader architecture

**New files:**

| File | Responsibility |
|------|----------------|
| `lib/grammar-builder/catalog-schema.ts` | Zod schema + types |
| `lib/grammar-builder/load-catalog.ts` | Parse `catalog.json`, export helpers |
| `lib/grammar-builder/poster-module-registry.ts` | Static JSON import map keyed by filename |
| `lib/grammar-builder/load-poster-module-by-slug.ts` | Slug → catalog entry → JSON → parse → map |

**Registry pattern (build-time safe):**

```typescript
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
// 1e adds: import affirmativeJson from "@/content/grammar/there-is-there-are-affirmative-a1.json";

const POSTER_JSON_BY_FILE: Record<string, unknown> = {
  "there-is-there-are-poster-a1.json": questionsJson,
  // 1e: "there-is-there-are-affirmative-a1.json": affirmativeJson,
};
```

**Why not pure `readFileSync`?** Matches existing `import json` pattern; invalid JSON fails at compile time; no bundler edge cases with dynamic paths.

**Public API:**

```typescript
export function loadPosterModuleBySlug(slug: string): PosterModuleView;
export function getPublishedGrammarSlugs(): string[];
export function getGrammarCatalogEntry(slug: string): GrammarCatalogEntry | undefined;
export function loadGrammarCatalog(): GrammarCatalog;
```

**`loadPosterModuleBySlug` behavior:**

1. Look up slug in catalog → 404 path if missing or `status !== published`
2. Resolve `file` in registry → throw `GrammarModuleLoadError` if unregistered (dev/build catch)
3. `parseGrammarModule(json)` with poster rules
4. Assert `displayMode === "poster"`
5. `mapPosterModule(module)`

**Deprecation:** `loadPilotPosterModule()` becomes thin wrapper:

```typescript
export function loadPilotPosterModule() {
  return loadPosterModuleBySlug("there-is-there-are-questions-a1");
}
```

---

### 3.5 Routing

**New route:** `app/(student)/grammar/[slug]/page.tsx`

```typescript
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPublishedGrammarSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getGrammarCatalogEntry(slug);
  if (!entry || entry.status !== "published") return {};
  return {
    title: `${entry.title} — Grammar`,
    description: entry.description ?? `Learn ${entry.title}.`,
  };
}

export default async function GrammarPosterRoutePage({ params }: Props) {
  const { slug } = await params;
  const entry = getGrammarCatalogEntry(slug);
  if (!entry || entry.status !== "published") notFound();

  const { hero, sections, pageLayout } = loadPosterModuleBySlug(slug);
  return <GrammarPilotPage hero={hero} sections={sections} pageLayout={pageLayout} />;
}
```

**Error boundary:** Move or duplicate `error.tsx` to `app/(student)/grammar/[slug]/error.tsx` (same kid-friendly UI). Optionally add shared `app/(student)/grammar/error.tsx` for both `[slug]` and legacy pilot during transition.

**Pilot redirect:** Replace `app/(student)/grammar/pilot/page.tsx` body with:

```typescript
import { redirect } from "next/navigation";

export default function GrammarPilotRedirectPage() {
  redirect("/grammar/there-is-there-are-questions-a1");
}
```

Use **307 temporary redirect** initially (easier rollback); switch to **308 permanent** after QA confirms slug stability.

**Layouts route:** Unchanged at `/grammar/pilot/layouts` (dev-only). Update back link in `GrammarPilotLayoutsPage` to point to canonical slug URL.

---

### 3.6 Validation & CI

**Extend `scripts/validate-grammar-content.ts`:**

1. Parse and validate `catalog.json` against Zod schema
2. For each catalog entry: file exists, registered in import map, parse + map OK
3. Warn on JSON files in `content/grammar/` not listed in catalog
4. Fail on duplicate slugs / duplicate files

**Extend `grammar-content-sync.test.ts`:**

- Keep existing questions sync test
- Add catalog integrity test (published slugs ⊆ registry files)

**New tests:** `catalog-schema.test.ts`, `load-poster-module-by-slug.test.ts`

**npm scripts (unchanged names):**

- `test:grammar` — unit tests
- `validate:grammar` — tests + validation script

**Optional follow-up:** Add `validate:grammar` to `prebuild` (recommend **after** 1e lands, not in 1d alone).

---

### 3.7 File change checklist (1d)

| Action | Path |
|--------|------|
| Create | `content/grammar/catalog.json` |
| Create | `lib/grammar-builder/catalog-schema.ts` |
| Create | `lib/grammar-builder/load-catalog.ts` |
| Create | `lib/grammar-builder/poster-module-registry.ts` |
| Create | `lib/grammar-builder/load-poster-module-by-slug.ts` |
| Create | `lib/grammar-builder/catalog-schema.test.ts` |
| Create | `lib/grammar-builder/load-poster-module-by-slug.test.ts` |
| Create | `app/(student)/grammar/[slug]/page.tsx` |
| Create | `app/(student)/grammar/[slug]/error.tsx` |
| Edit | `app/(student)/grammar/pilot/page.tsx` (redirect) |
| Edit | `lib/grammar-builder/load-poster-module.ts` (delegate to slug loader) |
| Edit | `lib/grammar-builder/index.ts` (exports) |
| Edit | `scripts/validate-grammar-content.ts` |
| Edit | `components/grammar/pilot/GrammarPilotLayoutsPage.tsx` (back link) |
| Edit | `docs/grammar-module/SOURCE_OF_TRUTH_UI_GUIDE.md` §8A routes table |

---

### 3.8 Acceptance criteria (1d)

- [ ] `/grammar/there-is-there-are-questions-a1` renders identical poster to current `/grammar/pilot`
- [ ] `/grammar/pilot` redirects to canonical slug
- [ ] Unknown slug `/grammar/not-a-topic` returns 404
- [ ] `generateMetadata` sets title/description from catalog
- [ ] `npm run validate:grammar` passes with catalog checks
- [ ] Adding a catalog entry without registry import fails validation with clear message
- [ ] Layout lab back link targets canonical slug URL
- [ ] No regression in 42+ existing grammar tests

---

### 3.9 Risks & mitigations (1d)

| Risk | Mitigation |
|------|------------|
| Registry drift (catalog lists file not in import map) | Validation script fails CI; test covers it |
| Slug rename breaks bookmarks | Keep `/grammar/pilot` redirect indefinitely |
| `generateStaticParams` misses draft modules | Only `published` slugs pre-rendered; draft returns 404 |
| Duplicate error boundaries | Share one `grammar/error.tsx` if duplication is noisy |

---

## 4. Phase 1e — Second module (There is/are Affirmative A1)

### 4.1 Goals

1. Ship a **second published poster** proving multi-module catalog works.
2. Author an **A1 student variant** of the affirmative topic (not the full author JSON).
3. Keep mapper scope unchanged (`two-equal`, `banner` only).
4. Maintain content sync discipline (runtime + docs examples).

### 4.2 Non-goals

- Implement `three-column` or `full-width-split` mappers (Phase 2a).
- Ship the full author fixture (`there-is-there-are.json`) as student content.
- Grammar hub or home integration.

---

### 4.3 Content strategy

The existing author fixture (`there-is-there-are.json`) is **not student-ready:**

| Issue | Author fixture | A1 poster requirement |
|-------|----------------|----------------------|
| `displayMode` | missing (defaults poster) | must be explicit `poster` |
| `tags` | 3 footer hashtags | forbidden on student posters |
| Card 1–2 layout | `three-column`, 3 examples each | max 1 example per column |
| Card 1–2 kid fields | no `kidTitle`, no `glanceRule` | required |
| Card 3 layout | `full-width-split` | not mapped; use `banner` |

**Approach:** Create new A1 poster JSON inspired by reference JPG and Section 8E density rules, structurally parallel to the questions poster.

---

### 4.4 Proposed A1 affirmative content spec

**Slug:** `there-is-there-are-affirmative-a1`  
**File:** `content/grammar/there-is-there-are-affirmative-a1.json`  
**Author copy:** `docs/grammar-module/examples/there-is-there-are-affirmative-a1.json`  
**Reference:** `z8010050168940` (There is/are Affirmative)

#### Card 1 — theme `sky-blue`, `layoutType: two-equal`

| Field | Value |
|-------|-------|
| `kidTitle` | `There is…` |
| `kidSubtitle` | `One thing` |
| `glanceRule` | `There is = one thing.` (highlight: `one thing`) |
| Left column | SINGULAR ⭐ — "There is a book on the desk." 📘 |
| Right column | UNCOUNTABLE 💧 — "There is some milk." 🥛 |

#### Card 2 — theme `tangerine`, `layoutType: two-equal`

| Field | Value |
|-------|-------|
| `kidTitle` | `There are…` |
| `kidSubtitle` | `Many things` |
| `glanceRule` | `There are = many things.` (highlight: `many things`) |
| Left column | PLURAL 👧👦 — label-only ANY + caption `people` (30/70 inference) |
| Right column | EXAMPLES (hidden pill) — "There are two books on the desk." 📚 |

#### Card 3 — theme `lavender`, `layoutType: banner`

| Field | Value |
|-------|-------|
| `kidTitle` | `Remember!` |
| `glanceRule` | `There's = There is!` (highlight: `There's`) |
| `bannerText` | `There's = There is!` |
| `leftSide` | title Remember!, content `We say "There's" for "There is."`, example `There's a cat. 🐱` |

**Hero (from `moduleTitle`):**  
`moduleTitle`: `"THERE IS / THERE ARE — AFFIRMATIVE"`  
→ parsed hero: THERE IS / THERE ARE + suffix AFFIRMATIVE (uses existing `parseModuleTitleHero`).

---

### 4.5 Catalog entry (1e)

Add to `catalog.json`:

```json
{
  "slug": "there-is-there-are-affirmative-a1",
  "title": "There is / There are — Affirmative",
  "description": "Learn how to say what exists with There is and There are.",
  "difficulty": "A1",
  "file": "there-is-there-are-affirmative-a1.json",
  "status": "published",
  "thumbnailEmoji": "✅"
}
```

---

### 4.6 Implementation tasks (1e)

| # | Task | Owner |
|---|------|-------|
| 1 | Write A1 JSON per spec above | Content |
| 2 | Copy to `content/grammar/` and `docs/grammar-module/examples/` | Engineering |
| 3 | Register import in `poster-module-registry.ts` | Engineering |
| 4 | Add catalog entry | Engineering |
| 5 | Add mapper semantic tests (expected section shapes) | Engineering |
| 6 | Add content sync test for affirmative fixture pair | Engineering |
| 7 | Visual QA: 768×1024 tablet — cards 1–2 visible without scroll | Content/QA |
| 8 | Update `reference-index.md` example JSON link for affirmative row | Content |
| 9 | Update UI guide §8A with second live slug | Engineering tracking |

---

### 4.7 Acceptance criteria (1e)

- [ ] `/grammar/there-is-there-are-affirmative-a1` renders 3 cards with theme palettes
- [ ] Card 2 uses 30/70 layout (ANY label on left)
- [ ] Card 3 renders remember banner (no pattern stack)
- [ ] Hero shows THERE IS / THERE ARE — AFFIRMATIVE
- [ ] `npm run validate:grammar` passes (both modules + catalog)
- [ ] Runtime JSON byte-identical to docs example copy
- [ ] Questions poster unchanged at its slug
- [ ] 8D density: hero + cards 1–2 visible without scroll on 768×1024 (manual QA log entry)

---

### 4.8 Risks & mitigations (1e)

| Risk | Mitigation |
|------|------------|
| Affirmative card 3 too different from reference JPG | Accept for A1; full `full-width-split` deferred to Phase 2a |
| Content duplication vs questions poster | Distinct examples (affirmative statements vs questions) |
| Authors edit wrong file | Sync test + docs note on canonical paths |

---

## 5. Implementation order

```
1d.1  catalog.json + catalog-schema.ts
1d.2  load-catalog.ts + registry + load-poster-module-by-slug.ts
1d.3  /grammar/[slug] route + metadata + error boundary
1d.4  pilot redirect + validation script updates + tests
1d.5  QA: questions poster at new slug

1e.1  Author affirmative A1 JSON (content review)
1e.2  Register module + catalog entry + sync test
1e.3  Mapper tests + validate:grammar
1e.4  Visual QA both posters
```

**Gate:** 1d must merge and pass QA before 1e content is published to `status: published`. 1e can prepare JSON on a branch while 1d is in review.

---

## 6. Open questions for reviewers

Please mark each item **Approve**, **Reject**, or **Revise** before implementation begins.

| # | Question | Recommendation |
|---|----------|----------------|
| Q1 | **Slug for questions module:** `there-is-there-are-questions-a1` vs keep filename-based `there-is-there-are-poster-a1`? | Use `there-is-there-are-questions-a1` (readable, topic + level) |
| Q2 | **Rename JSON file** from `there-is-there-are-poster-a1.json` to match slug? | **No** in 1d — catalog `file` field decouples slug from filename |
| Q3 | **Pilot redirect:** 307 temporary vs 308 permanent? | 307 for first release; 308 after 2 weeks stable |
| Q4 | **Affirmative card 3:** simplified banner vs wait for `full-width-split` mapper? | Simplified banner for 1e (matches questions poster pattern) |
| Q5 | **Affirmative card 1 right column:** uncountable example vs second singular (`a/an`)? | Uncountable milk example (mirrors questions poster structure) |
| Q6 | **`prebuild: validate:grammar`** in package.json? | Defer until after 1e |
| Q7 | **Hub link** from `/home` in 1d/1e? | Out of scope — Phase 3a |

---

## 7. Success metrics

| Metric | Target after 1d+1e |
|--------|-------------------|
| Published grammar slugs | 2 |
| Mapper layout types used | 2 (`two-equal`, `banner`) — unchanged |
| `validate:grammar` runtime | < 5s |
| Student-visible regression | 0 (questions poster pixel-parity at new slug) |
| Catalog/registry drift incidents | 0 (caught by CI script) |

---

## 8. Review sign-off

| Reviewer | Role | Decision | Date | Notes |
|----------|------|----------|------|-------|
| | Product | ☐ Approve ☐ Revise ☐ Reject | | |
| | Content / ESL | ☐ Approve ☐ Revise ☐ Reject | | |
| | Engineering | ☐ Approve ☐ Revise ☐ Reject | | |

**Approved to implement when:** All three reviewers Approve (or Revise with documented answers to §6).

---

## 9. References

- [`SOURCE_OF_TRUTH_UI_GUIDE.md`](./SOURCE_OF_TRUTH_UI_GUIDE.md)
- [`SCHEMA.md`](./SCHEMA.md)
- [`reference-index.md`](./reference-index.md)
- Existing implementation: `lib/grammar-builder/`, `content/grammar/`

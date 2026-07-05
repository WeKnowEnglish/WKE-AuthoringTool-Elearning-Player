# Grammar Module — Source of Truth UI Guide

Use this specification to build interactive, data-driven grammar displays for elementary-aged ESL students (A1–A2). The UI must replicate the clean, bold, cartoon-infographic aesthetic of the reference JPGs in `Project Plans/Grammar Module AI Example References/`.

**Audience modes:** Student-facing pages use `displayMode: "poster"` — one topic, max 3 cards, kid typography, no dev chrome. Author/QA layout demos use `displayMode: "showcase"` (see [Section 8](#8-kid-content-limits)). All student poster rules in [Section 1D](#1d-kid-readability-minimums) and [Section 8](#8-kid-content-limits) are mandatory for A1 content.

**Related files:**

- Machine-readable schema: [`grammar-module.schema.json`](grammar-module.schema.json)
- Theme tokens: [`theme-tokens.json`](theme-tokens.json)
- Example fixture: [`examples/there-is-there-are.json`](examples/there-is-there-are.json)
- Reference catalog: [`reference-index.md`](reference-index.md)
- AI prompts: [`AI_PROMPT_RECIPES.md`](AI_PROMPT_RECIPES.md)

---

## 1. Visual and Aesthetic Architecture

### A. Typography Hierarchy

| Level | Style |
|-------|--------|
| **Main header** | Thick, ultra-bold, uppercase sans-serif (Arial Black, Impact, or heavy Montserrat). Module title spans full width. |
| **Card headings** | Strict uppercase, bold tracking, white text on theme accent header bar. |
| **Sub-headers / pills** | Uppercase label inside rounded capsule; optional emoji badge. |
| **Body text** | Clean sans-serif, generous line height for A1–A2 readability. |
| **Key grammar elements** | Color-coded or bold inside sentences; suffixes and auxiliaries may use colored circles/capsules. |

### B. Containers and Component Geometry

**Comic-book stroke:** Every card container uses a distinct solid border (`border-2` or `border-[3px] border-black/80`) combined with the theme border color from [`theme-tokens.json`](theme-tokens.json). Corners are softly rounded (`rounded-2xl` or `rounded-[24px]`).

**Number badge:** A circular badge (`rounded-full`, bold integer) anchored absolutely to the top-left corner of the card (`absolute -top-3.5 -left-3.5 z-10`). Background uses `accentBadge` from the card theme. The badge overlaps the card border — it is never inline inside the header bar.

**Card header bar:** Saturated theme color (`accentBadge`), full width, rounded top corners. Title text is white and uppercase.

**Card body:** Pastel theme background. Internal padding is generous (`p-4` minimum).

**Sub-grid dividers:** Internal divisions use dashed or dotted lines (`border-dashed border-black/20`), never heavy solid dark lines.

**Offset shadow (optional):** Subtle block shadow acceptable (`shadow-[4px_4px_0_0_rgba(0,0,0,0.15)]`) for poster effect; do not use blurred drop shadows.

### C. Color Psychology Matrix

Cards use high-contrast cheerful pastels with deep matching text. **Always reference theme keys** — never invent one-off hex values in components.

| Theme key | Background | Border | Main text | Accent badge |
|-----------|------------|--------|-----------|--------------|
| `sky-blue` | `#dbeafe` | `#60a5fa` | `#1e3a8a` | `#2563eb` |
| `tangerine` | `#ffedd5` | `#fb923c` | `#7c2d12` | `#ea580c` |
| `mint-green` | `#dcfce7` | `#4ade80` | `#14532d` | `#16a34a` |
| `sun-gold` | `#fef9c3` | `#facc15` | `#713f12` | `#ca8a04` |
| `lavender` | `#f3e8ff` | `#c084fc` | `#581c87` | `#9333ea` |
| `bubblegum` | `#ffe4e6` | `#fb7185` | `#881337` | `#e11d48` |

### D. Kid Readability Minimums

These floors apply to **`displayMode: poster`** (student routes). Author showcase routes may use smaller text only on `/grammar/pilot/layouts`.

| UI element | Tailwind minimum | px equivalent | Rule |
|------------|------------------|---------------|------|
| Module hero title | `text-3xl md:text-4xl` | 30–36px | Max 2 highlighted keywords |
| Card header title | `text-sm md:text-base` | 14–16px | **≤ 6 words** kid-facing (see Section 8B) |
| Glance rule | `text-xl md:text-2xl font-extrabold` | 20–24px | One sentence; top of card body |
| Example sentence | `text-lg md:text-xl` | 18–20px | **Floor: `text-base` (16px) on all breakpoints** |
| Category pill label | `text-base font-bold` | 16px | Uppercase OK if short (1–2 words) |
| Pill description | `text-base` | 16px | Optional; omit on A1 if long |
| Illustration container | `h-20 w-20` minimum | 80px | Primary visual; larger than text block |
| Emoji inside illustration | `text-4xl` minimum | 36px | |
| Caption under illustration | `text-sm` | 14px | Optional; skip if it repeats the sentence |
| Pattern / formula row | `text-base font-bold` | 16px | Max 1 line desktop; A1 max 1 pattern per card |
| Note / remember banner | `text-base md:text-lg` | 16–18px | |
| Footer hashtags | — | — | **Student poster: omit entirely** |

**Never on student poster routes:**

- `text-xs`, `text-[10px]`, `text-[11px]`, or any size below `text-base` for teaching content
- A `compact` rendering mode that shrinks typography or illustrations
- Illustrations smaller than 64×64px to fit more text

Grammar module typography should match the scale of kid UI primitives in `components/kid-ui/` — big, bold, and readable at arm's length on a tablet.

---

## 2. Flexible Layout Engine

The renderer is agnostic to row/column configuration. Layout is declared in JSON via `pageLayout` (page grid) and per-card `layoutType` (internal structure).

### Page-level `pageLayout`

| Value | Behavior |
|-------|----------|
| `single-column` | All cards stacked vertically, full width. |
| `two-equal` | Two cards side by side (`grid-cols-2`). |
| `two-equal-then-full` | Row 1: two equal cards; Row 2: one full-width card. Reference: There is/There are affirmative. |
| `two-by-two-then-full` | Row 1: 2×2 card grid; Row 2: full-width summary. Reference: Some and Any. |
| `four-card-grid-then-split` | Row 1: four mini cards; Row 2: two wide comparison cards. Reference: Plural nouns. |
| `custom` | Explicit row definitions (future editor feature). |

### Card-level `layoutType`

| Value | Behavior |
|-------|----------|
| `full-width` | Card spans its grid cell; content stacked vertically. |
| `two-equal` | Two equal internal columns with dashed divider. |
| `three-column` | Three example columns inside one card (sentence + graphic + caption). |
| `full-width-split` | One card, two internal columns (notes/contractions pattern). |
| `four-card-grid` | Four mini rule cards in one row (each may be a nested card). |
| `comparison` | Rule vs exceptions, dashed vertical center divider. |
| `banner` | Full-width highlight strip, compact padding. |
| `two-column-positive-negative` | Left: positive answers; Right: negative answers. Reference: Short answers. |
| `summary-grid` | Multi-column summary table with checkmarks/icons. |

### Responsive rules

- Desktop (md+): honor page grid columns; maximize horizontal coverage so more content is visible at once.
- Mobile: stack page-level columns; preserve internal dashed dividers where readable.
- Never render grammar infographics as static exported images.

---

## 3. Block Vocabulary

Map reference infographic patterns to these block kinds:

| Block kind | Purpose | Typical fields |
|------------|---------|----------------|
| `glanceRule` | One-sentence takeaway at top of card body | `text` (≤ 8 words A1), optional `highlight` |
| `moduleHero` | Page title with color-highlighted keywords | `moduleTitle`, highlight spans |
| `subHeaderPill` | Category label (SINGULAR, PLURAL, COUNTABLE) | `label`, `badge`, `desc`, `extra` |
| `exampleItem` | Sentence + illustration + caption | `text`, `graphic`, `caption`, `highlight` |
| `formulaRow` | Pattern line with emoji anchor | `label`, `formula`, `graphic` |
| `transformationRow` | Noun + suffix = result | `from`, `operator`, `suffix`, `to`, `graphic` |
| `goodBadPair` | Correct vs incorrect side by side | `good`, `bad` |
| `positiveNegativeSplit` | Yes/No short answer columns | `positiveSide`, `negativeSide` |
| `notePanel` | Lightbulb tip box | `title`, `content`, `example` |
| `warningPanel` | Caution callout | `warning`, `formula` |
| `summaryGrid` | Checkmark / X matrix | rows, columns, cells |
| `bannerStrip` | Full-width highlight | `bannerText` |
| `footerTags` | Hashtag row | `tags[]` |

---

## 4. Do and Don't (Non-Negotiable Rules)

### Do

- Use theme keys from `theme-tokens.json` for all card colors.
- Place number badges absolutely at top-left, overlapping the card corner.
- Use uppercase for card headings and category pills.
- Use dashed internal dividers.
- Render all content from JSON; keep components layout-agnostic.
- Validate AI-generated JSON against `grammar-module.schema.json`.
- Student posters: max **3 content cards** per page (A1).
- Student posters: max **1 example per column** for A1 (2 for A2).
- Put **illustration before or beside** the sentence (illustration-first row), not a tiny trailing icon.
- Include a `glanceRule` on every student poster card.

### Don't

- Do not use global `kid-ink` borders on grammar cards (use theme border hex).
- Do not embed number badges inside the header bar text row.
- Do not use solid dark lines between internal columns.
- Do not hardcode page layouts in JSX — read `pageLayout` and `layoutType`.
- Do not export infographics as static PNG/JPG for student view.
- Do not invent theme colors outside the six defined keys.
- Do not render layout showcase or dev demos on student routes.
- Do not wrap the whole poster in an extra outer card (double chrome).
- Do not use teacher jargon in kid-facing card titles (`QUESTION:`, parentheticals, IPA on A1).
- Do not show footer hashtags on student posters.

---

## 5. Worked Example: There Is / There Are

**Fixture:** [`examples/there-is-there-are.json`](examples/there-is-there-are.json)

**Page structure (`pageLayout: two-equal-then-full`):**

```
[ Module hero: UNDERSTANDING 'THERE IS' / 'THERE ARE' ]

[ Card 1: sky-blue, three-column ]  [ Card 2: tangerine, three-column ]
        (50% width)                           (50% width)

[ Card 3: lavender, full-width-split — spans full row ]
```

**Card 1 internal layout (`three-column`):**

- Sub-header pill: SINGULAR + star badge + description + contraction note
- Three columns, each: sentence | illustration | caption
- Dashed vertical dividers between columns

**Card 3 internal layout (`full-width-split`):**

- Left: CONTRACTIONS panel with examples
- Right: formula + warning about There're
- Dashed vertical center divider

A simplified **A1 student poster** variant of this module is specified in [Section 8E](#8e-pilot-content-target-there-is--there-are-questions). The full fixture at [`examples/there-is-there-are.json`](examples/there-is-there-are.json) remains the author/reference version (more examples per card). The kid poster fixture is at [`examples/there-is-there-are-poster-a1.json`](examples/there-is-there-are-poster-a1.json). The student pilot route loads the runtime copy from [`content/grammar/there-is-there-are-poster-a1.json`](../../content/grammar/there-is-there-are-poster-a1.json).

---

## 6. Pilot vs Spec Gap (Future Refactor)

The current pilot at `/grammar/pilot` implements Steps 2–5 (poster/showcase split, kid typography, A1 content, tablet density polish). Remaining gaps for Phase 1 JSON renderer:

| Rule | Spec | Current pilot |
|------|------|---------------|
| Card border | `border-2 border-black/80` + theme border | `border-4 border-kid-ink` |
| Number badge | Absolute top-left overlap | Inline in header bar |
| Theme names | `sky-blue`, `tangerine`, … | `blue`, `orange`, `purple` |
| Page layout | Declarative `pageLayout` + `layoutType` | ✅ `pageLayout` drives last-card span (`two-equal-then-full`) |
| Example row | text + graphic + caption (3-col) | sentence + emoji only |
| Header bar | Theme `accentBadge` + white text | Custom per-section hex |
| Student typography floor | `text-base` minimum | ✅ Poster scale (Step 3) |
| Layout showcase | Dev route only (`displayMode: showcase`) | ✅ `/grammar/pilot/layouts` (Step 2) |
| Glance rule | Required per card | ✅ Wired (Step 4) |
| Kid titles | `kidTitle` / `kidSubtitle` | ✅ Wired (Step 4) |
| Card 3 A1 density | Single remember banner | ✅ Banner layout (Step 4) |
| Outer wrapper card | None on poster | ✅ Removed (Step 2) |
| Data-driven content | JSON renderer | ✅ `content/grammar/` + slug loader |
| `two-column-positive-negative` mapper | Yes/No short answer columns | ✅ Phase 2b |
| `comparison` mapper | Rule vs exceptions split | ✅ Phase 2b |
| `summary-grid` mapper | Checkmark matrix | ✅ Phase 2c |
| `two-by-two-then-full` page spans | 2×2 + full summary row | ✅ Phase 2c |
| `four-card-grid-then-split` page spans | 2×2 + bottom comparison row | ✅ Phase 2c |
| `four-card-grid` mapper | 2×2 nested minis inside one card | ✅ Phase 2d |
| `full-width` mapper | Vertical item stack + subHeader | ✅ Phase 2d |
| `transformationRow` block | Noun + suffix rows with IPA | ✅ Phase 2d |
| `goodBadPair` block | Correct vs struck-through bad Q/A | ✅ Phase 2d |
| **Phase 2 layout engine** | **9/9 `layoutType` values mapped** | ✅ **Complete** |
| Author link on student poster | Hidden in production | ✅ Dev-only (Step 5) |
| Layout lab route | Dev-only | ✅ `notFound()` in production |
| Content/runtime sync | Single source | ✅ `content/grammar/` + sync test vs `docs/examples/` |
| Parse strictness | Reject unknown JSON fields | ✅ Zod `.strict()` on module + card schemas |
| Max cards (student A1) | 3 | 3 on poster; showcase demos on layouts route |

---

## 8. Kid Content Limits

### 8A. Audience modes

| Mode | Route (planned) | JSON `displayMode` | Purpose |
|------|-----------------|--------------------|---------|
| Poster | `/grammar/[slug]`, legacy `/grammar/pilot` → questions slug | `poster` | Child reads one grammar topic |
| Showcase | `/grammar/pilot/layouts` | `showcase` | Author/QA views layout enum demos |

### 8B. Card title rewrite rules

Use `kidTitle` and `kidSubtitle` in JSON for student posters. Keep `title` for author/reference if needed.

| Bad (teacher) | Good (kid A1) |
|---------------|---------------|
| `QUESTION: 'IS THERE ... ?' (Singular / Uncountable)` | `kidTitle`: `Is there…?` — `kidSubtitle`: `One thing` |
| `QUESTION: 'ARE THERE ... ?' (Plural)` | `kidTitle`: `Are there…?` — `kidSubtitle`: `Many things` |
| `QUESTION PATTERNS & SUMMARY` | `kidTitle`: `Remember!` |

Rules:

- Kid-facing header text: **≤ 6 words** in the header bar.
- Long grammar labels belong in `subHeader.desc` or future `teacherNotes`, not the header.
- The number badge shows the card order; do not repeat the number redundantly in the title.

### 8C. Per-level caps

| Level | Max cards | Max examples per column | Max patterns per card | Glance rule |
|-------|-----------|-------------------------|----------------------|-------------|
| A1 | 3 | 1 | 1 | Required |
| A2 | 4 | 2 | 2 | Required |
| B1 | 5 | 3 | 3 | Optional |

When `displayMode: poster` and `difficulty: A1`, the schema enforces a maximum of 3 cards.

### 8D. Poster density target

Layout QA acceptance check:

> On a **768×1024 tablet**, the hero plus card 1 and card 2 are visible **without scrolling**.

#### Pilot QA log

| Date | Viewport | 8D pass? | Notes |
|------|----------|----------|-------|
| 2026-07-05 | 768×1024 | likely pass (verify on device) | Step 5: compact shell, hero inline + no decoration, poster padding tightened, `sm:grid-cols-2`, card 3 title deduped, author link dev-only. **Step 5b:** `items-start` page grid, content-sized poster cards (no `h-full`/`flex-1`), compact banner note box |

### 8E. Pilot content target (There is / There are Questions)

Content spec for the A1 student poster refactor (reference: `z8010050130190`):

**Card 1** — theme `sky-blue`, internal two-column split

- `glanceRule`: `Is there = one thing?`
- Columns: SINGULAR (one example) | UNCOUNTABLE (one example)

**Card 2** — theme `tangerine`, internal 30/70 split

- `glanceRule`: `Are there = many things?`
- Left: PLURAL pill + ANY visual | Right: 1–2 examples maximum

**Card 3** — theme `lavender`, simplified banner or short split

- `glanceRule`: `Put Is or Are first!`
- Drop the 3-pattern stack for A1; use a single remember banner only

---

## 7. How to Prompt Cursor

1. Attach a reference JPG from `Project Plans/Grammar Module AI Example References/`.
2. Attach or @-mention this guide and `grammar-module.schema.json`.
3. Use a recipe from [`AI_PROMPT_RECIPES.md`](AI_PROMPT_RECIPES.md).

Example instruction:

> Using our Source of Truth UI Guide, parse the structural layout of the attached reference image. Output JSON that validates against `grammar-module.schema.json`. Keep theme keys, layoutType values, and badge geometry rules intact. Do not simplify to a single-column stack unless the reference uses that layout.

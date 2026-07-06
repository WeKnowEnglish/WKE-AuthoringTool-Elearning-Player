# Grammar Module JSON Schema — Field Reference

Machine-readable schema: [`grammar-module.schema.json`](grammar-module.schema.json)

Validated example (author/reference): [`examples/there-is-there-are.json`](examples/there-is-there-are.json)

A1 student poster (questions): [`examples/there-is-there-are-poster-a1.json`](examples/there-is-there-are-poster-a1.json)

Kid poster rules: [`SOURCE_OF_TRUTH_UI_GUIDE.md`](SOURCE_OF_TRUTH_UI_GUIDE.md) Sections 1D and 8.

---

## Root object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `moduleTitle` | string | yes | Main header (uppercase recommended). |
| `moduleSubtitle` | string | no | Secondary line under title. |
| `displayMode` | `poster` \| `showcase` | no | Default `poster`. Student vs author layout lab. |
| `pageLayout` | enum | yes | Page-level grid arrangement. |
| `cards` | array | yes | Ordered list of card objects. |
| `tags` | string[] | no | Footer hashtags. **Omit on student posters.** |
| `difficulty` | A1 \| A2 \| B1 | no | CEFR level; enables A1 poster card cap when set. |

### `displayMode`

| Value | Use |
|-------|-----|
| `poster` | Student-facing grammar infographic. Max 3 cards when `difficulty: A1`. Kid typography rules apply. No layout showcase. |
| `showcase` | Author/QA layout demonstrations only (`/grammar/pilot/layouts`). |

### A1 poster validation

When both `displayMode: poster` and `difficulty: A1` are set, the schema enforces **at most 3 cards**.

Additional guidance (not schema-enforced):

- Max **1 example per column** on A1 posters
- Max **1 pattern** per card on A1
- **`glanceRule` required** on every card (see card fields)
- **No `tags`** on student posters

### `pageLayout` values

- `single-column` — vertical stack
- `two-equal` — two cards per row
- `two-equal-then-full` — two cards, then one full-width card
- `two-by-two-then-full` — four cards in 2×2, then summary row
- `four-card-grid-then-split` — four mini cards, then comparison row
- `custom` — reserved for editor-defined rows

---

## Card object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | yes | Display order; matches number badge. |
| `title` | string | yes | Author/reference header (may include grammar jargon). |
| `kidTitle` | string | no | Short student header (≤ 6 words). Renderer prefers over `title`. |
| `kidSubtitle` | string | no | e.g. `One thing`, `Many things`. |
| `theme` | themeId | yes | One of six keys in `theme-tokens.json`. |
| `layoutType` | enum | yes | Internal layout of card body. |
| `glanceRule` | object | recommended | One-sentence takeaway at top of card body (required for A1 posters). |
| `subHeader` | object | no | Category pill above content. |
| `items` | array | conditional | Example rows (`three-column`, etc.). |
| `leftSide` / `rightSide` | object | conditional | Split panels (`full-width-split`). |
| `leftColumn` / `rightColumn` | object | conditional | Comparison sides. |
| `positiveSide` / `negativeSide` | object | conditional | Short answer layout. |
| `patterns` | array | no | Formula/pattern rows. Max 1 on A1 posters. |
| `bannerText` | string | conditional | Required when `layoutType` is `banner`. |
| `summaryGrid` | object | conditional | Required when `layoutType` is `summary-grid`. Checkmark/text matrix. |
| `miniCards` | array | conditional | Required when `layoutType` is `four-card-grid`. Exactly **4** nested rule minis. |
| `goodBadPair` | object | no | Correct vs struck-through incorrect Q/A (typically on `two-equal` cards). |

### `glanceRule`

| Field | Description |
|-------|-------------|
| `text` | One short sentence (≤ 8 words for A1), e.g. `Is there = one thing?` |
| `highlight` | Optional substring to emphasize in the renderer |

Renders at the top of the card body, above `subHeader` and examples. Uses `text-xl md:text-2xl` minimum per UI guide.

### `kidTitle` / `kidSubtitle`

Use on student posters instead of long teacher `title` strings.

| Field | Example |
|-------|---------|
| `kidTitle` | `Is there…?` |
| `kidSubtitle` | `One thing` |

### `subHeader`

| Field | Description |
|-------|-------------|
| `label` | Uppercase category (SINGULAR, PLURAL, …). |
| `badge` | Emoji or icon token. |
| `desc` | Short rule explanation. |
| `extra` | Secondary note (e.g. contraction). |

### `item` (example row)

| Field | Description |
|-------|-------------|
| `text` | Full example sentence. |
| `graphic` | Emoji or image URL. |
| `caption` | Prepositional phrase or label under illustration. |
| `highlight` | Substring to emphasize (e.g. "There is"). |
| `transformationRow` | Noun + suffix → result row (optional instead of `text`). See below. |

### `transformationRow` (on `item`)

| Field | Description |
|-------|-------------|
| `from` | Base noun (e.g. `cat`). |
| `operator` | Symbol between parts (e.g. `+`). |
| `suffix` | Ending added (e.g. `s`). |
| `to` | Plural result (e.g. `cats`). |
| `graphic` | Optional emoji anchor. |
| `ipa` | Optional pronunciation hint (e.g. `/s/`). |

When `transformationRow` is present, `text` may be omitted on the same `item`.

### `miniCard` (`miniCards[]` on `four-card-grid`)

| Field | Description |
|-------|-------------|
| `title` | Mini card heading (e.g. `Regular -s`). |
| `rule` | Short rule or example list. |
| `formula` | Optional pattern line (e.g. `+ s`). |
| `badge` | Optional emoji. |
| `theme` | Optional per-mini theme override. |

**Note:** `layoutType: four-card-grid` nests 4 minis **inside one page card**. This differs from `pageLayout: four-card-grid-then-split`, which places 4 separate page-level cards in a 2×2 grid (each often using `layoutType: full-width`).

### `goodBadPair`

| Field | Description |
|-------|-------------|
| `good` | Correct Q/A side (`text`, optional `graphic`, `highlight`). |
| `bad` | Incorrect side (renderer strikes through). |

### `comparisonSide` (`leftColumn` / `rightColumn`)

| Field | Description |
|-------|-------------|
| `title` | Uppercase column label (SINGULAR, PLURAL, …). |
| `badge` | Optional emoji for the category pill above the column. |
| `items` | Example rows in the column. |

Illustration-first layout: graphic ≥ 80×80px on student posters.

### `sidePanel`

| Field | Description |
|-------|-------------|
| `title` | Panel heading. |
| `content` | Body text. |
| `example` | Inline example line. |
| `formula` | Transformation formula. |
| `warning` | Caution callout. |

---

## Theme IDs

Must match [`theme-tokens.json`](theme-tokens.json):

`sky-blue` | `tangerine` | `mint-green` | `sun-gold` | `lavender` | `bubblegum`

---

## Validation

When generating or editing JSON:

1. Parse against `grammar-module.schema.json`.
2. Cross-check every `theme` value exists in `theme-tokens.json`.
3. Ensure `pageLayout` matches the reference image grid (see [`reference-index.md`](reference-index.md)).
4. For student posters: set `displayMode: poster`, include `glanceRule` and `kidTitle` on each card, omit `tags`.
5. Cross-check typography and content caps in [`SOURCE_OF_TRUTH_UI_GUIDE.md`](SOURCE_OF_TRUTH_UI_GUIDE.md) Section 1D and 8.

### Promoting author JSON to a live poster

1. Copy or derive a student variant from `docs/grammar-module/examples/`.
2. Set `displayMode: "poster"`, appropriate `difficulty`, remove `tags`.
3. Ensure every card has `kidTitle` and `glanceRule.text`.
4. Write the file to `content/grammar/<file>.json` and mirror the same bytes under `docs/grammar-module/examples/` for sync tests.
5. Add a catalog entry in `content/grammar/catalog.json` (`status: "draft"` until QA, then `"published"`).
6. Register the JSON import in `lib/grammar-builder/poster-module-registry.ts`.
7. Run `npm run validate:grammar`.

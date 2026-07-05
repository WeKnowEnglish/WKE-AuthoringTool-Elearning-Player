# Grammar Module — AI Prompt Recipes

Copy-paste these prompts into Cursor when generating or reviewing grammar module content.

**Always attach or @-mention:**

- [`SOURCE_OF_TRUTH_UI_GUIDE.md`](SOURCE_OF_TRUTH_UI_GUIDE.md)
- [`grammar-module.schema.json`](grammar-module.schema.json)
- [`theme-tokens.json`](theme-tokens.json)
- A reference JPG from `Project Plans/Grammar Module AI Example References/` (see [`reference-index.md`](reference-index.md))

---

## Recipe 1: Reference Image to JSON

```
Using our Grammar Module Source of Truth UI Guide and grammar-module.schema.json:

1. Parse the structural layout of the attached reference image.
2. Identify pageLayout (how cards sit on the page grid) and each card's layoutType.
3. Map colors to theme keys from theme-tokens.json (sky-blue, tangerine, mint-green, sun-gold, lavender, bubblegum).
4. Output a single JSON object that validates against grammar-module.schema.json.
5. Include moduleTitle, pageLayout, cards[] with id, title, theme, layoutType, and all content fields.
6. Do NOT simplify to a single vertical column unless the reference uses that layout.
7. Do NOT use hex colors in JSON — only theme keys.
8. Place number badge geometry rules in comments outside JSON if needed, but keep JSON pure.

When generating for a **student poster** (A1):
- Set `displayMode: "poster"` and `difficulty: "A1"`
- Include `glanceRule` on every card (one short sentence, ≤ 8 words)
- Use `kidTitle` and optional `kidSubtitle` instead of long teacher jargon in `title`
- Max 3 cards, max 1 example per column, max 1 pattern per card
- Omit `tags` (no footer hashtags)
- Follow kid typography minimums in SOURCE_OF_TRUTH section 1D

Output only the JSON, wrapped in a fenced code block.
```

**Attachments:** reference JPG + SOURCE_OF_TRUTH_UI_GUIDE.md + grammar-module.schema.json

---

## Recipe 2: JSON Compliance Review

```
Review the attached grammar module JSON against our specification:

1. Validate structure against grammar-module.schema.json (list any schema violations).
2. Check every theme value exists in theme-tokens.json.
3. Check pageLayout matches the described reference image grid (attach image if available).
4. Check layoutType per card matches visible internal structure (three-column, full-width-split, comparison, etc.).
5. List violations of SOURCE_OF_TRUTH_UI_GUIDE.md Do/Don't rules (badge placement, borders, dashed dividers, kid typography section 1D, content limits section 8).
6. Suggest minimal JSON edits to fix each issue.

Format: numbered list of findings, then corrected JSON if changes are needed.
```

**Attachments:** JSON file + SOURCE_OF_TRUTH_UI_GUIDE.md + theme-tokens.json + (optional) reference JPG

---

## Recipe 3: New Topic from Template

```
Clone the structure of examples/there-is-there-are.json for a new grammar topic: [TOPIC NAME].

Rules:
- Keep identical pageLayout (two-equal-then-full) and card layoutType values unless I specify otherwise.
- Swap moduleTitle, subHeader labels, items text/graphics/captions, and leftSide/rightSide content only.
- Use themes: card 1 = sky-blue, card 2 = tangerine, card 3 = lavender (unless topic suggests otherwise).
- Output must validate against grammar-module.schema.json.
- Maintain A1–A2 language level: short sentences, clear examples, child-friendly graphics (emoji OK).

Output only the JSON.
```

**Attachments:** examples/there-is-there-are.json + grammar-module.schema.json

---

## Recipe 4: React Component Audit (Pre-Implementation)

```
Before implementing or refactoring grammar components, audit against SOURCE_OF_TRUTH_UI_GUIDE.md:

1. List each component file and whether it reads layout from JSON or hardcodes grids.
2. Check card borders use theme border tokens, not kid-ink.
3. Check number badges use absolute -top-3.5 -left-3.5 positioning.
4. Check internal dividers use border-dashed border-black/20.
5. Propose a file map: which components implement each layoutType.

Do not write code yet — audit only.
```

**Attachments:** SOURCE_OF_TRUTH_UI_GUIDE.md + relevant component paths

---

## Recipe 5: Batch Index a New Reference Image

```
Add a row to reference-index.md for the attached JPG:

- Topic title
- pageLayout enum value
- themes used
- layoutType per card
- notable block types
- whether it matches an existing canonical file or is new

Follow the table format in reference-index.md. Output the markdown row only.
```

**Attachments:** reference JPG + reference-index.md

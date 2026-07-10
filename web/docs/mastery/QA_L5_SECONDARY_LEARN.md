# QA: Secondary Learn Lane — L0–L4 signoff

**Track:** Word Helper drawer · in-drawer practice · hub alignment · L5 polish  
**Depends on:** L0–L4 implemented · hardening double-submit fix  
**Reference:** [SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md](./SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md) §6.1

---

## Automated (local)

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Full secondary test suite | `npx vitest run lib/secondary/` | ☐ |
| A2 | Learn content | `npx vitest run lib/secondary/secondary-learn-content.test.ts` | ☐ |
| A3 | Learn practice compiler | `npx vitest run lib/secondary/secondary-learn-practice.test.ts` | ☐ |
| A4 | Learn display labels | `npx vitest run lib/secondary/secondary-learn-display.test.ts` | ☐ |
| A5 | Learn attempt bridge | `npx vitest run lib/secondary/secondary-mastery-bridge.test.ts` | ☐ |
| A6 | Learn API guard | `secondary-mastery-bridge.test.ts` — `recordSecondaryWordAttempt({ activityType: "learn" })` throws | ☐ |

---

## L0 + L4 — Shell & navigation

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| M1 | Open `/secondary` with today's words | Shell header: "Vocabulary Practice"; mobile word row visible (`<lg`) | ☐ |
| M2 | Resize to `lg+` | Sidebar replaces row; Warm-up + Focus sections | ☐ |
| M3 | Navigate to `/secondary/match` | Shell header shows "· Match"; word list persists | ☐ |
| M4 | Open `/secondary/login` | No shell header, no word list, no drawer | ☐ |
| M5 | Click word chip | Drawer opens; chip `aria-pressed=true` | ☐ |
| M6 | Click same chip again | Drawer closes; focus returns to chip | ☐ |
| M7 | Open drawer → backdrop tap | Drawer closes | ☐ |
| M8 | Open drawer → Close button | Drawer closes; focus restored | ☐ |

---

## L1 — Drawer content

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| M9 | Open tier-A word (example + cloze frame) | Header: word, POS, topic, progress badge + dots | ☐ |
| M10 | Meaning card | English meaning visible; "Show Vietnamese" toggles VN | ☐ |
| M11 | Examples | Example sentence with highlight; common chunks if present | ☐ |
| M12 | Cloze preview | Blank in sentence for tier A/B only | ☐ |
| M13 | Open tier-C word | Cloze preview card absent or empty | ☐ |
| M14 | Memory tip | Visible when `spellingSupport` present; hidden otherwise | ☐ |
| M15 | Switch word while drawer open | Scroll resets to top; practice panel remounts | ☐ |

---

## L2 — In-drawer practice

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| M16 | Scroll to practice section | "Practice this word" with Q1 of 3 | ☐ |
| M17 | Answer correctly | Green feedback; auto-advance ~900ms; buttons disabled during feedback | ☐ |
| M18 | Answer wrong twice, then correct | Amber "Not yet"; eventual success | ☐ |
| M19 | Exhaust 3 wrong attempts | Revealed answer; auto-advance ~1400ms | ☐ |
| M20 | Finish all 3 questions | Summary + "Practice again" + "Back to quiz" | ☐ |
| M21 | Practice again | New question set (`runSeed` bump) | ☐ |
| M22 | Keys 1 / 2 / 3 | Select choices while drawer focused | ☐ |
| M23 | Complete practice | DevTools: `word:{id}` mastery record updated | ☐ |
| M24 | After learn practice | Match / Cloze / Spelling completion chips **unchanged** | ☐ |

**Mastery check (DevTools):**

```js
JSON.parse(localStorage.getItem("wke-student-mastery-v1:" + /* student scope */))
  ?.records?.["word:YOUR_WORD_ID"]
```

With `?masterySyncDebug=1`: queue flush after practice completes.

---

## L3 + L5 — Accessibility

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| M25 | Tab with drawer open | Focus cycles inside drawer only | ☐ |
| M26 | Shift+Tab at first focusable | Wraps to last focusable in drawer | ☐ |
| M27 | Escape | Closes drawer | ☐ |
| M28 | `prefers-reduced-motion: reduce` | No slide animation (instant or opacity only) | ☐ |
| M29 | Drawer open | Main activity content not focusable (`inert` on `<main>`) | ☐ |
| M30 | Drawer open | Word list chips not focusable (`inert` on row / sidebar) | ☐ |
| M31 | Screen reader (spot check) | "Word helper open: {word}"; dialog labelled | ☐ |

---

## Regression — Daily activities & sync

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| M32 | Learn practice on word X, then Match | Match still shows pending for X if not done in Match | ☐ |
| M33 | Complete Match for X | Home completion updates; sidebar dots refresh | ☐ |
| M34 | Device A: learn practice (auth) → Device B login | Mastery visible after sync (if P1 sync enabled) | ☐ |

---

## Known UX (not blocking)

| Item | Notes |
| --- | --- |
| Duplicate headers | Shell header + activity `h2` both visible on Match/Cloze/Spelling |
| Sparse memory tips | `spellingSupport` on ~100/240 words — memory card often empty |
| No drawer component tests | Manual QA + lib unit tests only |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Drawer breaks navigation; learn writes daily activity local state; duplicate mastery on input spam; focus lost after close; word list reachable via keyboard while drawer open.

**Pre-release reminder:** Run M23–M24 and M32–M34 on staging with real auth accounts before student-facing deploy.

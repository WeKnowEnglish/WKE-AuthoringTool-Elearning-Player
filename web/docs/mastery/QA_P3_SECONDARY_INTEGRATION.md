# QA: Secondary integration — Phases 1–4

**Track:** 240-word bank wire · live session · S2 selection · dynamic cloze · Phase 4 hardening  
**Spec:** [SECONDARY_SESSION_SELECTION.md](./SECONDARY_SESSION_SELECTION.md)  
**Learn lane:** [QA_L5_SECONDARY_LEARN.md](./QA_L5_SECONDARY_LEARN.md)

---

## Automated (local)

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Full secondary test suite | `npx vitest run lib/secondary/` | ☐ |
| A2 | Mastery sync unit tests | `npx vitest run lib/mastery/supabase-sync.test.ts` | ☐ |
| A3 | Activity completion → sync hook | `secondary-today-session-completion.test.ts` | ☐ |
| A4 | Full-pack selection (240 words) | `secondary-session-selection-full-pack.test.ts` | ☐ |
| A5 | Cloze tier coverage (6A) | `secondary-cloze-coverage.test.ts` | ☐ |

---

## Phase 1 — 240-word bank

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | Fresh `/secondary` | Today's list has words from full bank (not 10-word MVP only) | ☐ |
| 2 | Dev console: `getAllSecondaryWordItemIds().length` | `240` | ☐ |
| 3 | Match activity | Definitions resolve for selected words | ☐ |

---

## Phase 2 — Live session + slow-replace

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 4 | Master 3+ words on today's focus list | Oldest mastered word evicted; new word appears | ☐ |
| 5 | Return to home after activity | Sidebar updates without full page reload | ☐ |
| 6 | Progress meter | Shows X/10 on **focus** list (`todayWordItemIds`) | ☐ |
| 7 | Evicted word | **· New** badge on swapped-in word | ☐ |

---

## Phase 3 — S2 + dynamic cloze + sync

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 8 | Focus list topic spread | No more than 4 words from same topic | ☐ |
| 9 | Stretch badge | At most one **· Stretch** on focus words (when bank has harder candidates) | ☐ |
| 10 | Cloze activity | Paragraph built from **today's** words (not MVP static template) | ☐ |
| 11 | Cloze locked state | "Needs example sentences" when &lt;2 cloze-eligible words | ☐ |
| 12 | Complete Match (auth user) | Network: evidence + mastery upsert; home refreshes | ☐ |

---

## Phase 4 — Hardening

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 13 | New session `selectionVersion` | `3` on fresh builds | ☐ |
| 14 | Pack version bump in cache | Session rebuilds from 240-word pool | ☐ |
| 15 | Unknown word in `introducedWordItemIds` | Session rebuilds (stale detection) | ☐ |
| 16 | Device A: practice → Device B: login | Mastery visible; today's set reflects server records | ☐ |
| 17 | `?masterySyncDebug=1` on `/secondary` | Panel shows queue / local rows after practice | ☐ |
| 18 | Offline practice → online | Queue drains; server rows appear | ☐ |

---

## Phase 5 — Student clarity

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 19 | Sidebar sections | **Warm-up** and **Focus** lists when warmup words exist | ☐ |
| 20 | Reason chips | Due / New / Practice more / Stretch / New today on focus words | ☐ |
| 21 | Progress meter | X/10 on **focus** only; copy mentions warm-up + master-3 rule | ☐ |
| 22 | After slow-replace | Blue “list updated” banner on home | ☐ |
| 23 | `?secondaryDebug` on `/secondary` | `[reason]` debug chips on word rows | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Empty daily set with loaded bank, slow-replace never fires with 240-word reserve, cloze uses stale MVP-only words, cross-device mastery missing after sync, session stuck on MVP pack after deploy.

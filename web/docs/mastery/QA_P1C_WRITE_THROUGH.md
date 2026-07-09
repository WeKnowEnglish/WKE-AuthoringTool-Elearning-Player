# QA: P1c Write-through mastery sync

> **Superseded for program sign-off by** [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md). **Runtime spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)

**Track:** P1c — push evidence + mastery after local write  
**Proposal:** [PROPOSAL_P1C_WRITE_THROUGH.md](./PROPOSAL_P1C_WRITE_THROUGH.md)  
**Prerequisites:** `024_student_mastery.sql` + `025_evidence_id_text.sql` applied

---

## Automated (local)

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Sync push tests | `npx vitest run lib/mastery/supabase-sync.test.ts` | ☐ Pass |
| A2 | Local storage hook tests | `npx vitest run lib/mastery/local-storage.test.ts` | ☐ Pass |
| A3 | Mastery regression | `npx vitest run lib/mastery/` | ☐ Pass |

---

## Cross-device loop

Use two browsers or profiles. Same student account.

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | Browser A: sign in as User A | — | ☐ |
| 2 | Practice 3–5 secondary words (Match) | Network: `student_learning_evidence` INSERT + `student_mastery_records` UPSERT | ☐ |
| 3 | Supabase: verify rows for User A | Mastery scores match local | ☐ |
| 4 | Browser B: clear local mastery for User A; sign in | P1b pull hydrates | ☐ |
| 5 | Open `/secondary` | Due/fragile reflects device A practice | ☐ |

---

## Guest → login backlog

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 6 | Guest: practice 2–3 words | Local only; no server writes | ☐ |
| 7 | Sign in (migrate path) | Backlog UPSERT; server has mastery rows | ☐ |
| 8 | Browser B login as same user | Pull shows migrated words | ☐ |

---

## Guest unchanged

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 9 | Guest secondary practice | No `student_*` table writes | ☐ |

---

## Failure tolerance

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 10 | Throttle/offline network; practice one word | Local mastery updates; UI not blocked | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Guest server writes, local write blocked on push failure, cross-device mastery missing after authenticated practice.

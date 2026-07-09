# QA: P1b Pull mastery on login

> **Superseded for program sign-off by** [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md). **Runtime spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)

**Track:** P1b — read path (no write-through)  
**Proposal:** [PROPOSAL_P1B_PULL_ON_LOGIN.md](./PROPOSAL_P1B_PULL_ON_LOGIN.md)  
**Prerequisite:** P1a migration applied + [QA_P1A_SCHEMA.md](./QA_P1A_SCHEMA.md) passed

Full device A → device B loop requires **P1c write-through**. Use SQL seed below to verify pull + merge.

---

## Automated (local)

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Sync unit tests | `npx vitest run lib/mastery/supabase-sync.test.ts` | ☐ Pass |
| A2 | Mastery regression | `npx vitest run lib/mastery/` | ☐ Pass |
| A3 | Secondary session tests | `npx vitest run lib/secondary/secondary-today-session.test.ts` | ☐ Pass |

---

## Seed server (simulate device A)

Run in SQL Editor for test student **User A** (`auth.users.id`):

```sql
insert into public.student_mastery_records (
  student_id, target_key, target_type, record, updated_at
) values (
  '<USER_A_UUID>',
  'word:g7-a2-apple',
  'word',
  '{"studentId":"<USER_A_UUID>","targetKey":"word:g7-a2-apple","targetType":"word","state":"developing","masteryScore":0.72,"confidence":0.5,"exposureCount":4,"retrievalSuccessCount":3,"retrievalFailureCount":1,"firstTrySuccessCount":2,"lastSeenAt":"2026-07-09T08:00:00.000Z","lastSuccessAt":"2026-07-09T08:00:00.000Z","nextReviewAt":"2026-07-10T08:00:00.000Z","commonErrorCodes":[],"scaffoldingNeeded":"medium","updatedAt":"2026-07-09T08:00:00.000Z"}'::jsonb,
  '2026-07-09T08:00:00.000Z'
)
on conflict (student_id, target_key) do update
  set record = excluded.record, updated_at = excluded.updated_at;
```

---

## Manual checklist

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | Clear `wke-student-mastery-v1:{userA}` in DevTools | Empty local mastery | ☐ |
| 2 | Sign in as User A | Network: `student_mastery_records` SELECT | ☐ |
| 3 | Inspect scoped local mastery key | Seeded `word:g7-a2-apple` present | ☐ |
| 4 | Open `/secondary` | Session reflects server mastery skew | ☐ |
| 5 | Practice 1 word locally (pre-P1c) | Local `updatedAt` newer for that word | ☐ |
| 6 | Reload page | Local-newer word kept; other server words remain | ☐ |
| 7 | Browse as guest; practice secondary | No mastery table network calls | ☐ |
| 8 | User A → sign out → User B | B namespace; no bleed from A | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Stale secondary session before pull, cross-account bleed, guest Supabase writes, pull errors block navigation/play.

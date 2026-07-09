# QA: P1 Supabase mastery sync — E2E sign-off

> **Superseded for program sign-off by this file.** Phase-specific detail: [QA_P1A](./QA_P1A_SCHEMA.md) · [P1B](./QA_P1B_PULL_ON_LOGIN.md) · [P1C](./QA_P1C_WRITE_THROUGH.md)

**Track:** P1a–P1d consolidated validation  
**Canonical spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)

Run after migrations `024` + `025` are applied.

---

## Automated (local)

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Full mastery test suite | `npx vitest run lib/mastery/` | ☑ Pass |

---

## P1a — Schema + RLS

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | `024` + `025` applied | Tables exist; evidence `id` is `text` | ☐ |
| 2 | RLS manual checks | See [QA_P1A_SCHEMA.md](./QA_P1A_SCHEMA.md) | ☐ |

---

## P1b — Pull on login

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 3 | SQL seed → login → local hydrated | Scoped mastery populated | ☐ |
| 4 | Account switch | No bleed between users | ☐ |

---

## P1c — Write-through

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 5 | Device A auth practice | Evidence INSERT + mastery UPSERT | ☐ |
| 6 | Device B login (cleared local) | Secondary reflects device A | ☐ |
| 7 | Guest → sign-in migrate | Server has backlog mastery | ☐ |

---

## P1d — Hardening

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 8 | Practice offline (DevTools) | Local updates; queue length > 0 | ☐ |
| 9 | Go online | Queue drains; server rows appear | ☐ |
| 10 | Rapid 5-word Match burst | Debounced mastery upserts (not 5 instant batches) | ☐ |
| 11 | Sign out → different user | No queue bleed | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | Auto | 2026-07-09 | ☑ Pass (automated) / Manual E2E ☐ pending |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Guest server writes, local write blocked, cross-device mastery missing, queue bleed across accounts, offline progress never syncs after reconnect.

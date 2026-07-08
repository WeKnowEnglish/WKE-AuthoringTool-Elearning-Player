# Proposal: Account-linked local storage (P0)

**Status:** Implemented (2026-07-09)  
**Track:** Persistence Layer A + B (prerequisite to Supabase Phase E)  
**Supersedes:** Browser-global `wke-*` / `anonymousDeviceId` as the active namespace for core student data

---

## Three-layer persistence model

| Layer | Name | Status |
| --- | --- | --- |
| **A** | Identity bridge | ✅ `resolveStudentStorageIdSync()` |
| **B** | Account-scoped local cache | ✅ `scopedLocalStorageKey(base, id)` |
| **C** | Supabase sync | ⏳ Planned (P1) |

---

## Layer A — Identity

**Module:** `lib/auth/student-storage-id.ts`

```
logged in  → studentStorageId = supabase.auth.user.id
guest      → studentStorageId = anonymousDeviceId (from wke-progress-v1)
```

- `setStudentStorageIdCache(userId)` / `clearStudentStorageIdCache()` on auth events
- `StudentStorageBootstrap` hydrates cache on student routes
- `SignOutForm` clears cache before server sign-out

**Wired into:** `resolveSecondaryStudentId()` → thin wrapper around `resolveStudentStorageIdSync()`.

---

## Layer B — Scoped keys (P0 scope)

| Base key | Module |
| --- | --- |
| `wke-progress-v1` | `lib/progress/local-storage.ts` |
| `wke-rewards-v1` | `lib/progress/rewards.ts` |
| `wke-student-mastery-v1` | `lib/mastery/local-storage.ts` |
| `wke-learning-evidence-v1` | `lib/mastery/local-storage.ts` |
| `secondary-vocab-word-progress-v1:` | legacy read fallback |
| `secondary-vocab-today-session-v2:` | `secondary-today-session.ts` |
| `secondary-vocab-today-completion-v1:` | `secondary-today-session.ts` |
| `secondary-local-activity-v1:` | `local-activity-store.ts` |

Key shape: `` `${baseKey}:${studentStorageId}` `` (secondary prefixed keys append `:${studentId}:…`).

**Migration:** `lib/auth/student-storage-migrate.ts` — one-time copy from legacy unscoped / guest device namespace on first authenticated session (`ensureMigratedForCurrentStudent()`).

---

## Out of scope (P0 follow-on)

- Garden, pet, board game, explore, daily quests (`wke-garden-v2`, `wke-pet-v1`, …)
- Supabase tables / write-through sync (P1)
- Cross-device restore

---

## Acceptance (verified)

1. Two accounts on one browser → isolated mastery/rewards/progress namespaces.
2. Signed-in evidence uses `user.id` as `studentId` on `LearningEvidenceEvent`.
3. Guest landing still works via device id.
4. First login copies legacy guest data into account namespace once.

---

## Next persistence pass

**P1 — Supabase mastery sync** (see [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md)): tables + RLS + pull on load + write-through after `recordLearningEvidenceEvent`.

**S1 — Secondary session selection v2** can proceed on Layer B without waiting for P1.

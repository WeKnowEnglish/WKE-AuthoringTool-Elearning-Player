# Data Flow Inventory (Evidence)

Audit date: 2026-07-20

## A. Primary vocab practice

```
/primary Vocabulary|Learn|Continue
  → PrimaryDashboardClient.openVocabularySet
  → VocabularySetOverlay
  → loadVocabularySetMedia (server action)
  → buildVocabularySetScreens + mastery preferredWordIds
  → LessonPlayer
      → recordAttempt / student-session events (local)
      → recordVocabularyEvidence (graded subtypes only)
      → localStorage mastery + evidence
      → optional Supabase push (supabase-sync)
      → rewards (gold/XP) on completion
  → refresh primary home/progress/review models
```

Key files: `PrimaryDashboardClient.tsx`, `VocabularySetOverlay.tsx`, `LessonPlayer.tsx`, `lib/mastery/vocabulary.ts`, `lib/student-session.ts`, `lib/progress/rewards.ts`.

## B. Secondary daily practice

```
requireSecondaryStudentAccess
  → SecondaryPracticeLayout + useSecondaryTodaySession
  → activity page (match|cloze|spelling|sentence)
  → local attempt / completion stores
  → applySecondaryAttemptToPlatformMastery (except sentence submit)
  → platform mastery localStorage (+ sync)
  → sentence: teacher approval → teacher_assigned evidence
```

Key files: `requireSecondaryAccess.ts`, `lib/secondary/*`, `secondary-mastery-bridge.ts`.

## C. Grammar

```
/grammar → catalog published modules
/grammar/[slug] → poster JSON
Practice overlay → grammar quiz items (sparse)
  → recordGrammarEvidence (when items exist)
```

Publishing: teacher editor → `grammar_modules` draft/published (`lib/data/grammar-modules.ts`, `lib/actions/grammar-modules.ts`).

## D. Mastery storage dual-write

| Store | Key / table | Scoped by student? |
|-------|-------------|-------------------|
| Mastery snapshot | `wke-student-mastery-v1` (+ scoped suffix) | Yes |
| Evidence buffer | `wke-learning-evidence-v1` | Yes |
| Supabase | `student_mastery_records`, `student_learning_evidence` | Yes (auth user) |
| Practice session events | `wke-student-session-events-v1` | **No** (confirmed gap) |
| Rewards | `wke-rewards-v1` | Yes (scoped) |
| Progress | `wke-progress-v1` | Yes |

## E. Content sources of truth

| Domain | Source of truth | Versioning |
|--------|-----------------|------------|
| Primary vocab | TS modules in `lib/vocabulary-templates/sets/` | Ship-by-deploy; no content version field |
| Secondary vocab | `g7-a2-complete-core-vocab-v1_2.json` | packId + version constants enforced |
| Grammar posters | `content/grammar/*.json` + catalog + optional DB row | draft/published status |
| Live-game questions | API / DB question sets | publish endpoint exists |

## F. Auth → portal

```
Login → resolvePostLoginPath(role, learning_band)
  teacher → /teacher/classes
  student a2 → /secondary
  student else → /primary
```

Middleware does **not** enforce this; each page must gate.

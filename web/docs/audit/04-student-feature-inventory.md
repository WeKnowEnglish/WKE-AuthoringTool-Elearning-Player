# 04 — Student Feature Inventory

Audit date: 2026-07-20  
Workstream score (Student learning experience): **3 / 5**  
Evidence: `evidence/route-inventory.md`, `evidence/data-flow-inventory.md`

Classification key: **complete** · **fragile** · **partial** · **placeholder** · **unreachable** · **duplicated** · **disconnected** (from learning evidence)

## Primary portal

| Feature | Route / entry | Classification | Notes |
|---------|---------------|----------------|-------|
| Dashboard shell | `/primary` | complete | Auth-gated; SSR placeholders |
| Learn tab | `?nav=learn` | partial | Next-path builder; depends on mastery/unlock |
| Vocabulary catalog | `?nav=vocabulary` | complete | Opens overlay |
| Vocab set run | `VocabularySetOverlay` | partial | Learn/drag unscored; graded screens OK |
| Continue / resume | continue helpers | partial | Screen index resume; session events unscoped |
| Grammar entry | nav → `/grammar` | partial | Public catalog; sparse quizzes |
| Games: Pet Care | Games tab | partial / disconnected | Economy/play; mastery emitters not confirmed |
| Games: Language Garden | Games tab | partial / disconnected | Same |
| Games: World explore | link `/home` | duplicated / incomplete | Legacy hub still required |
| Review | Review tab | partial | Mastery-driven; vocabulary-centric |
| My Progress | Progress tab | partial | Words mastered / finds; economy visible |
| Gold + XP | rewards | complete (local+scoped) | Unlock-all breaks progression meaning |
| Secondary CTA | dashboard message | complete | Only when band `a2` |
| Join class | `/join-class` | complete | Enrollment |
| Legacy hub | `/home` | duplicated | Full alternate home |

## Secondary portal

| Feature | Route | Classification | Notes |
|---------|-------|----------------|-------|
| Today path | `/secondary` | complete | Pack-version gated session |
| Match | `/secondary/match` | complete | Mastery bridge |
| Cloze | `/secondary/cloze` | complete | Mastery bridge |
| Spelling | `/secondary/spelling` | complete | Mastery bridge |
| Sentence | `/secondary/sentence` | partial | Teacher approve for mastery |
| Learn drawer | layout | complete | |
| Progress card | layout | complete | Daily goal framing |
| Login | `/secondary/login` | complete | |
| Multi-band (non-a2) | — | unreachable | Gate is a2-only |

## Shared / other student

| Feature | Classification | Notes |
|---------|----------------|-------|
| Grammar posters | partial | Read works; scored practice sparse |
| Live classroom / whiteboard | disconnected | Separate evidence model |
| Live-game | disconnected | From curriculum mastery |
| `/activities` courses | unreachable | Archived |
| Pilots / teststart | placeholder | Dev/prototype |

## Journey traces

### New student (Primary)

1. Login → `/primary` (non-a2).  
2. Sees placeholder then hydrated economy/progress.  
3. Learn/Vocab available; **all unlocks open** (ARCH-001).  
4. Completing graded screens writes mastery; learn/drag may not.  
5. **Risk:** Shared device session events pollute (ARCH-005).

### Returning student (Primary)

1. Mastery pull on auth (scoped).  
2. Continue learning / review from builders.  
3. Legacy `/home` may still be bookmarked — parallel state.

### Assigned learning

- Class join exists; **missing evidence** that Primary dashboard surfaces teacher-assigned curriculum path as first-class (beyond Secondary sentence teacher review).  
- **Classification:** incomplete / product decision.

### Independent practice

- Primary vocab + Secondary daily path: **complete-ish**.  
- Grammar: read **complete**, assess **partial**.

### Lesson completion / failure / retry

- LessonPlayer attempt loop exists; rewards on completion.  
- Retry semantics for mastery: present in engine (see mastery audit); UI copy inconsistent.

### Refresh / resume

- Primary: overlay resume index; SSR placeholders prevent hydration flash.  
- Secondary: today session persisted; pack id/version invalidate stale sessions.

### No content

- Secondary empty states: “No words ready today” / path complete.  
- Primary empty: depends on builders — **medium confidence** without full UI walkthrough this audit pass.

---

## Findings

### FEAT-001 — Dual Primary home splits the student journey

| Field | Value |
|-------|-------|
| **ID** | FEAT-001 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Duplicated |
| **Evidence** | `/primary` + live `/home`; Games deep-link |
| **User impact** | Confused “where do I learn?” |
| **Curriculum impact** | Path analytics fragmented |
| **Correction** | Single home; hub as optional Games only |
| **Scope** | Large |
| **Blocks curriculum work?** | Partial |

### FEAT-002 — Games / pet / garden disconnected from mastery evidence

| Field | Value |
|-------|-------|
| **ID** | FEAT-002 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Primary |
| **Classification** | Disconnected / missing evidence of emitters |
| **Evidence** | Activity kinds exist in types; no confirmed mastery writes from pet/garden in this audit |
| **User impact** | Fun without learning credit (may be OK) |
| **Curriculum impact** | Must not count as curriculum completion |
| **Correction** | Document as non-curricular; or wire evidence |
| **Scope** | Medium |
| **Blocks curriculum work?** | No if labeled non-curricular |

### FEAT-003 — Assigned Primary curriculum path not first-class

| Field | Value |
|-------|-------|
| **ID** | FEAT-003 |
| **Severity** | P1 |
| **Confidence** | Medium |
| **Portal** | Primary |
| **Classification** | Incomplete / missing evidence |
| **Evidence** | Join-class exists; Primary Learn is mastery/economy driven, not assignment queue |
| **User impact** | Teachers cannot assign Primary units like Secondary sentence flow |
| **Curriculum impact** | Class-based Primary rollout blocked |
| **Correction** | Assignment model → Learn tab |
| **Scope** | Large |
| **Blocks curriculum work?** | Yes for class-assigned Primary |

### FEAT-004 — Secondary sentence mastery teacher-gated

| Field | Value |
|-------|-------|
| **ID** | FEAT-004 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Secondary |
| **Classification** | Partial (by design?) |
| **Evidence** | Activity contract; teacher review proposals in docs |
| **User impact** | Autonomous mastery delayed |
| **Curriculum impact** | Writing strand evidence depends on teacher ops |
| **Correction** | Product decision: auto-score vs teacher |
| **Scope** | Medium |
| **Blocks curriculum work?** | Product decision |

**Workstream score: 3 / 5**

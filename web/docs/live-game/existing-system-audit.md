# Live Game — Existing System Audit

**Status:** Phase 0 (audit only)  
**Prepared:** 2026-07-11  
**Purpose:** Inventory what exists today so the live cooperative game module wraps and reuses code instead of rebuilding it.

---

## 1. Executive summary

The codebase has **no Gimkit-style live quiz** and **no cooperative free-movement multiplayer game** yet. What exists:

| Layer | Verdict |
| --- | --- |
| Liveblocks SDK + auth | **Ready** — installed and working for board-game only |
| Multiplayer lobby / join-code pattern | **Wrap** — reusable from board-game live components |
| Free-movement engine | **Wrap** — explore roam (`explore-scene-engine.ts`) |
| Map rendering | **Wrap** — explore background + rect collision; topdown sprites for future tile overlays |
| Quiz UI | **Ready / Wrap** — MC modal and lesson interactions exist |
| Mastery evidence | **Wrap** — engine ready; games do not emit evidence today |
| Student identity | **Wrap** — Supabase auth exists; Liveblocks uses separate guest IDs |
| Turn-based board multiplayer | **Do not extend** — host plays, students spectate |

**Recommended reuse stack:** Liveblocks lobby pattern (board-game) + explore roam movement + question overlays + mastery evidence factories + Supabase student ID bridging.

---

## 2. Liveblocks infrastructure

### Installed packages

| Package | Version | File |
| --- | --- | --- |
| `@liveblocks/client` | ^3.22.0 | `web/package.json` |
| `@liveblocks/react` | ^3.22.0 | `web/package.json` |
| `@liveblocks/node` | ^3.22.0 | `web/package.json` |

**No additional install needed** for Phase 1.

### Configuration

| File | What it does |
| --- | --- |
| `web/liveblocks.config.ts` | Global typed schema: `lobby`, `players`, `setup`, `runtime` — **board-game only** |
| `web/.env.example` | `LIVEBLOCKS_SECRET_KEY` (server-only) |
| `web/lib/env/liveblocks-server.ts` | Secret key validation helper |

### Auth flow (current)

```
Client (BoardGameLiveProvider)
  → POST /api/liveblocks/auth { room, userId, displayName, role }
  → canAccessRoom() checks host cookie for host role
  → liveblocks.prepareSession() returns token
```

| File | Role |
| --- | --- |
| `web/app/api/liveblocks/auth/route.ts` | Liveblocks session auth endpoint |
| `web/lib/board-game/liveblocks/auth-policy.ts` | Host cookie gate; open join for players |
| `web/lib/board-game/liveblocks/auth-context.ts` | Parse auth request body |
| `web/lib/board-game/liveblocks/host-cookie.ts` | httpOnly host cookie format |
| `web/app/api/board-game/live/host/route.ts` | Create session + set host cookie |

### Room ID convention (board-game)

| File | Pattern |
| --- | --- |
| `web/lib/board-game/liveblocks/room-id.ts` | `wke-board-game-{joinCode}` |
| `web/lib/board-game/liveblocks/join-code.ts` | 6-char alphabet join codes |

**Gap:** Live-game needs a **separate room prefix** (e.g. `wke-live-game-`) so auth policy can route without breaking board-game rooms.

### Server-side storage mutations

**Not implemented today.** `@liveblocks/node` is only used in the auth route. Phase 2 will introduce `liveblocks.mutateStorage` for server-validated rewards.

### Reuse verdict: **WRAP**

Extract shared auth/provider helpers into `web/lib/liveblocks/` in Phase 1. Keep board-game-specific mutations in `web/lib/board-game/liveblocks/`.

---

## 3. Board-game multiplayer (reference pattern)

### Routes

| Route | File |
| --- | --- |
| `/board-game` | `web/app/board-game/page.tsx` |
| `/board-game/multiplayer` | `web/app/board-game/multiplayer/page.tsx` |
| `/board-game/multiplayer/host` | `web/app/board-game/multiplayer/host/page.tsx` |
| `/board-game/multiplayer/join` | `web/app/board-game/multiplayer/join/page.tsx` |
| `/board-game/multiplayer/join/[code]` | `web/app/board-game/multiplayer/join/[code]/page.tsx` |
| `/board-game/multiplayer/[sessionId]` | `web/app/board-game/multiplayer/[sessionId]/page.tsx` |

### Live UI components

| File | What it does |
| --- | --- |
| `web/components/board-game/live/BoardGameLiveProvider.tsx` | `LiveblocksProvider` + auth endpoint |
| `web/components/board-game/live/BoardGameRoomShell.tsx` | `RoomProvider` wrapper |
| `web/components/board-game/live/BoardGameSessionRouter.tsx` | Lobby vs play phase router |
| `web/components/board-game/live/BoardGameLobby.tsx` | Join, ready, start game |
| `web/components/board-game/live/BoardGameHostPage.tsx` | Teacher creates session |
| `web/components/board-game/live/BoardGameJoinForm.tsx` | Student enters join code |
| `web/components/board-game/live/BoardGameMultiplayerPlay.tsx` | Play wrapper — **students are spectators** |
| `web/components/board-game/live/BoardGameMultiplayerEntry.tsx` | Host or join landing |
| `web/components/board-game/live/BoardGameSessionPage.tsx` | Session page shell |

### Liveblocks state (board-game)

| File | What it does |
| --- | --- |
| `web/lib/board-game/liveblocks/initial-storage.ts` | Default lobby + players |
| `web/lib/board-game/liveblocks/use-board-game-lobby.ts` | `useSelf`, `useOthers`, player list |
| `web/lib/board-game/liveblocks/mutations/lobby.ts` | Join lobby, set ready, start lobby |
| `web/lib/board-game/liveblocks/mutations/game.ts` | Start game, commit runtime, restart, back to lobby |
| `web/lib/board-game/liveblocks/serializers/setup.ts` | `GameSetup` ↔ LiveObject |
| `web/lib/board-game/liveblocks/serializers/runtime.ts` | `GameRuntime` ↔ LiveObject |
| `web/lib/board-game/liveblocks/build-multiplayer-setup.ts` | Lobby players → `GameSetup` |
| `web/lib/board-game/session/use-liveblocks-board-game-session.ts` | Host-only `commitRuntime` |

### Game engine (turn-based — not for live-game)

| File | What it does |
| --- | --- |
| `web/lib/board-game/game-engine.ts` | Dice, path-index movement, turn phases |
| `web/lib/board-game/types.ts` | `GameSetup`, `GameRuntime`, `Question` (MC + fill-blank) |
| `web/components/board-game/BoardGame.tsx` | Main play shell |
| `web/components/board-game/QuestionModal.tsx` | MC + fill-blank modal |

### Critical limitation

```tsx
// web/components/board-game/live/BoardGameMultiplayerPlay.tsx
const interactMode = context.role === "host" ? "host" : "spectator";
```

Students cannot move or answer on their own devices. Live-game must give every student `interactMode: "player"` with Presence-based movement.

### Reuse verdict: **WRAP lobby pattern only** — do not extend game engine or runtime schema.

---

## 4. Explore roam (free-movement base)

### Engine

| File | What it does |
| --- | --- |
| `web/lib/explore/explore-scene-engine.ts` | Axis movement, rect collision, interact radius, zone detection |
| `web/lib/teststartpage/chase-game-physics.ts` | `Rect`, `rectsOverlap` — shared collision primitive |

Key constants in `explore-scene-engine.ts`:

- Player size: 32×32 px
- Move speed: 200 px/sec
- Default interact radius: 52 px

### Scene definition format

| File | What it does |
| --- | --- |
| `web/lib/explore/scenes/types.ts` | `ExploreSceneDefinition`, `ExploreSceneMapDef` |
| `web/lib/explore/scenes/home-help-brother.ts` | Pilot scene: 960×540 map, collision rects, word/material pickups |
| `web/lib/explore/scenes/registry.ts` | Scene registry |
| `web/lib/explore/scenes/index.ts` | Barrel export |

`ExploreSceneMapDef` fields relevant to live-game:

```ts
{
  widthPx: number;
  heightPx: number;
  backgroundUrl: string;
  collisionRects: Rect[];
  doorways?: { x, y, label }[];
}
```

**Gap:** No resource-node or crafting-station types yet. MVP will extend scene defs or add a parallel `LiveGameMapDef`.

### UI shell

| File | What it does |
| --- | --- |
| `web/components/lesson/interactions/explore-scene/ExploreSceneRoam.tsx` | Keyboard + D-pad + touch input loop (RAF tick) |
| `web/components/lesson/interactions/explore-scene/ExploreSceneMapLayer.tsx` | Background image + player div |
| `web/components/lesson/interactions/explore-scene/ExploreSceneDpad.tsx` | Touch movement controls |
| `web/components/student-hub/ExploreSceneChapterOverlay.tsx` | Full scene flow: intro → roam → cloze → complete |

### Reuse verdict: **WRAP**

- Movement/collision: `explore-scene-engine.ts`
- Input loop: `ExploreSceneRoam.tsx`
- Map format: `ExploreSceneMapDef` as starting point for pilot map
- Player rendering: currently a CSS div — needs avatar component for remote players

**Gap:** `ExploreSceneRunState` tracks one `playerX/Y`. Live-game needs per-player state via Liveblocks Presence, not a single local state object.

---

## 5. Map rendering (topdown / board-game tilemap)

### Topdown sprite system

| File | What it does |
| --- | --- |
| `web/lib/topdown/wke-sprite-atlas.ts` | WKE path + terrain sprite atlas |
| `web/lib/topdown/sprite-utils.ts` | CSS background-position crop helpers |
| `web/components/topdown/TopDownSprite.tsx` | Renders cropped atlas sprite |
| `web/components/topdown/TopDownStackedAtlasTile.tsx` | Stacked terrain+path cell |

### Board-game tilemap (path-index maps — not for live-game movement)

| File | What it does |
| --- | --- |
| `web/lib/board-game/map/types.ts` | `BoardMap` — `pathOrder`, `spaces[]`, tile overrides |
| `web/lib/board-game/render/build-board-tilemap.ts` | Map → tilemap resolution |
| `web/components/board-game/render/BoardTilemapLayer.tsx` | Terrain/path sprite layers |

**Gap:** Board-game maps use path indices, not x/y walkability. Live-game uses explore roam coords.

### Reuse verdict: **WRAP for visuals later** — MVP uses explore background image; topdown tiles optional in Phase 4+.

---

## 6. Question and quiz components

### Multiple choice

| File | What it does |
| --- | --- |
| `web/components/board-game/QuestionModal.tsx` | MC + fill-blank modal (board-game styling) |
| `web/components/board-game/QuestionCard.tsx` | Inline question card |
| `web/components/lesson/interactions/McQuizView.tsx` | Lesson MC with TTS, shuffle |
| `web/lib/board-game/types.ts` | `MultipleChoiceQuestion`, `FillBlankQuestion` |
| `web/lib/board-game/question-utils.ts` | Question pick/format helpers |

### Sentence ordering (crafting challenge)

| File | What it does |
| --- | --- |
| `web/components/lesson/interactions/DragSentenceView.tsx` | Tap-to-slot word ordering |
| `web/lib/lesson-schemas.ts` | `drag_sentence` schema (`sentence_slots`, `word_bank`, `correct_order`) |

### Other interaction types (future)

| File | What it does |
| --- | --- |
| `web/components/lesson/interactions/FillBlanksView.tsx` | Cloze / fill-in-blank |
| `web/components/lesson/interactions/ExploreGatePanel.tsx` | Gate spell-sprint |
| `web/components/lesson/interactions/LetterMixupView.tsx` | Letter unscramble |

### Reuse verdict

| Type | Verdict |
| --- | --- |
| Multiple choice | **READY** — wrap `QuestionModal` or `McQuizView` as overlay |
| Fill blank | **WRAP** — exists; not in MVP |
| Sentence ordering | **WRAP** — `DragSentenceView` for crafting station (Phase 4) |

**Gap:** No shared question schema across lesson / board-game / live-game. Server must hold correct answers; client payload must strip them.

---

## 7. Mastery and evidence

### Core engine

| File | What it does |
| --- | --- |
| `web/lib/mastery/types.ts` | `LearningEvidenceEvent`, `EvidenceSource` |
| `web/lib/mastery/engine.ts` | `applyEvidenceToMastery` |
| `web/lib/mastery/local-storage.ts` | `recordLearningEvidenceEvent` |
| `web/lib/mastery/vocabulary.ts` | `recordVocabularyEvidence`, `createVocabularyEvidenceEvent` |
| `web/lib/mastery/supabase-sync.ts` | Server push of evidence |
| `web/lib/mastery/sync-queue.ts` | Offline retry queue |
| `web/lib/secondary/secondary-mastery-bridge.ts` | Secondary vocab → platform mastery |

### Evidence sources defined

```ts
// web/lib/mastery/types.ts
type EvidenceSource =
  | "lesson"
  | "vocab_set"
  | "board_game"   // defined but NEVER emitted in codebase
  | "story_scene"
  | "pet_game"
  | "teacher_assigned";
```

### Reference wiring (lesson player)

`web/components/lesson/LessonPlayer.tsx` calls `recordVocabularyEvidence` on quiz outcomes — use this as the integration pattern for live-game.

### Explore rewards (no mastery)

`web/lib/explore/record-explore-run-complete.ts` records XP/rewards only — **no mastery evidence**.

### Reuse verdict: **WRAP**

Phase 2+: add `EvidenceSource: "live_game"` and emit events from server-validated answer route.

**Gap:** Liveblocks guest IDs (`guest-{uuid}`) are not linked to Supabase `user.id`. Live-game routes must require student login and pass real student ID into auth.

---

## 8. Student and teacher identity

### Student auth

| File | What it does |
| --- | --- |
| `web/lib/auth/student-credentials.ts` | Username/PIN validation |
| `web/lib/auth/student-storage-id.ts` | `resolveStudentStorageIdSync()` → Supabase `user.id` or guest device ID |
| `web/lib/auth/use-student-display-name.ts` | Display name from `user_metadata` |
| `web/lib/auth/scoped-local-storage.ts` | Per-student localStorage namespacing |
| `web/lib/auth/roles.ts` | `teacher` / `student` app roles |

### Liveblocks identity (separate system)

| File | What it does |
| --- | --- |
| `web/lib/board-game/liveblocks/identity.ts` | `guest-{uuid}` in sessionStorage; `LiveSessionContext` |
| `web/app/api/liveblocks/auth/route.ts` | Accepts any `userId` string — not validated against Supabase |

### Teacher classes (T0)

| Doc / area | Status |
| --- | --- |
| `web/docs/mastery/PROPOSAL_T0_TEACHER_CLASSES.md` | Implemented — roster join codes via Supabase |
| Teacher class join codes | Separate from board-game Liveblocks join codes |

### Reuse verdict: **WRAP**

- Students: use `resolveStudentStorageIdSync()` as Liveblocks `userId`
- Teachers: host cookie pattern from board-game; optional teacher dashboard route in Phase 5
- Class roster gate: Phase 6

---

## 9. Content sources for questions (Phase 6 preview)

| Source | File | Size |
| --- | --- | --- |
| Secondary vocab pack | `web/g7-a2-complete-core-vocab-v1_2.json` | 240 words |
| Pack loader | `web/lib/secondary/secondary-vocab-pack-loader.ts` | Runtime loader |
| Board-game decks | `web/lib/board-game/decks/story-builder-a2.ts` | Example MC deck |
| Lesson interactions | Teacher-authored via course CMS | Per-lesson |

MVP uses a **static hardcoded question bank** (6–12 MC questions tied to resource nodes). Adaptive selection deferred to Phase 6.

---

## 10. Gaps summary (live-game specific)

| # | Gap | Phase to address |
| --- | --- | --- |
| 1 | No realtime position sync | Phase 1 (Presence) |
| 2 | Students are spectators in board-game multiplayer | Phase 1 (all players active) |
| 3 | Dual identity (guest vs Supabase) | Phase 1 (require login) |
| 4 | No server-validated rewards | Phase 2 |
| 5 | No shared quiz / resource state | Phase 2 |
| 6 | No personal coin economy | Phase 3 |
| 7 | No crafting / map unlock | Phase 4 |
| 8 | Mastery not wired to games | Phase 2+ (evidence), Phase 6 (full) |
| 9 | Incompatible map paradigms (path-index vs x/y) | Commit to explore roam only |
| 10 | No teacher session dashboard | Phase 5 |
| 11 | No `web/components/explore` — scattered across lesson + student-hub | New `web/components/live-game/` |
| 12 | No cooperative objectives (shared pool, team win) | Phase 2–4 |

---

## 11. Components by reuse verdict

| Verdict | Systems |
| --- | --- |
| **READY** | Liveblocks SDK, MC question modal, mastery engine types |
| **WRAP** | Lobby pattern, explore movement, scene map format, sentence ordering, student auth, Liveblocks auth endpoint |
| **REBUILD** | Remote player rendering, camera for scrolling worlds, server storage mutations, live-game Storage schema |
| **DO NOT EXTEND** | Board-game turn engine, board-game runtime sync, spectator multiplayer model |

---

## 12. Recommended mount point

New routes under `web/app/live-game/`:

```
/live-game                  → entry (host or join)
/live-game/host             → teacher creates session
/live-game/join             → student enters code
/live-game/[sessionId]      → in-session (lobby or play)
/live-game/teacher/[sessionId]  → teacher dashboard (Phase 5)
```

New code directories:

```
web/lib/live-game/          → engine, schemas, multiplayer mutations
web/components/live-game/   → canvas, players, HUD, overlays
web/lib/liveblocks/         → shared auth/provider (extracted Phase 1)
```

Do **not** mount inside `/board-game` or extend board-game Storage schema.

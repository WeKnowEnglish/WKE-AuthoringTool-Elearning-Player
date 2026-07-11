# Live Game — Phase 2 Plan (English Craft v0.1)

**Status:** Ready to implement (2026-07-11)  
**Depends on:** Phase 1 complete  
**Delivers:** Full cooperative win loop — **no coins, no shop**  
**Target:** Teachers can run a 20-minute session where students collect wood, craft a bridge, cross the river, and touch the flag together.

---

## 1. What Phase 1 gave us (baseline)

Phase 1 is **done**. Do not rebuild these:

| Area | Shipped |
| --- | --- |
| Session shell | `/live-game`, host, join, `[sessionId]` lobby + play |
| Liveblocks | `wke-live-game-*` rooms, student auth, host cookie, lobby mutations |
| Movement | Keyboard + D-pad, collision rects, camera follow + zoom |
| Map | `english-craft-v1` — 20×11 grass tilemap, stacked 3D tiles, river band, north choke |
| Players | Boy character sprite, left/right flip, walk teeter, remote interpolation |
| Polish | Tile step bounce, dark-brown ground gaps, fullscreen HUD |

**Not shipped yet (Phase 2):**

- Liveblocks **gameplay Storage** (wood pool, nodes, bridge, victory)
- Server **challenge / answer / craft** routes
- Interact prompts, question UI, team HUD
- Real map objects (trees, bench, bridge, flag) — placeholders only today

---

## 2. v0.1 win loop (locked)

```
Spawn south → chop trees (MC vocab) → +1 wood to TEAM pool each correct answer
        ↓
Team pool reaches 10 wood
        ↓
Crafting bench → sentence ordering challenge → craft bridge
        ↓
River collision removed for all players → cross to north
        ↓
Touch flag → session phase = completed → victory screen
```

| Rule | Value |
| --- | --- |
| Wood goal | **10** (pilot) |
| Economy | **None** in v0.1 — coins deferred to Phase 4 |
| Question types | MC at trees; drag-sentence at bench |
| Teacher in-world | No — host starts from lobby (same as Phase 1) |
| Mastery evidence | Optional stub in 2C; full pipeline Phase 6 |

---

## 3. Asset checklist (for art collection)

Place finished assets under `web/public/assets/live-game/english-craft-v1/` (suggested folders). PNG with transparency unless noted.

### Required for v0.1

| Asset | Suggested path | Notes |
| --- | --- | --- |
| **Tree (full)** | `trees/tree-wood-1.png` | 1–2 variants enough for pilot; ~80–120px wide on map |
| **Tree (depleted / stump)** | `trees/tree-stump-1.png` | Shown during node cooldown (optional: reuse full tree + overlay) |
| **Crafting bench** | `stations/craft-bench-1.png` | Interact zone near river north shore |
| **Bridge (built)** | `structures/bridge-wood-1.png` | Spans river; hidden until crafted |
| **Flag / objective** | `objectives/flag-1.png` | North area win touch target |
| **Wood icon (HUD)** | `ui/icon-wood.png` | Small icon for team pool counter |

### Nice-to-have (can ship with placeholders)

| Asset | Notes |
| --- | --- |
| Bridge (unbuilt) / rope outline | Visual “needs crafting” hint |
| Collect sparkle / +1 wood FX | Can start with CSS pulse |
| Victory banner art | Can be text-only overlay first |
| Bench idle glow | Interact radius hint |

### Already have

| Asset | Location |
| --- | --- |
| Grass tile pack | `public/assets/tiles/Grass_Tile_Pack/` |
| Boy character | `public/assets/tiles/Boy Character Final.png` |

### Map placement guide (logical pixels, 80px tiles)

Use these as **targets** when exporting art; exact coords tuned in `map-objects-v1.ts` during implementation.

| Object | Approx region | Count |
| --- | --- | --- |
| Wood trees | Rows 7–9, cols 2–17 (south/mid) | **8** |
| Craft bench | North of river, ~col 10–12, row 3–4 | **1** |
| Bridge | River row 5–6, cols 10–11 (center crossing) | **1** |
| Flag | North-east, ~col 16–17, row 1–2 | **1** |
| Spawns | Row 9 (existing) | 6 |

---

## 4. Sub-milestones

### Phase 2A — Wood collection

**Goal:** Students earn team wood by answering MC questions at trees.

**Storage (add to `initial-storage` + mutations):**

```ts
resourcePool: { wood: 0 }
resourceNodes: Map<nodeId, { available, cooldownEndsAt, collectedBy? }>
```

**Server:**

- `POST /api/live-game/challenge` — issue MC question for `nodeId` (no correct answer in response)
- `POST /api/live-game/answer` — validate, `mutateStorage` +1 wood, node cooldown (~30s), mark challenge used
- In-memory challenge store (room + player + node); expire ~60s

**Client:**

- `map-objects-v1.ts` — 8 tree positions + interact radius
- `EnglishCraftInteractLayer` — proximity detect, “Chop tree” prompt
- `LiveGameMcChallengeModal` — reuse board-game MC option pattern
- `LiveGameTeamHud` — wood count `3 / 10` (top overlay)
- Pause movement while modal open

**Acceptance:**

- [ ] Approach tree → interact prompt
- [ ] Correct MC → pool +1 for all clients
- [ ] Wrong → no wood
- [ ] Same tree on cooldown → blocked
- [ ] Two simultaneous correct submits → only +1 wood (server idempotent)

---

### Phase 2B — Craft bridge

**Goal:** Team spends 10 wood to craft bridge; river opens for everyone.

**Storage:**

```ts
craftedItems: { bridge: boolean }
unlockedObjects: { river_crossing: boolean }
```

**Server:**

- `POST /api/live-game/craft/challenge` — sentence-order question (server-held correct order)
- `POST /api/live-game/craft/answer` — correct → deduct 10 wood, set `bridge: true`, unlock river
- Reject if pool &lt; 10 or bridge already crafted

**Client:**

- Bench interact when `wood >= 10`
- `LiveGameCraftModal` — wrap `DragSentenceView` pattern (pilot sentence in `questions/craft-bridge-v1.ts`)
- Bridge sprite appears; remove river collision rect from effective collision (storage-driven)
- Broadcast or storage subscription so all players see bridge instantly

**Pilot craft sentence:**

```
Word bank: usually / after school / I / play football
Correct:   I usually play football after school.
```

**Acceptance:**

- [ ] Cannot craft below 10 wood
- [ ] Wrong sentence → no wood spent
- [ ] Correct craft → wood −10, bridge visible, river passable
- [ ] Players already north/south can cross after unlock

---

### Phase 2C — Flag victory

**Goal:** Touch flag → team win → end screen.

**Storage:**

```ts
session.phase → "completed"
objectiveCompleted: true
victoryAt: timestamp
```

**Client:**

- Flag zone (rect overlap with player feet)
- `LiveGameVictoryOverlay` — “Team win!” + wood stats stub
- Router shows victory when `phase === "completed"`
- Host sees “End session” / return to lobby (minimal)

**Acceptance:**

- [ ] Any player touching flag after bridge unlock completes objective
- [ ] All clients see victory state
- [ ] Movement/challenges disabled after complete
- [ ] (Optional) log attempt row to Supabase for MC answers

---

## 5. Technical design notes

### Storage vs Presence (unchanged)

| Data | Where |
| --- | --- |
| Position, facing, walk | **Presence** (already) |
| Wood pool, nodes, bridge, phase | **Storage** (new) |
| Correct answers | **Server only** |

Extend `createLiveGameInitialStorage()` — today only `session` + `players`. Add gameplay keys without breaking lobby.

Use `@liveblocks/node` `liveblocks.mutateStorage` in API routes (pattern not in repo yet; board-game is client-mutation only).

### Interact detection

Reuse explore pattern: player center/feet vs node `(x, y, radius)`. Check on interact button press (not every frame) to save work.

### Collision updates

Today river uses a static collision rect in `map-v1.ts`. Phase 2B should:

1. Tag rect as `river_gate` in map def, or
2. Filter collision list client+server when `unlockedObjects.river_crossing === true`

### Question bank (pilot)

File: `web/lib/live-game/modes/english-craft/questions-v1.ts`

- 8–12 static MC items (A2 vocab subset; can mirror secondary pack words later)
- 1 craft sentence
- Server imports same file; client never sees answer keys

### New files (expected)

```
web/lib/live-game/modes/english-craft/
  map-objects-v1.ts      # trees, bench, flag, bridge anchor
  questions-v1.ts        # MC + craft sentence
  recipes-v1.ts          # bridge: 10 wood

web/lib/live-game/liveblocks/
  initial-storage.ts     # extend gameplay root
  mutations/gameplay.ts  # pool, nodes, craft (client read helpers)
  serializers/           # plain snapshots for useStorage

web/app/api/live-game/
  challenge/route.ts
  answer/route.ts
  craft/challenge/route.ts
  craft/answer/route.ts

web/components/live-game/
  LiveGameTeamHud.tsx
  LiveGameInteractPrompt.tsx
  LiveGameMcChallengeModal.tsx
  LiveGameCraftModal.tsx
  LiveGameVictoryOverlay.tsx
  EnglishCraftObjectsLayer.tsx
```

---

## 6. Phase 2 manual test script

Run with teacher + 2 students.

| Step | Action | Expected |
| --- | --- | --- |
| 1 | Start session | Map loads with trees, bench, flag visible |
| 2 | Student A chops tree (correct) | Pool 1/10 |
| 3 | Student B same tree immediately | Cooldown / blocked |
| 4 | Collect until 10/10 | Bench prompt active |
| 5 | Wrong craft sentence | Wood still 10 |
| 6 | Correct craft | Bridge appears, river crossable |
| 7 | Student touches flag | Victory overlay, phase completed |
| 8 | Refresh mid-game (optional) | Pool + bridge state restored from Storage |

---

## 7. Explicitly out of scope for Phase 2

| Item | Phase |
| --- | --- |
| Coins, shop, power-ups | Phase 4 |
| Stone / grammar nodes | Phase 3 |
| Teacher results dashboard | Phase 5 |
| Vocab bank picker | Phase 6 |
| Server-side position anti-cheat | Post-pilot |
| Host in-world avatar | Post-pilot |
| Pause blocking challenges | Phase 5 (optional stub) |

---

## 8. Suggested implementation order

1. **Assets land** → `map-objects-v1.ts` + `EnglishCraftObjectsLayer` (static props)
2. **Storage schema** + extend initial storage when game starts
3. **2A** challenge/answer APIs + MC modal + wood HUD
4. **2B** craft APIs + bridge unlock + collision toggle
5. **2C** flag zone + victory + phase transition
6. Unit tests for challenge validation + pool math; manual two-browser pass

---

## 9. Open decisions (resolve before coding 2A)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | Tree cooldown duration | 30s per node |
| 2 | Interact radius | 64px (1 tile width) |
| 3 | MC wrong answer retry | Same challenge until expired; no wood |
| 4 | Flag requires all players north? | No — any one touch wins (co-op) |
| 5 | Depleted tree visual | Stump asset vs dimmed tree |

---

## 10. Doc cross-references

- Product framing: [product-framing.md](./product-framing.md)
- Architecture / API detail: [architecture.md](./architecture.md) §4–6
- Long-term MVP scope: [mvp-scope.md](./mvp-scope.md) (note: phase numbering there predates coin reorder — follow README milestone map)

**When Phase 2 is accepted:** Update README milestone table and mark Phase 2 checkboxes in `mvp-scope.md`.

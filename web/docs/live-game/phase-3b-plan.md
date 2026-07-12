# Live Game — Phase 3B Plan (Carry & Pool Schema)

**Status:** Implemented ✅  
**Prepared:** 2026-07-12  
**Implemented:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization`  
**Depends on:** Phase 3A ✅ (question bank, art, map scaffold)  
**Delivers:** `playerCarry` Storage, four-resource pool schema, carry visuals, server helpers — **no harvest/deposit behavior change**

---

## Approval summary

Phase 3B lays the **data and rendering foundation** for the carry loop. Students still get +1 wood directly to the team pool when they answer correctly at a tree (v0.1 behavior). After 3B, the schema, hooks, and sprites exist so Phase 3C can flip harvest to “grant carry” and Phase 3D can flip deposit to “spell → pool.”

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Low–medium — Storage schema extension; must not break active sessions |
| **Blocks** | Phase 3C (harvest → carry), 3D (deposit + spell) |
| **Regression guard** | Wood-only harvest + bridge + flag path must still pass all tests |

---

## 1. Baseline after Phase 3A

| Area | State |
| --- | --- |
| Map | 20 nodes (wood/stone/wheat/cotton) + 4 empty storages rendered |
| Question set | `grade56-adjectives` default; 60 MC + spell metadata stored server-side |
| `resourcePool` | `{ wood: number }` only |
| `playerCarry` | Does not exist |
| Harvest API | Wood trees only; correct MC → `awardWoodForNode` → pool +1 |
| Presence | Position, facing, walk, avatarId — no carry field |
| HUD | Wood counter only (`LiveGameTeamHud`) |

---

## 2. Goals

1. Add **`playerCarry`** to Liveblocks Storage — authoritative per-player carry state.
2. Extend **`resourcePool`** to four resources (all start at 0; only wood increments in gameplay until 3D).
3. Mirror carry type on **Presence** so remote players see what others are hauling.
4. Render **carry sprite** above local and remote avatars when carrying.
5. Add **server read/write helpers** and **client hooks** consumed by 3C/3D.
6. Reset carry + four-pool on round start/end (gameplay reset).

---

## 3. Explicitly out of scope (Phase 3B)

| Item | Phase |
| --- | --- |
| Harvest MC → carry instead of pool | **3C** |
| Block harvest while carrying (API) | **3C** |
| Harvest stone/wheat/cotton nodes | **3C** |
| Deposit + spell modal at storage | **3D** |
| Storage fill visuals from pool counts | **3E** |
| Four-resource team HUD | **3E** |
| Multi-resource craft thresholds | **3F** |
| Change `awardWoodForNode` behavior | **3C** |

---

## 4. Locked rules (carry model)

| Rule | Value |
| --- | --- |
| Max carry per player | **1 unit** |
| Carry contents | `resourceType`, `sourceNodeId`, `questionId`, `harvestedAt` |
| No carry in lobby | `playerCarry` map empty whenever `phase === "lobby"` |
| Carry survives reconnect | Keyed by stable `playerId` (auth user or guest cookie id) |
| Presence mirror | `carriedResourceType: null \| "wood" \| "stone" \| "wheat" \| "cotton"` |
| Movement while carrying | Enabled (no speed change in pilot) |
| Host can carry | Yes — same rules as students |

---

## 5. Storage schema changes

### 5.1 Extend `LiveGameResourcePool`

```ts
export type LiveGameResourcePool = {
  wood: number;
  stone: number;
  wheat: number;
  cotton: number;
};

export const EMPTY_LIVE_GAME_RESOURCE_POOL: LiveGameResourcePool = {
  wood: 0,
  stone: 0,
  wheat: 0,
  cotton: 0,
};
```

**Backward compatibility:** Server and client readers use `?? 0` for missing keys so older in-flight rooms (wood-only pool) do not crash.

### 5.2 New `LiveGamePlayerCarry`

```ts
export type LiveGamePlayerCarry = {
  resourceType: LiveGameResourceType;
  sourceNodeId: string;
  questionId: string;
  harvestedAt: number;
};
```

Stored as:

```ts
playerCarry: LiveMap<string, LiveObject<LiveGamePlayerCarry>>
```

- **Absent entry** = not carrying.
- **Present entry** = carrying exactly one unit of `resourceType`.
- `questionId` links harvest MC → deposit spell word (Phase 3D).

### 5.3 Extend `LiveGameStorageRoot` / `LiveGameStorageSnapshot`

Add optional `playerCarry?: Record<string, LiveGamePlayerCarry>` to snapshot type.

### 5.4 Extend `LiveGamePresence`

```ts
export type LiveGamePresence = {
  x: number;
  y: number;
  direction: LiveGameDirection;
  isMoving: boolean;
  animation: LiveGameAnimation;
  avatarId: string;
  carriedResourceType: LiveGameResourceType | null;
};
```

Update `DEFAULT_LIVE_GAME_PRESENCE` with `carriedResourceType: null`.

### 5.5 Pool goals (constants only — HUD in 3E)

Add to `gameplay-v1.ts` (used by 3F craft gates; referenced in tests now):

```ts
export const ENGLISH_CRAFT_RESOURCE_GOALS = {
  wood: 10,
  stone: 5,
  wheat: 5,
  cotton: 5,
} as const;

export const ENGLISH_CRAFT_STORAGE_FILL_THRESHOLDS = {
  half: 1,
  full: 5,
} as const;
```

`ENGLISH_CRAFT_WOOD_GOAL` remains as alias to `RESOURCE_GOALS.wood` for existing imports.

### 5.6 Storage fill helper (wire logic, render in 3E)

```ts
function resolveStorageFillLevel(
  count: number,
  thresholds = ENGLISH_CRAFT_STORAGE_FILL_THRESHOLDS,
): StorageFillLevel {
  if (count <= 0) return "empty";
  if (count >= thresholds.full) return "full";
  return "half";
}
```

Lives in `english-craft-art.ts` or new `resource-pool.ts`. Storages still render **empty** in UI until 3E passes real counts.

---

## 6. Server module: `player-carry.ts`

New file: `web/lib/live-game/server/player-carry.ts`

| Function | Purpose |
| --- | --- |
| `readPlayerCarry(storage, playerId)` | Returns carry or `null` |
| `isPlayerCarrying(storage, playerId)` | Boolean gate for harvest (used in 3C) |
| `setPlayerCarry(roomId, playerId, carry)` | Mutate Storage — internal / test / 3C |
| `clearPlayerCarry(roomId, playerId)` | Remove map entry — 3D / reset |
| `clearAllPlayerCarry(storage)` | Called from `gameplay-reset` |

**3B exposes helpers + unit tests.** Production harvest route does **not** call `setPlayerCarry` until 3C.

### 6.1 Extend `read-storage.ts`

| Function | Purpose |
| --- | --- |
| `readResourcePool(snapshot)` | Returns full pool with zero defaults |
| `getPoolCount(snapshot, type)` | Single resource accessor |

Update `canStartCraftChallenge` to read pool via `readResourcePool` (wood check unchanged).

### 6.2 Extend `gameplay-reset.ts`

On round reset (`start`, `return_to_lobby`, `end_round`):

1. Set all four pool counts to `0`.
2. Replace `resourceNodes` (existing).
3. **Clear entire `playerCarry` map** (new).
4. Bridge / victory reset (existing).

### 6.3 Extend `initial-storage.ts`

```ts
resourcePool: new LiveObject({ wood: 0, stone: 0, wheat: 0, cotton: 0 }),
playerCarry: new LiveMap(),
```

---

## 7. Client hooks & presence sync

### 7.1 New hooks (`useLiveGameGameplay.ts`)

| Hook | Returns |
| --- | --- |
| `useLiveGameFullResourcePool()` | `{ wood, stone, wheat, cotton }` with zero defaults |
| `useLiveGamePlayerCarry(playerId?)` | `LiveGamePlayerCarry \| null` for self or given id |
| `useLiveGameSelfCarry()` | Shorthand: carry for `useSelf().id` |

Keep **`useLiveGameResourcePool()`** returning `wood` number only — avoids breaking `LiveGameCanvas` until 3E rewrites HUD.

### 7.2 Presence sync (`useLocalMovement.ts` or new `useLiveGameCarryPresence.ts`)

When local player's Storage carry changes:

```ts
updatePresence({ carriedResourceType: carry?.resourceType ?? null });
```

- Sync on carry change and when movement disables (force idle carry state).
- Do not throttle separately — piggyback on existing presence interval when moving; force update when carry toggles.

### 7.3 Remote players (`useRemotePlayers.ts`)

Extend `RemotePlayerState`:

```ts
carriedResourceType: LiveGameResourceType | null;
```

Read from `other.presence.carriedResourceType` (default `null` if missing).

---

## 8. Carry visual component

### 8.1 New `LiveGameCarryOverlay.tsx`

- Props: `resourceType: LiveGameResourceType`, `map`, optional `imperativePosition`
- Renders `resolveCarryArt(resourceType)` (~32px) offset above character head
- Used inside `LocalPlayer` and `RemotePlayer` when `carriedResourceType != null`

### 8.2 Component changes

| File | Change |
| --- | --- |
| `LocalPlayer.tsx` | Optional `carriedResourceType` prop → overlay |
| `RemotePlayer.tsx` | Overlay from `player.carriedResourceType` |
| `LiveGameMapStage.tsx` | Pass self carry from hook into `LocalPlayer` |
| `useLocalMovement.ts` | Accept `carriedResourceType` for presence publish |

### 8.3 3B visual state

Carry overlay **never shows in production flow** until 3C grants carry. Optional **dev-only** test hook (behind `NODE_ENV === "development"` or omitted) to seed carry for sprite QA — **not required** if unit tests cover overlay render.

---

## 9. API & challenge store (prep only)

### 9.1 Challenge record — no DB migration in 3B

Existing `live_game_challenges` table stays as-is. `questionId` already stored; sufficient for carry → spell link.

### 9.2 Answer route response shape (document for 3C)

Current:

```json
{ "correct": true, "resourceAwarded": { "type": "wood", "amount": 1 }, "poolTotal": { "wood": 3 } }
```

Phase 3C target:

```json
{ "correct": true, "carryGranted": { "type": "wood", "sourceNodeId": "tree-01" }, "poolTotal": { "wood": 3, "stone": 0, ... } }
```

3B: add TypeScript **response types** in `lib/live-game/api-types.ts` (or colocated types file) documenting both shapes; routes unchanged.

### 9.3 `award-wood.ts` — no behavioral change

Add comment + export type alias `AwardCarryResult` mirroring future `award-carry.ts` signature for 3C copy-refactor.

---

## 10. File change list

### New files

| File | Purpose |
| --- | --- |
| `web/lib/live-game/server/player-carry.ts` | Carry Storage mutations + reads |
| `web/lib/live-game/server/resource-pool.ts` | Pool read/normalize + fill level helper |
| `web/lib/live-game/hooks/useLiveGameCarryPresence.ts` | Sync Storage carry → Presence |
| `web/components/live-game/LiveGameCarryOverlay.tsx` | Carry sprite above avatar |
| `web/lib/live-game/player-carry.test.ts` | Server carry helper tests |
| `web/lib/live-game/resource-pool.test.ts` | Pool normalization + fill level tests |
| `web/lib/live-game/english-craft-phase-3b.test.ts` | Integration: reset clears carry, schema defaults |
| `web/docs/live-game/phase-3b-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `liveblocks/config.ts` | Pool, carry, presence types |
| `liveblocks/initial-storage.ts` | Four-pool + empty `playerCarry` map |
| `liveblocks/gameplay-reset.ts` | Reset four pool + clear carry |
| `server/read-storage.ts` | `readResourcePool`, pool accessors |
| `hooks/useLiveGameGameplay.ts` | Full pool + carry hooks |
| `hooks/useLocalMovement.ts` | Publish `carriedResourceType` |
| `hooks/useRemotePlayers.ts` | Read carry from presence |
| `modes/english-craft/gameplay-v1.ts` | Resource goals + storage thresholds |
| `components/live-game/LocalPlayer.tsx` | Carry overlay |
| `components/live-game/RemotePlayer.tsx` | Carry overlay |
| `components/live-game/LiveGameMapStage.tsx` | Wire carry into local player |
| `english-craft-phase-2b.test.ts` | Pool fixtures include four keys |
| `docs/live-game/README.md` | Link Phase 3B plan |

### Unchanged (verified)

| File | Why |
| --- | --- |
| `app/api/live-game/answer/route.ts` | Still awards wood to pool (3C) |
| `app/api/live-game/challenge/route.ts` | Still wood trees only (3C) |
| `LiveGameCanvas.tsx` interact logic | Unchanged until 3C |
| `LiveGameTeamHud.tsx` | Wood-only until 3E |
| `EnglishCraftObjectsLayer.tsx` | Storages still empty until 3E |

---

## 11. Tests

### `player-carry.test.ts`

- `readPlayerCarry` returns null when map missing or player absent
- `setPlayerCarry` + `clearPlayerCarry` round-trip (mock mutator or storage snapshot)
- `clearAllPlayerCarry` removes all entries

### `resource-pool.test.ts`

- `readResourcePool` zero-fills missing stone/wheat/cotton on legacy `{ wood: 3 }`
- `resolveStorageFillLevel` returns empty / half / full at thresholds

### `english-craft-phase-3b.test.ts`

- `createLiveGameInitialStorage` includes four pool keys and `playerCarry`
- `resetEnglishCraftGameplayState` zeros all pool resources and clears carry
- `DEFAULT_LIVE_GAME_PRESENCE.carriedResourceType === null`

### Regression

- All 77+ existing `lib/live-game` tests pass
- `canStartCraftChallenge` still gates on wood ≥ 10 only

---

## 12. Acceptance criteria

### Schema

- [ ] New sessions initialize `resourcePool` with `{ wood: 0, stone: 0, wheat: 0, cotton: 0 }`
- [ ] New sessions initialize empty `playerCarry` map
- [ ] Round reset clears carry and zeros all four pool counts

### Client

- [ ] `useLiveGameFullResourcePool()` returns four numbers
- [ ] `useLiveGameSelfCarry()` returns `null` during normal play (pre-3C)
- [ ] Local presence includes `carriedResourceType: null` by default
- [ ] Remote player reader tolerates missing `carriedResourceType` on old presence

### Visual

- [ ] `LiveGameCarryOverlay` renders correct sprite per resource type (unit or snapshot test)
- [ ] No visible overlay during normal v0.1 gameplay

### Regression

- [ ] Wood harvest → pool +1 still works
- [ ] Craft bridge + flag win still works
- [ ] All live-game tests pass

### Manual smoke (3B)

| Step | Action | Expected |
| --- | --- | --- |
| 1 | Start game | No carry sprites; wood HUD unchanged |
| 2 | Chop tree (correct) | Pool +1 wood; still no carry sprite |
| 3 | Play again / end round | Pool zeros; no stale carry in Storage (dev panel if available) |
| 4 | (Optional dev seed) Force carry via test mutator | Local + remote see carry sprite |

---

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Legacy rooms with `{ wood: N }` only | `readResourcePool` zero-fills missing keys everywhere |
| Presence desync from Storage | Storage authoritative; force presence update on carry change |
| `playerCarry` map grows with guests | Max 6 players; entries deleted on reset / deposit (3D) |
| Extending Presence breaks Liveblocks typing | Update `liveblocks.config.ts` + `DEFAULT_LIVE_GAME_PRESENCE` |
| Accidentally shipping carry in harvest | 3B PR checklist: `awardWoodForNode` diff must not change pool logic |

---

## 14. Implementation order

```
1. Types: config.ts (pool, carry, presence)
2. gameplay-v1.ts goals + resource-pool.ts helpers + tests
3. initial-storage.ts + gameplay-reset.ts + tests
4. server/player-carry.ts + read-storage.ts extensions + tests
5. Client hooks (full pool, self carry)
6. useLiveGameCarryPresence + useLocalMovement presence field
7. LiveGameCarryOverlay + LocalPlayer + RemotePlayer + MapStage wiring
8. Update phase-2b test fixtures; full test suite
9. README link; mark phase-3b-plan implemented
```

---

## 15. What comes next

| Phase | Delivers |
| --- | --- |
| **3C** | `awardCarryForNode`; harvest all node types; block harvest while carrying; challenge route generalizes |
| **3D** | `deposit/challenge` + `deposit/answer`; spell modal; pool increment on correct spell |
| **3E** | Four-resource HUD; storage fill sprites; carry indicator chip |
| **3F** | Multi-resource craft thresholds; updated victory stats |

---

## 16. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 3B scope: schema + visuals only, no harvest change | Yes | ☐ |
| 2 | `playerCarry` in Storage (not Presence-only) | Yes | ☐ |
| 3 | Presence mirror `carriedResourceType` for remotes | Yes | ☐ |
| 4 | Four pool keys always initialized to 0 | Yes | ☐ |
| 5 | Pool goals: wood 10, stone/wheat/cotton 5 each | Yes | ☐ |
| 6 | Storage fill thresholds: half≥1, full≥5 | Yes | ☐ |
| 7 | Keep `useLiveGameResourcePool()` as wood-only shorthand | Yes | ☐ |
| 8 | No dev-only carry seed in production build | Yes | ☐ |

---

**Submitted for approval.** Reply with changes or **approved** to begin implementation.

# Live Game — Phase 4D Plan (Hunger & Bread)

**Status:** Implemented  
**Prepared:** 2026-07-12  
**Implemented:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization` (or follow-on)  
**Depends on:** Phase 4C ✅ · Phase 4G partial ✅ (letter tiles shipped; carry scale still open)  
**Delivers:** Per-player hunger decay, `craft_bread` recipe, eat-bread consume API, survival HUD + movement debuff — **still no win path until 4E**

---

## Approval summary

Phase 4D is **step 4 of 7** in the Phase 4 milestone loop. While the team grinds hammers and boat resources, each player’s **hunger meter decays**. They craft **bread** at the bench (personal inventory) and **eat** to refill. Starvation slows movement but does not eliminate players.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Medium — first per-player mutable state with server reconciliation |
| **Blocks** | 4E boat boarding win (hunger adds classroom tension during boat prep) |
| **Regression guard** | Harvest → carry → deposit → bench recipes unchanged; hunger resets on `start` / `return_to_lobby` |

> **Pilot note:** After 4D, the full survival loop works except **win** (4E) and **cleanup** (4F). Smoke test: hunger drops, bread restores, starving player moves slower.

---

## 1. Baseline after Phase 4C + partial 4G

| Area | State |
| --- | --- |
| Recipes | `build_bench`, `craft_hammer`, `craft_boat` |
| Bench picker | Hammer + Boat rows when `benchBuilt && !boat` |
| `playerHunger` / `playerInventory` | Schema + read helpers exist; **no gameplay writes yet** |
| Hunger on reset | `clearAllPlayerHunger` clears map keys — **does not seed 100 on join** |
| `craft_bread` | Not in `craft-recipes-v1.ts` |
| Consume API | Does not exist |
| HUD | Team resources + hammers; **no hunger bar or bread count** |
| Movement | Fixed `EXPLORE_SCENE_MOVE_SPEED_PX_PER_SEC` (200) for all players |
| Win path | Flag touch disabled; boat at dock after craft; no boarding detection |
| Deposit spell | Letter tiles + hint (4G) ✅ |
| Carry scale | Still **32px** overlay / **16px** HUD chip (4G tail) |

---

## 2. Goals (Phase 4D only)

1. **`craft_bread`** — 2 wheat → `bread +1` to **crafter’s** `playerInventory` (not team pool).
2. **Server hunger decay** — reconcile `playerHunger.value` from `lastUpdatedAt` on read/mutate.
3. **`POST /api/live-game/consume`** — eat 1 bread → hunger = 100, decrement inventory.
4. **Client survival UX** — hunger bar, bread count, eat action, low-hunger warning, movement −40% at 0.
5. **Bench picker** — add **Craft bread** row (between Hammer and Boat).
6. **Tests** — decay math, bread craft → inventory, consume restores hunger, gates.

### Explicitly out of scope (4D)

| Item | Phase |
| --- | --- |
| Boat boarding win | **4E** |
| Victory overlay escape stats | **4E** |
| Remove bridge/flag dead code | **4F** |
| Carry icon 48px / 24px | **4G tail** (can land in same PR if quick) |
| Hunger elimination / PvP bread steal | Out |
| New question bank for bread craft | Reuse sentence-order craft question (pilot) |
| Teacher hunger tuning UI | Out |

---

## 3. Locked rules

### 3.1 Hunger

| Rule | Value |
| --- | --- |
| Meter | 0–100 per player |
| Start | 100 when player first needs hunger (lazy init on read or first mutate) |
| Decay | −1 every **45 seconds** while `session.phase === "playing"` |
| Low warning | HUD warning when ≤ **30** |
| Starving | ≤ **0** → movement speed × **0.6** (−40%) |
| Restore | Eat 1 bread → hunger = **100**, `lastUpdatedAt = now` |
| Authority | Server reconciles on consume, craft answer, and any API that reads hunger |

### 3.2 `craft_bread`

| Field | Value |
| --- | --- |
| `recipeId` | `"craft_bread"` |
| Label | Craft bread |
| Pool cost | **2 wheat** |
| Crafted cost | — |
| Grants | `breadToCrafter: 1` |
| Requires | `benchBuilt: true`, `boatNotBuilt: true` |
| Question | Reuse `ENGLISH_CRAFT_CRAFT_QUESTION_ID` |
| Repeat | Yes — until boat built |

### 3.3 Eat bread (`consume`)

| Field | Value |
| --- | --- |
| Route | `POST /api/live-game/consume` |
| Body | `{ roomId, item: "bread" }` |
| Preconditions | `phase === "playing"`; `playerInventory.bread >= 1` |
| Effect | `bread -= 1`; `playerHunger.value = 100`; `lastUpdatedAt = now` |
| Client trigger | **Eat** button in HUD when `bread > 0` (show always; optional: highlight when hunger ≤ 50) |
| Idempotency | Optional `consumeReceiptId` later; pilot: single in-flight guard on client |

### 3.4 Constants (`gameplay-v1.ts`)

```ts
export const ENGLISH_CRAFT_BREAD_COSTS = { wheat: 2 } as const;
export const ENGLISH_CRAFT_HUNGER_MAX = 100;
export const ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS = 45_000;
export const ENGLISH_CRAFT_HUNGER_DECAY_AMOUNT = 1;
export const ENGLISH_CRAFT_HUNGER_LOW_WARNING = 30;
export const ENGLISH_CRAFT_HUNGER_STARVING_SPEED_MULTIPLIER = 0.6;
```

---

## 4. Server design

### 4.1 `server/hunger.ts` (new)

```ts
export function reconcilePlayerHunger(
  hunger: LiveGamePlayerHunger,
  now: number,
  playing: boolean,
): LiveGamePlayerHunger;

export function isPlayerStarving(hunger: LiveGamePlayerHunger, now: number, playing: boolean): boolean;
```

**Decay algorithm:**

1. If `!playing`, return hunger unchanged (no decay in lobby/completed).
2. If `lastUpdatedAt === 0`, treat as `now` (first touch).
3. `elapsed = now - lastUpdatedAt`
4. `ticks = Math.floor(elapsed / DECAY_INTERVAL_MS)`
5. `newValue = max(0, value - ticks * DECAY_AMOUNT)`
6. `newLastUpdatedAt = lastUpdatedAt + ticks * DECAY_INTERVAL_MS` (or `now` if ticks > 0)

Call `reconcilePlayerHunger` inside:

- `awardCraftRecipe` (before gate checks — starving crafter still crafts)
- `awardConsumeBread` (new)
- `readPlayerHunger` wrapper used by API routes (or reconcile at route entry)

### 4.2 Extend `award-craft-recipe.ts`

When `grants.breadToCrafter`:

1. Resolve `playerId` from challenge record (already have player on challenge).
2. Get/create `playerInventory` LiveObject for `playerId`.
3. `bread += grants.breadToCrafter`.
4. Extend craft receipt snapshot with optional `breadGranted` for idempotent replay.

**Challenge route** must pass `playerId` into award (already does via challenge store).

### 4.3 `server/award-consume.ts` (new)

```ts
export async function awardConsumeBread(input: {
  roomId: string;
  playerId: string;
}): Promise<{ bread: number; hunger: number } | null>;
```

Mutate:

1. Reconcile hunger first.
2. If `inventory.bread < 1` → return null (409 at route).
3. `bread -= 1`, `hunger = { value: 100, lastUpdatedAt: now }`.

### 4.4 `craft-recipes-v1.ts` changes

- Add `"craft_bread"` to `CraftRecipeId`.
- Add `ENGLISH_CRAFT_CRAFT_BREAD_RECIPE`.
- Include in `listBenchCraftRecipes` when `benchBuilt && !boat`.
- `getDefaultBenchRecipe`: priority order remains build_bench → hammer → **bread** (if hungry/low wheat?) → boat — **pilot: hammer before bread before boat** (same as hammer-first default).

### 4.5 Player join / round start hunger seed

On `gameplay-reset.ts` / round start: `clearAllPlayerHunger` (already).

On first hunger read for a connected player during `playing`:

- If no entry, client displays 100; server creates `{ value: 100, lastUpdatedAt: now }` on first consume/craft/reconcile write.

Optional: seed hunger in `join` route or presence handler — **defer unless HUD flickers**; `useLiveGameHunger` can default to 100 client-side until storage syncs.

### 4.6 API routes

| Route | Change |
| --- | --- |
| `craft/challenge` | Accept `recipeId: "craft_bread"` (already generic) |
| `craft/answer` | Return `inventory?: { bread: number }` on bread craft |
| **New** `consume/route.ts` | Eat bread endpoint |

---

## 5. Client design

### 5.1 `hooks/useLiveGameHunger.ts` (new)

- Subscribe to `playerHunger[selfId]` from storage snapshot.
- Tick local display every 1s: apply client-side decay **preview** using same constants (cosmetic; server wins on mutate).
- Expose `{ value, isLow, isStarving }`.

### 5.2 `hooks/useLiveGamePlayerInventory.ts` (new)

- Subscribe to `playerInventory[selfId]`.
- Expose `{ bread }`.

### 5.3 `LiveGameWoodHud.tsx`

Add personal strip (top-right or below team HUD):

| Element | Detail |
| --- | --- |
| Hunger bar | 0–100 fill; yellow ≤ 30; red pulse at 0 |
| Bread chip | Icon + count when `bread > 0` |
| Eat button | Calls `/api/live-game/consume`; disabled when `bread === 0` or submitting |

### 5.4 `LiveGameCraftRecipePicker.tsx`

Add **Craft bread** row:

- Cost: 2 wheat
- Disabled reason: "Need 2 wheat in the team pool"

### 5.5 `LiveGameCanvas.tsx` subtitles

| State | Copy |
| --- | --- |
| `hunger ≤ 30` | You're getting hungry — craft bread at the workbench |
| `hunger === 0` | Starving — movement slowed. Eat bread or craft more. |
| (existing bench/boat subtitles unchanged) |

### 5.6 Movement debuff

In `useLocalMovement` (or `tickMovement`):

- Accept optional `speedMultiplier` (default 1).
- When `isStarving`, pass `ENGLISH_CRAFT_HUNGER_STARVING_SPEED_MULTIPLIER`.
- Scale effective `dtSec` or speed constant — **do not change remote interpolation** (remotes use their own hunger later if desired; pilot: local only).

### 5.7 Interact priority (4D update)

1. Deposit (if carrying)
2. Craft at bench
3. Harvest
4. Eat bread — **HUD button only** for pilot (not map interact)

---

## 6. File checklist

### New files

| File | Purpose |
| --- | --- |
| `server/hunger.ts` | Decay reconcile helpers |
| `server/award-consume.ts` | Eat bread mutate |
| `app/api/live-game/consume/route.ts` | Consume endpoint |
| `hooks/useLiveGameHunger.ts` | Client hunger display |
| `hooks/useLiveGamePlayerInventory.ts` | Bread count |
| `english-craft-phase-4d.test.ts` | Decay, bread craft, consume |

### Modified files

| File | Change |
| --- | --- |
| `craft-recipes-v1.ts` | `craft_bread` recipe + list helpers |
| `gameplay-v1.ts` | Hunger + bread constants |
| `award-craft-recipe.ts` | `breadToCrafter` grant + receipt |
| `craft/answer/route.ts` | Return inventory on bread craft |
| `LiveGameCraftRecipePicker.tsx` | Bread row |
| `LiveGameWoodHud.tsx` | Hunger bar + bread + eat |
| `LiveGameCanvas.tsx` | Wire hooks, subtitle, speed multiplier |
| `useLocalMovement.ts` | Optional `speedMultiplier` |
| `engine/movement.ts` | Pass multiplier into tick (or scale dt) |
| `liveblocks/config.ts` | Extend craft receipt type if needed |

### Optional same PR (4G tail)

| File | Change |
| --- | --- |
| `gameplay-v1.ts` | `ENGLISH_CRAFT_CARRY_OVERLAY_SIZE_PX = 48`, `ENGLISH_CRAFT_CARRY_HUD_ICON_PX = 24` |
| `LiveGameCarryOverlay.tsx`, `LocalPlayer.tsx`, `RemotePlayer.tsx`, `LiveGameWoodHud.tsx` | Apply constants |

---

## 7. Tests (`english-craft-phase-4d.test.ts`)

| Test | Assert |
| --- | --- |
| `reconcilePlayerHunger` | 90s playing → −2 hunger; lobby → no decay |
| `reconcilePlayerHunger` | Never below 0 |
| `craft_bread` gate | Requires `benchBuilt`; blocked after `boat` |
| `craft_bread` afford | 409 when wheat < 2 |
| Bread grant | Inventory +1, pool wheat −2, pool unchanged for bread type |
| `awardConsumeBread` | bread −1, hunger = 100 |
| Consume gate | 409 when bread = 0 |
| Client recipe list | `craft_bread` appears when bench built |

**Target:** 146+ tests passing in `lib/live-game`.

---

## 8. Implementation order (recommended)

1. **Constants** — `gameplay-v1.ts` hunger/bread numbers  
2. **`server/hunger.ts`** + unit tests  
3. **`craft_bread` recipe** + extend `award-craft-recipe` for inventory grant  
4. **`award-consume.ts`** + `consume/route.ts`  
5. **Client hooks** — hunger + inventory  
6. **HUD** — bar, bread, eat button  
7. **Recipe picker** — bread row  
8. **Movement debuff** — speed multiplier  
9. **Subtitles + manual smoke**  
10. **(Optional)** 4G carry scale constants  

---

## 9. Manual smoke (4D)

| Step | Expected |
| --- | --- |
| 1. Start game | Hunger bar 100; no bread |
| 2. Wait ~90s | Hunger ~98; warning at ≤ 30 |
| 3. Deposit wheat, craft bread | Pool −2 wheat; bread chip shows 1 |
| 4. Tap Eat | Hunger 100; bread 0 |
| 5. Let hunger hit 0 | Movement noticeably slower |
| 6. Craft + eat again | Speed returns to normal |
| 7. Build boat (4C flow) | Bread recipe disappears after boat built |
| 8. Play again | Hunger/inventory cleared |

---

## 10. Open tuning knobs (defaults locked for pilot)

| Knob | Default | Tune if… |
| --- | --- | --- |
| Decay interval | 45s | Session feels too long/short |
| Bread cost | 2 wheat | Too many wheat runs |
| Starving speed | 60% | Too punishing in classroom |
| Eat via HUD only | Yes | Could add map interact later |

---

## 11. Approval checklist

| # | Decision | Default | Approved? |
| --- | --- | --- | --- |
| 1 | 4D scope: hunger + bread only | Yes | ☐ |
| 2 | Bread: 2 wheat → 1 personal bread | Yes | ☐ |
| 3 | Decay: −1 / 45s while playing | Yes | ☐ |
| 4 | Starving: −40% speed, no elimination | Yes | ☐ |
| 5 | Eat via HUD button + consume API | Yes | ☐ |
| 6 | Reuse sentence craft question for bread | Yes | ☐ |
| 7 | Include 4G carry scale in same PR if time | Optional | ☐ |

---

**Next after 4D:** [phase-4e-plan.md](./phase-4e-plan.md) — boat boarding win.

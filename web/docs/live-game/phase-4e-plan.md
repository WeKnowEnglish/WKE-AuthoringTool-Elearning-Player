# Live Game — Phase 4E Plan (Boat Boarding Win)

**Status:** Implemented  
**Prepared:** 2026-07-12  
**Implemented:** 2026-07-12  
**Depends on:** Phase 4C ✅ (boat craft + `boat_boarding` unlock) · Phase 4D (recommended — survival loop complete)  
**Delivers:** Team escape win condition — **replaces bridge/flag path**

---

## Approval summary

Phase 4E closes the Phase 4 loop: when the boat is built, **all connected players** stand in the dock boarding zone for **2 consecutive seconds** → team victory.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Medium — multi-player zone detection + dwell timer |
| **Blocks** | Classroom pilot of full milestone loop |
| **Regression guard** | Harvest → deposit → craft unchanged; flag touch stays disabled |

---

## 1. Baseline entering 4E

| Area | State (expected after 4D) |
| --- | --- |
| Boat craft | Sets `craftedItems.boat` + `unlockedObjects.boat_boarding` |
| Dock zone | `ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1` defined in `map-objects-v1.ts` |
| Win API | `completeLiveGameObjective` still checks **bridge + river_crossing** |
| Flag hook | `useLiveGameFlagTouch` wired but `enabled: false` |
| Victory overlay | Phase 3F stats (trees/resources); not escape-themed |
| Lobby copy | Partially updated for milestones; boarding step may say "coming soon" |

---

## 2. Goals (Phase 4E only)

1. **`useLiveGameBoatBoarding`** — detect all connected players in dock zone for 2s.
2. **Update `complete-objective.ts`** — win on `boat_boarding` + all-on-boat (not bridge).
3. **Boarding UX** — progress overlay: "On the boat: 4/6"; subtitle at dock.
4. **Victory overlay** — escape-themed stats (hammers crafted, bread eaten, resources gathered).
5. **Lobby copy** — final how-to-play list including boarding step.
6. **Disable flag path permanently** — remove `enabled: false` hack by deleting flag hook usage.
7. **Tests** — zone overlap, all-players gate, completion only when boat built.

### Out of scope (4E)

| Item | Phase |
| --- | --- |
| Remove bridge schema / dead files | **4F** |
| Art polish (boat states, water edge) | **4F** |
| Host "force win" for absent students | Out (pilot: all **connected** players only) |

---

## 3. Locked rules

### 3.1 Boarding win

| Rule | Value |
| --- | --- |
| Prerequisite | `unlockedObjects.boat_boarding === true` |
| Zone | `ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1` (AABB overlap with player feet/center) |
| Players required | All **currently connected** players in room (`useOthers` + self) |
| Dwell time | **2 seconds** continuous all-on-boat |
| Reset dwell | Any player leaves zone → timer resets to 0 |
| Completion | `POST /api/live-game/complete` with `{ kind: "boat_escape" }` (extend body) |
| Session | `phase = "completed"`, `objectiveCompleted = true` |

### 3.2 Zone detection

Reuse pattern from `isPlayerTouchingFlagZone` → new `isPlayerInBoatBoardingZone(x, y, zone)`.

Player position: use `playerPositions` from storage (server) or local `sampledPosition` (client hook).

**Client hook loop (~4 Hz):**

1. If `!boat_boarding` or `phase !== "playing"`, idle.
2. Count connected player ids.
3. For each id, check position in zone (storage positions for remotes, local for self).
4. If `onBoatCount === totalCount && totalCount > 0`, accumulate dwell ms.
5. If dwell ≥ 2000ms, call complete API once (in-flight guard).

### 3.3 Complete API change

```ts
// POST /api/live-game/complete
{ roomId, kind?: "boat_escape" }  // default "boat_escape" in Phase 4E
```

`completeLiveGameObjective`:

```ts
if (kind === "boat_escape") {
  if (!unlockedObjects.boat_boarding) return null;
  // optional server-side re-verify all positions in zone
}
// Remove bridge + river_crossing checks
```

---

## 4. Client design

### 4.1 `hooks/useLiveGameBoatBoarding.ts` (new)

Inputs: `roomId`, `enabled`, local position, storage snapshot subscription.

Outputs:

```ts
{
  onBoatCount: number;
  totalPlayers: number;
  dwellProgress: number; // 0–1
  isCompleting: boolean;
}
```

### 4.2 `LiveGameCanvas.tsx`

| State | UI |
| --- | --- |
| `boat_boarding`, near dock | Subtitle: "Get everyone on the boat to escape!" |
| Dwell in progress | Floating banner: "Waiting for team… 4/6 on boat" + progress bar |
| `phase === "completed"` | Victory overlay |

Remove `useLiveGameFlagTouch` import and call.

### 4.3 `LiveGameVictoryOverlay.tsx`

Escape stats (read from storage at victory time):

| Stat | Source |
| --- | --- |
| Resources gathered | Existing victory counters |
| Hammers crafted | `craftedItems.hammers` peak or session counter* |
| Bread eaten | New optional `session.breadEaten` counter (4E add) or omit |
| Hunger lowest | Track `session.lowestHunger` in 4D/4E if easy |

\*Pilot: show final `hammers` count + boat built message if peak not tracked.

### 4.4 `LiveGameStudentLobbyPanel.tsx`

Final how-to-play:

1. Gather wood, stone, wheat, cotton — deposit at storage  
2. Build the workbench (10 wood + 5 stone)  
3. Craft hammers and bread; stay fed  
4. Craft the boat (5 hammers + 20 wood + 10 cotton)  
5. **Get everyone on the boat to escape**

---

## 5. File checklist

### New files

| File | Purpose |
| --- | --- |
| `engine/boat-boarding.ts` | Zone overlap helper |
| `hooks/useLiveGameBoatBoarding.ts` | Dwell detection + complete trigger |
| `english-craft-phase-4e.test.ts` | Zone + completion gates |

### Modified files

| File | Change |
| --- | --- |
| `server/complete-objective.ts` | Boat escape win path |
| `app/api/live-game/complete/route.ts` | Accept `kind` |
| `LiveGameCanvas.tsx` | Boarding hook, remove flag touch |
| `LiveGameVictoryOverlay.tsx` | Escape copy + stats |
| `LiveGameStudentLobbyPanel.tsx` | How-to-play step 5 |
| `map-objects-v1.ts` | Export zone helper if needed |

### Delete / disable in 4E

| File | Action |
| --- | --- |
| `hooks/useLiveGameFlagTouch.ts` | Stop importing in canvas; delete in **4F** |

---

## 6. Tests (`english-craft-phase-4e.test.ts`)

| Test | Assert |
| --- | --- |
| Zone overlap | Player center in rect → true |
| Complete gate | No win without `boat_boarding` |
| Complete gate | No win with `boat_boarding` but bridge path removed |
| Dwell logic (pure fn) | 2s timer resets when count drops |

---

## 7. Manual smoke (4E)

| Step | Expected |
| --- | --- |
| 1. Full 4D session → craft boat | Boat at dock; subtitle mentions boarding |
| 2. One player on dock | "1/N on boat"; no win |
| 3. All players on dock 2s | Victory overlay — team escaped |
| 4. Flag touch | Does nothing |
| 5. Play again | Milestones reset |

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Absent student blocks win | Only count **connected** players |
| Position desync | Use storage `playerPositions` with 5s staleness guard (same as deposit) |
| Double complete | `inFlightRef` + `alreadyCompleted` on hook |

---

**Next after 4E:** [phase-4f-plan.md](./phase-4f-plan.md) — cleanup & pilot polish.

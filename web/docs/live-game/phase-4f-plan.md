# Live Game — Phase 4F Plan (Cleanup & Pilot Polish)

**Status:** Complete (2026-07-12)  
**Prepared:** 2026-07-12  
**Depends on:** Phases 4A–4E ✅  
**Delivers:** Production-ready pilot — dead code removed, docs updated, art/copy polish

---

## Goals

1. **Remove deprecated win path** — bridge craft, `river_crossing`, flag touch, `award-craft-bridge.ts`.
2. **Schema cleanup** — drop `craftedItems.bridge` and `unlockedObjects.river_crossing` (migration in reset + types).
3. **Docs** — update `product-framing.md`, `README.md` milestone map, `architecture.md` complete flow.
4. **Art pass** — water edge tiles, boat empty/built states, hunger icons (if not done in 4D).
5. **4G tail** — carry overlay 48px / HUD 24px if not shipped earlier.
6. **Classroom pilot script** — 20–25 minute run sheet in `mvp-scope.md`.

---

## File removal checklist

| Item | Action |
| --- | --- |
| `award-craft-bridge.ts` | Delete |
| `useLiveGameFlagTouch.ts` | Delete |
| `engine/flag-touch.ts` | Delete or keep for tests only |
| Bridge craft recipe references | Grep and remove |
| `ENGLISH_CRAFT_CRAFT_BRIDGE_V1` in active paths | Keep for tests / legacy question id only |
| Flag zone on map | Leave as decoration (no interact) |
| Internal river collision | Keep as obstacle (per open decision #5) |

---

## Regression

- Full `lib/live-game` suite green  
- `npm run build` clean  
- Manual smoke from phase-4-plan.md §11 (all 11 steps)

---

**Phase 4 complete after 4F.** Phase 5 (coins/shop) remains out of scope per product framing.

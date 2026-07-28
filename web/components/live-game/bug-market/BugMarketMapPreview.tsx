"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExploreSceneDpad } from "@/components/lesson/interactions/explore-scene/ExploreSceneDpad";
import { KidButton } from "@/components/kid-ui/KidButton";
import { resolveLiveGameCharacter } from "@/lib/live-game/characters/live-game-characters";
import {
  createMovementState,
  readKeyboardAxes,
  tickMovement,
  type MovementState,
} from "@/lib/live-game/engine/movement";
import { BUG_MARKET_MAP_V1, BUG_MARKET_MAP_V1_DOCUMENT } from "@/lib/live-game/modes/bug-market/map-v1";
import { getBugMarketMapRegion } from "@/lib/live-game/modes/bug-market/map-schema";
import { BUG_MARKET_ASSETS, BUG_MARKET_SPECIES } from "@/lib/live-game/modes/bug-market/assets";
import {
  BUG_MARKET_STARTER_BUGS,
  BUG_MARKET_STARTING_CAPACITY,
} from "@/lib/live-game/modes/bug-market/state";
import {
  BUG_MARKET_STARTER_NET_RANGE_PX,
  BUG_MARKET_SWING_COOLDOWN_MS,
  doesBugMarketCatchSucceed,
} from "@/lib/live-game/modes/bug-market/catch-rules";

type Props = {
  onReturnToLobby: () => void;
};

const MAP = BUG_MARKET_MAP_V1;
const MAP_DOCUMENT = BUG_MARKET_MAP_V1_DOCUMENT;
const BUG_REGION = getBugMarketMapRegion(MAP_DOCUMENT, "bug_spawn");
const COUNTER_REGION = getBugMarketMapRegion(MAP_DOCUMENT, "counter");
const SHOP_REGION = getBugMarketMapRegion(MAP_DOCUMENT, "upgrade_shop");
const regionStyle = (region: { x: number; y: number; w: number; h: number }) => ({
  left: `${region.x / MAP.widthPx * 100}%`, top: `${region.y / MAP.heightPx * 100}%`,
  width: `${region.w / MAP.widthPx * 100}%`, height: `${region.h / MAP.heightPx * 100}%`,
});
const PLAYER = resolveLiveGameCharacter("girl-1");

export function BugMarketMapPreview({ onReturnToLobby }: Props) {
  const positionRef = useRef<MovementState>(createMovementState(MAP, 0));
  const keysRef = useRef(new Set<string>());
  const touchRef = useRef({ axisX: 0, axisY: 0 });
  const [position, setPosition] = useState<MovementState>(() => createMovementState(MAP, 0));
  const [isMoving, setIsMoving] = useState(false);
  const [availableBugIds, setAvailableBugIds] = useState(() => new Set(BUG_MARKET_STARTER_BUGS.map((bug) => bug.id)));
  const [inventory, setInventory] = useState<string[]>([]);
  const [swinging, setSwinging] = useState(false);
  const [feedback, setFeedback] = useState("Walk near a bug, then swing your net.");
  const lastSwingAtRef = useRef(0);

  const swingNet = useCallback(() => {
    const now = Date.now();
    if (now - lastSwingAtRef.current < BUG_MARKET_SWING_COOLDOWN_MS) return;
    lastSwingAtRef.current = now;
    setSwinging(true);
    window.setTimeout(() => setSwinging(false), 320);

    if (inventory.length >= BUG_MARKET_STARTING_CAPACITY) {
      setFeedback("Display case full — return to your counter.");
      return;
    }
    const nearest = BUG_MARKET_STARTER_BUGS
      .filter((bug) => availableBugIds.has(bug.id))
      .map((bug) => ({ bug, distance: Math.hypot(bug.x - positionRef.current.x, bug.y - positionRef.current.y) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > BUG_MARKET_STARTER_NET_RANGE_PX) {
      setFeedback("Move closer to a bug before swinging.");
      return;
    }
    const clientActionId = globalThis.crypto?.randomUUID?.() ?? `${now}:${nearest.bug.id}`;
    if (!doesBugMarketCatchSucceed({ clientActionId, bug: nearest.bug })) {
      setFeedback(`${nearest.bug.speciesId} escaped — try again!`);
      return;
    }
    setAvailableBugIds((current) => {
      const next = new Set(current);
      next.delete(nearest.bug.id);
      return next;
    });
    setInventory((current) => [...current, nearest.bug.speciesId]);
    setFeedback(`Caught a ${nearest.bug.speciesId}! It is safe in your display case.`);
  }, [availableBugIds, inventory.length]);

  const setTouchAxis = useCallback((axisX: number, axisY: number) => {
    touchRef.current = { axisX, axisY };
  }, []);

  useEffect(() => {
    const movementKeys = new Set([
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s", "A", "D", "W", "S",
    ]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!movementKeys.has(event.key)) return;
      event.preventDefault();
      keysRef.current.add(event.key);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const onSwingKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      swingNet();
    };
    window.addEventListener("keydown", onSwingKey);
    return () => window.removeEventListener("keydown", onSwingKey);
  }, [swingNet]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dtSec = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const keyboard = readKeyboardAxes(keysRef.current);
      const axisX = keyboard.axisX || touchRef.current.axisX;
      const axisY = keyboard.axisY || touchRef.current.axisY;
      const moving = axisX !== 0 || axisY !== 0;
      if (moving) {
        positionRef.current = tickMovement(MAP, positionRef.current, { axisX, axisY, dtSec });
        setPosition({ ...positionRef.current });
      }
      setIsMoving(moving);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-emerald-950 text-white">
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,#a7f3d0,#14532d)] p-2 sm:p-5">
        <div
          className="relative aspect-[16/9] w-full max-w-[1280px] overflow-hidden rounded-2xl border-4 border-emerald-950/60 shadow-2xl"
          style={{
            backgroundColor: MAP_DOCUMENT.terrain.backgroundColor,
            backgroundImage: `url('${MAP_DOCUMENT.terrain.textureUrl}')`,
            backgroundPosition: "left top",
            backgroundRepeat: "repeat",
            backgroundSize: `${MAP_DOCUMENT.terrain.tileSizePx}px ${MAP_DOCUMENT.terrain.tileSizePx}px`,
          }}
        >
          <div className="absolute rounded-[3rem] border-4 border-dashed border-emerald-900/35 bg-emerald-300/10" style={regionStyle(BUG_REGION.displayBounds)}>
            <span className="absolute left-5 top-4 rounded-full bg-emerald-950/75 px-4 py-2 text-xs font-black uppercase tracking-[0.18em]">
              Meadow · bug spawn zone
            </span>
            {BUG_MARKET_STARTER_BUGS.filter((bug) => availableBugIds.has(bug.id)).map((bug) => {
              const species = BUG_MARKET_SPECIES.find((item) => item.id === bug.speciesId);
              if (!species) return null;
              return (
                <div
                  key={bug.id}
                  className="absolute h-14 w-14 sm:h-20 sm:w-20"
                  style={{ left: `${(bug.x / MAP.widthPx) * 100}%`, top: `${(bug.y / MAP.heightPx) * 100}%` }}
                  title={`${species.name} · ${species.rarity}`}
                >
                  <Image src={species.assetUrl} alt={species.name} fill className="object-contain drop-shadow-lg" sizes="80px" unoptimized />
                </div>
              );
            })}
          </div>

          <div className="absolute rounded-3xl border-4 border-amber-950/35 bg-amber-200/70 shadow-inner" style={regionStyle(COUNTER_REGION.displayBounds)}>
            <span className="absolute left-4 top-3 text-xs font-black uppercase tracking-[0.16em] text-amber-950/70">
              Personal counters
            </span>
            <div className="absolute inset-x-3 bottom-1 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((slot) => (
                <div key={slot} className="relative h-20 sm:h-28">
                  <Image src={BUG_MARKET_ASSETS.counterEmpty} alt={`Empty bug counter ${slot}`} fill className="object-contain object-bottom drop-shadow-xl" sizes="240px" unoptimized />
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-amber-950/85 px-2 py-0.5 text-[9px] font-black text-white">
                    Counter {slot}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute flex items-center justify-center rounded-3xl border-4 border-violet-950/40 bg-violet-300/75 text-center text-sm font-black uppercase tracking-[0.16em] text-violet-950 shadow-lg" style={regionStyle(SHOP_REGION.displayBounds)}>
            Upgrade<br />shop
          </div>

          <div
            className="pointer-events-none absolute z-20 h-[14%] w-[8%] min-w-12 -translate-y-1/2 transition-[filter]"
            style={{
              left: `${(position.x / MAP.widthPx) * 100}%`,
              top: `${(position.y / MAP.heightPx) * 100}%`,
              filter: isMoving ? "drop-shadow(0 8px 5px rgba(0,0,0,.28))" : "drop-shadow(0 5px 3px rgba(0,0,0,.22))",
            }}
          >
            <Image src={PLAYER.src} alt="Teacher preview character" fill className="object-contain object-bottom" sizes="100px" unoptimized priority />
            <div
              className={`absolute -right-[48%] top-[20%] h-[65%] w-[85%] origin-bottom-left overflow-hidden transition-transform duration-300 ${swinging ? "rotate-[75deg] scale-110" : "-rotate-[18deg]"}`}
            >
              <Image src={BUG_MARKET_ASSETS.nets} alt="Equipped starter net" width={210} height={140} className="absolute left-0 top-0 h-auto w-[210px] max-w-none -translate-y-3" unoptimized />
            </div>
            <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-full border border-white/50 bg-emerald-950/85 px-2 py-0.5 text-[10px] font-black">
              Ms. Brady
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col p-3 pt-14 sm:p-5 sm:pt-16">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <KidButton type="button" variant="secondary" className="!min-h-10 text-sm" onClick={onReturnToLobby}>
            ← Back to lobby
          </KidButton>
          <span className="rounded-xl bg-black/65 px-3 py-2 text-xs font-black backdrop-blur">
            {feedback}
          </span>
        </div>
        <div className="pointer-events-auto mt-auto flex items-end gap-3">
          <div className="rounded-2xl border-2 border-white/20 bg-black/60 p-1.5">
            <ExploreSceneDpad axisX={0} axisY={0} onAxisChange={setTouchAxis} />
          </div>
          <KidButton type="button" variant="accent" className="!min-h-14 px-6 text-base" onClick={swingNet}>
            Swing net <span className="hidden sm:inline">(Space)</span>
          </KidButton>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-14 z-30 flex items-center gap-2 rounded-2xl border-2 border-white/30 bg-black/65 p-2 pr-4 shadow-xl backdrop-blur sm:right-5 sm:top-16">
        <div className="relative h-14 w-20 overflow-hidden rounded-xl bg-amber-100/15">
          <Image
            src={BUG_MARKET_ASSETS.nets}
            alt="Starter net"
            width={240}
            height={160}
            className="absolute left-0 top-0 h-auto w-[240px] max-w-none -translate-y-4 object-contain"
            unoptimized
          />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-white/60">Equipped</p>
          <p className="text-sm font-black">Starter net</p>
        </div>
      </div>

      <section className="pointer-events-none absolute bottom-3 right-3 z-30 w-64 rounded-2xl border-2 border-white/30 bg-black/70 p-3 shadow-xl backdrop-blur sm:bottom-5 sm:right-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black">Display case</h2>
          <span className="text-xs font-black text-white/70">{inventory.length}/{BUG_MARKET_STARTING_CAPACITY}</span>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {Array.from({ length: BUG_MARKET_STARTING_CAPACITY }, (_, index) => {
            const speciesId = inventory[index];
            const species = BUG_MARKET_SPECIES.find((item) => item.id === speciesId);
            return (
              <div key={index} className="relative aspect-square rounded-lg border border-white/25 bg-white/10">
                {species ? <Image src={species.assetUrl} alt={species.name} fill className="object-contain p-0.5" sizes="36px" unoptimized /> : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

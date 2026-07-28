"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { BugMarketMeadowView } from "@/components/live-game/bug-market/BugMarketMeadowView";
import { tickMovement } from "@/lib/live-game/engine/movement";
import type { RemotePlayerState } from "@/lib/live-game/hooks/useRemotePlayers";
import { BUG_MARKET_MAP_V1 } from "@/lib/live-game/modes/bug-market/map-v1";
import { createBugMarketPilotState, dispatchBugMarketPilotAction, moveBugMarketPilotPlayer, setBugMarketPilotConnection } from "@/lib/live-game/modes/bug-market/pilot-state";

export function BugMarketDeveloperPilot() {
  const [state, setState] = useState(createBugMarketPilotState);
  const [activeId, setActiveId] = useState("aria");
  const [moving, setMoving] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const keys = useRef(new Set<string>());
  const touch = useRef({ axisX: 0, axisY: 0 });
  const movingRef = useRef(false);
  const keyPressedAtRef = useRef(new Map<string, number>());
  const active = state.players[activeId]!;
  const nearestBug = useMemo(() => Object.values(state.bugs).filter((bug) => bug.state === "available").sort((a, b) => Math.hypot(a.x - active.x, a.y - active.y) - Math.hypot(b.x - active.x, b.y - active.y))[0], [active.x, active.y, state.bugs]);

  const movePilotStep = useCallback((axisX: number, axisY: number) => {
    setState((current) => {
      const player = current.players[activeId]; if (!player) return current;
      const next = tickMovement(BUG_MARKET_MAP_V1, player, { axisX, axisY, dtSec: 0.045 });
      return moveBugMarketPilotPlayer(current, activeId, next.x, next.y);
    });
  }, [activeId]);

  useEffect(() => {
    const supported = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d", "W", "A", "S", "D"]);
    const normalize = (key: string) => key.length === 1 ? key.toLowerCase() : key;
    const down = (event: KeyboardEvent) => {
      if (!supported.has(event.key)) return;
      event.preventDefault();
      const key = normalize(event.key);
      keys.current.add(key);
      if (!event.repeat) keyPressedAtRef.current.set(key, performance.now());
    };
    const up = (event: KeyboardEvent) => {
      const key = normalize(event.key);
      keys.current.delete(key);
      const pressedAt = keyPressedAtRef.current.get(key);
      keyPressedAtRef.current.delete(key);
      const axes: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
      const axis = axes[key];
      if (axis && pressedAt !== undefined && performance.now() - pressedAt < 90) movePilotStep(axis[0], axis[1]);
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [movePilotStep]);

  useEffect(() => {
    let frame = 0; let last = performance.now();
    const tick = (now: number) => {
      const keyboardX = (keys.current.has("ArrowRight") || keys.current.has("d") ? 1 : 0) - (keys.current.has("ArrowLeft") || keys.current.has("a") ? 1 : 0);
      const keyboardY = (keys.current.has("ArrowDown") || keys.current.has("s") ? 1 : 0) - (keys.current.has("ArrowUp") || keys.current.has("w") ? 1 : 0);
      const axisX = keyboardX || touch.current.axisX; const axisY = keyboardY || touch.current.axisY;
      if (axisX || axisY) setState((current) => { const player = current.players[activeId]; if (!player) return current; const next = tickMovement(BUG_MARKET_MAP_V1, player, { axisX, axisY, dtSec: Math.min(.05, (now - last) / 1000) }); return moveBugMarketPilotPlayer(current, activeId, next.x, next.y); });
      const activeMovement = Boolean(axisX || axisY);
      if (movingRef.current !== activeMovement) { movingRef.current = activeMovement; setMoving(activeMovement); }
      last = now; frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [activeId]);

  const catchNearest = () => {
    if (!nearestBug) return;
    setSwinging(true); window.setTimeout(() => setSwinging(false), 320);
    setState((current) => dispatchBugMarketPilotAction(current, { id: crypto.randomUUID(), kind: "catch", playerId: activeId, bugId: nearestBug.id }));
  };
  const answerSale = (answerCorrect: boolean) => {
    const item = state.players[activeId]?.inventory[0]; if (!item) return;
    setState((current) => dispatchBugMarketPilotAction(current, { id: crypto.randomUUID(), kind: "sell", playerId: activeId, inventoryItemId: item.id, answerCorrect }));
    if (answerCorrect) setQuestionOpen(false);
  };

  const remotePlayers: RemotePlayerState[] = Object.values(state.players).filter((player) => player.id !== activeId).map((player, index) => ({ connectionId: index + 1, x: player.x, y: player.y, direction: "down", isMoving: false, color: "#3b82f6", name: `${player.name}${player.connected ? "" : " (offline)"}`, avatarId: player.avatarId, carriedResourceType: null }));
  const developerOverlay = <aside className="pointer-events-auto absolute right-3 top-14 z-40 max-h-[62dvh] w-72 overflow-y-auto rounded-2xl border-2 border-cyan-300/40 bg-slate-950/90 p-3 shadow-2xl backdrop-blur sm:right-5 sm:top-16">
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Developer controls · in memory</p>
    <p className="mt-1 text-xs text-white/65">Same renderer as the live game. No Liveblocks or login.</p>
    <div className="mt-3 grid grid-cols-2 gap-2">{Object.values(state.players).map((player) => <button key={player.id} onClick={() => setActiveId(player.id)} className={`rounded-xl border-2 p-2 text-left ${activeId === player.id ? "border-emerald-300 bg-emerald-400/20" : "border-white/15"}`}><b className="text-sm">{player.name}</b><span className="block text-[10px]">{player.coins} coins · {player.inventory.length} bugs</span></button>)}</div>
    <div className="mt-3 space-y-2"><KidButton className="w-full !min-h-9 text-xs" variant={active.connected ? "secondary" : "primary"} onClick={() => setState((current) => setBugMarketPilotConnection(current, activeId, !current.players[activeId]!.connected))}>{active.connected ? "Take active student offline" : "Reconnect and replay queue"}</KidButton><KidButton className="w-full !min-h-9 text-xs" variant="secondary" onClick={() => setState(createBugMarketPilotState())}>Reset in-memory room</KidButton></div>
    <h2 className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/60">Event log</h2><ul className="mt-1 space-y-1 text-[10px] font-semibold">{state.log.slice(0, 5).map((entry, index) => <li key={`${index}:${entry}`} className="rounded bg-white/5 px-2 py-1">{entry}</li>)}</ul>
  </aside>;

  return <BugMarketMeadowView
    bugs={Object.values(state.bugs)} localPlayer={{ name: `${active.name}${active.connected ? "" : " (offline)"}`, avatarId: active.avatarId, x: active.x, y: active.y, moving, swinging }}
    remotePlayers={remotePlayers} inventory={active.inventory} coins={active.coins} netLevel={active.netLevel} feedback={state.log[0] ?? "In-memory meadow ready."}
    saleQuestion={questionOpen ? { prompt: "What is the opposite of ‘hot’?", options: ["cold", "warm", "big", "fast"] } : null}
    onMoveAxis={(axisX, axisY) => { touch.current = { axisX, axisY }; }}
    onSwing={catchNearest} onSell={() => setQuestionOpen(true)}
    onUpgrade={() => setState((current) => dispatchBugMarketPilotAction(current, { id: crypto.randomUUID(), kind: "upgrade", playerId: activeId }))}
    onSaleAnswer={(answer) => answerSale(answer === "cold")} onCloseSale={() => setQuestionOpen(false)} developerOverlay={developerOverlay}
  />;
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorage, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { BugMarketMeadowView } from "@/components/live-game/bug-market/BugMarketMeadowView";
import { createMovementState, directionFromAxes, readKeyboardAxes, tickMovement, type MovementState } from "@/lib/live-game/engine/movement";
import { useRemotePlayers } from "@/lib/live-game/hooks/useRemotePlayers";
import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { BUG_MARKET_SWING_COOLDOWN_MS } from "@/lib/live-game/modes/bug-market/catch-rules";
import { BUG_MARKET_MAP_V1 } from "@/lib/live-game/modes/bug-market/map-v1";
import type { BugMarketCatchReceipt } from "@/lib/live-game/modes/bug-market/state";
import { bugMarketNetRangePx, isNearBugMarketCounter, isNearBugMarketShop } from "@/lib/live-game/modes/bug-market/sale-rules";

const MAP = BUG_MARKET_MAP_V1;

type SaleChallenge = {
  challengeId: string;
  inventoryItemId: string;
  question: { prompt: string; options: string[] };
};

export function BugMarketFoundationGame({ context }: { context: LiveGameSessionContext }) {
  const bugs = useStorage((root) => (root as unknown as LiveGameStorageSnapshot).bugs ?? {});
  const player = useStorage((root) => (root as unknown as LiveGameStorageSnapshot).bugMarketPlayers?.[context.userId] ?? null);
  const lobbyPlayers = useStorage((root) => (root as unknown as LiveGameStorageSnapshot).players ?? {});
  const updatePresence = useUpdateMyPresence();
  const playerMeta = useMemo(() => new Map(Object.entries(lobbyPlayers).map(([id, entry]) => [id, { name: entry.name, color: entry.color }])), [lobbyPlayers]);
  const remotePlayers = useRemotePlayers(playerMeta);
  const positionRef = useRef<MovementState>(createMovementState(MAP, 0));
  const keysRef = useRef(new Set<string>());
  const touchRef = useRef({ axisX: 0, axisY: 0 });
  const lastSwingAtRef = useRef(0);
  const lastPresenceAtRef = useRef(0);
  const movingRef = useRef(false);
  const keyPressedAtRef = useRef(new Map<string, number>());
  const facingRef = useRef<"up" | "down" | "left" | "right">("right");
  const [position, setPosition] = useState(() => createMovementState(MAP, 0));
  const [moving, setMoving] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const [catching, setCatching] = useState(false);
  const [feedback, setFeedback] = useState("Walk near a bug, then swing your net.");
  const [saleChallenge, setSaleChallenge] = useState<SaleChallenge | null>(null);
  const [saleBusy, setSaleBusy] = useState(false);

  const swingNet = useCallback(async () => {
    const now = Date.now();
    if (catching || now - lastSwingAtRef.current < BUG_MARKET_SWING_COOLDOWN_MS) return;
    lastSwingAtRef.current = now;
    setSwinging(true);
    window.setTimeout(() => setSwinging(false), 320);
    const nearest = Object.values(bugs)
      .filter((bug) => bug.state === "available")
      .map((bug) => ({ bug, distance: Math.hypot(bug.x - positionRef.current.x, bug.y - positionRef.current.y) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > bugMarketNetRangePx(player?.netLevel ?? 1)) {
      setFeedback("Move closer to a bug before swinging.");
      return;
    }

    setCatching(true);
    try {
      const roomId = toRoomId(context.sessionId);
      const positionResponse = await fetch("/api/live-game/position", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, x: positionRef.current.x, y: positionRef.current.y }),
      });
      if (!positionResponse.ok) throw new Error("Could not confirm your position.");
      const clientActionId = globalThis.crypto?.randomUUID?.() ?? `${now}:${nearest.bug.id}`;
      const response = await fetch("/api/live-game/bug-market/catch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, bugId: nearest.bug.id, clientActionId }),
      });
      const result = await response.json() as { error?: string; reason?: string; receipt?: BugMarketCatchReceipt };
      if (!response.ok) {
        const messages: Record<string, string> = {
          bug_unavailable: "Another player caught that bug first.", display_case_full: "Your display case is full.",
          cooldown: "Your net needs a moment before another swing.", out_of_range: "That bug moved out of range.",
        };
        throw new Error(messages[result.reason ?? ""] ?? result.error ?? "The catch was not accepted.");
      }
      setFeedback(result.receipt?.outcome === "caught" ? `Caught a ${nearest.bug.speciesId}!` : `${nearest.bug.speciesId} escaped — try again!`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not swing the net.");
    } finally {
      setCatching(false);
    }
  }, [bugs, catching, context.sessionId, player?.netLevel]);

  const syncPosition = useCallback(async () => {
    const response = await fetch("/api/live-game/position", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: toRoomId(context.sessionId), x: positionRef.current.x, y: positionRef.current.y }),
    });
    if (!response.ok) throw new Error("Could not confirm your position.");
  }, [context.sessionId]);

  const openSale = useCallback(async () => {
    const item = player?.inventory[0];
    if (!item || saleBusy) return;
    if (!isNearBugMarketCounter({ ...positionRef.current, updatedAt: Date.now() })) {
      setFeedback("Return to the counter before selling a bug.");
      return;
    }
    setSaleBusy(true);
    try {
      await syncPosition();
      const response = await fetch("/api/live-game/bug-market/sale/challenge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: toRoomId(context.sessionId), inventoryItemId: item.id }),
      });
      const payload = await response.json() as SaleChallenge & { error?: string };
      if (!response.ok || !payload.challengeId || !payload.question) throw new Error(payload.error ?? "Could not open the market question.");
      setSaleChallenge(payload);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not open the market question.");
    } finally { setSaleBusy(false); }
  }, [context.sessionId, player?.inventory, saleBusy, syncPosition]);

  const submitSaleAnswer = useCallback(async (answer: string) => {
    if (!saleChallenge || saleBusy) return;
    setSaleBusy(true);
    try {
      await syncPosition();
      const response = await fetch("/api/live-game/bug-market/sale/answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: toRoomId(context.sessionId), challengeId: saleChallenge.challengeId, answer }),
      });
      const payload = await response.json() as { correct?: boolean; error?: string; receipt?: { coinsAwarded: number } };
      if (!response.ok) throw new Error(payload.error ?? "Could not complete the sale.");
      if (!payload.correct) { setFeedback("Not quite — read the question and try again."); return; }
      setFeedback(`Sale complete! You earned ${payload.receipt?.coinsAwarded ?? 0} coins.`);
      setSaleChallenge(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not complete the sale.");
    } finally { setSaleBusy(false); }
  }, [context.sessionId, saleBusy, saleChallenge, syncPosition]);

  const purchaseNetUpgrade = useCallback(async () => {
    if (saleBusy || (player?.netLevel ?? 1) >= 2) return;
    if (!isNearBugMarketShop({ ...positionRef.current, updatedAt: Date.now() })) { setFeedback("Walk to the upgrade shop before buying the long net."); return; }
    setSaleBusy(true);
    try {
      await syncPosition();
      const response = await fetch("/api/live-game/bug-market/upgrade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: toRoomId(context.sessionId), clientActionId: crypto.randomUUID() }) });
      const payload = await response.json() as { reason?: string; error?: string };
      if (!response.ok) { const messages: Record<string, string> = { not_enough_coins: "You need 4 coins for the long net.", not_at_shop: "Move closer to the upgrade shop.", already_owned: "You already own the long net." }; throw new Error(messages[payload.reason ?? ""] ?? payload.error ?? "Could not buy the net upgrade."); }
      setFeedback("Long net purchased! Your catch range is now 180px.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not buy the net upgrade."); }
    finally { setSaleBusy(false); }
  }, [context.sessionId, player?.netLevel, saleBusy, syncPosition]);

  const moveOneStep = useCallback((axisX: number, axisY: number) => {
    const next = tickMovement(MAP, positionRef.current, { axisX, axisY, dtSec: 0.045 });
    positionRef.current = next;
    facingRef.current = directionFromAxes(axisX, axisY);
    setPosition({ ...next });
    updatePresence({ x: next.x, y: next.y, direction: facingRef.current, isMoving: false, animation: "idle", avatarId: context.avatarId, carriedResourceType: null } as never);
  }, [context.avatarId, updatePresence]);

  useEffect(() => {
    const movementKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s", "A", "D", "W", "S"]);
    const down = (event: KeyboardEvent) => {
      if (!movementKeys.has(event.key)) return;
      event.preventDefault(); keysRef.current.add(event.key);
      if (!event.repeat) keyPressedAtRef.current.set(event.key, performance.now());
    };
    const up = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key);
      const pressedAt = keyPressedAtRef.current.get(event.key);
      keyPressedAtRef.current.delete(event.key);
      if (pressedAt !== undefined && performance.now() - pressedAt < 90) {
        const axes = readKeyboardAxes(new Set([event.key]));
        moveOneStep(axes.axisX, axes.axisY);
      }
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [moveOneStep]);

  useEffect(() => {
    const onSpace = (event: KeyboardEvent) => { if (event.code === "Space") { event.preventDefault(); void swingNet(); } };
    window.addEventListener("keydown", onSpace);
    return () => window.removeEventListener("keydown", onSpace);
  }, [swingNet]);

  useEffect(() => {
    updatePresence({
      x: positionRef.current.x, y: positionRef.current.y, direction: facingRef.current,
      isMoving: false, animation: "idle", avatarId: context.avatarId, carriedResourceType: null,
    } as never);
  }, [context.avatarId, updatePresence]);

  useEffect(() => {
    let frame = 0; let previous = performance.now();
    const tick = (now: number) => {
      const keyboard = readKeyboardAxes(keysRef.current);
      const axisX = keyboard.axisX || touchRef.current.axisX;
      const axisY = keyboard.axisY || touchRef.current.axisY;
      const active = axisX !== 0 || axisY !== 0;
      if (active) {
        positionRef.current = tickMovement(MAP, positionRef.current, { axisX, axisY, dtSec: Math.min(.05, (now - previous) / 1000) });
        setPosition({ ...positionRef.current });
        facingRef.current = directionFromAxes(axisX, axisY);
        if (now - lastPresenceAtRef.current >= 125) {
          lastPresenceAtRef.current = now;
          updatePresence({ x: positionRef.current.x, y: positionRef.current.y, direction: facingRef.current, isMoving: true, animation: "walk", avatarId: context.avatarId, carriedResourceType: null } as never);
        }
      } else if (movingRef.current) {
        updatePresence({ x: positionRef.current.x, y: positionRef.current.y, direction: facingRef.current, isMoving: false, animation: "idle", avatarId: context.avatarId, carriedResourceType: null } as never);
      }
      if (movingRef.current !== active) {
        movingRef.current = active;
        setMoving(active);
      }
      previous = now; frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [context.avatarId, updatePresence]);

  const inventory = player?.inventory ?? [];
  return <BugMarketMeadowView
    bugs={Object.values(bugs)}
    localPlayer={{ name: context.displayName, avatarId: context.avatarId, x: position.x, y: position.y, moving, swinging }}
    remotePlayers={remotePlayers}
    inventory={inventory}
    coins={player?.coins ?? 0}
    netLevel={player?.netLevel ?? 1}
    feedback={feedback}
    catching={catching}
    saleBusy={saleBusy}
    saleQuestion={saleChallenge?.question ?? null}
    onMoveAxis={(axisX, axisY) => { touchRef.current = { axisX, axisY }; }}
    onSwing={() => void swingNet()}
    onSell={() => void openSale()}
    onUpgrade={() => void purchaseNetUpgrade()}
    onSaleAnswer={(answer) => void submitSaleAnswer(answer)}
    onCloseSale={() => setSaleChallenge(null)}
  />;
}

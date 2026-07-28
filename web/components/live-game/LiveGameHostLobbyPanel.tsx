"use client";

import { useCallback, useState, memo } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { resolveLiveGameCharacter } from "@/lib/live-game/characters/live-game-characters";
import type { LiveGameLobbyPlayerEntry } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import { LIVE_GAME_MAX_STUDENTS } from "@/lib/live-game/limits";
import {
  ENGLISH_CRAFT_DURATION_OPTIONS,
  ENGLISH_CRAFT_MODE,
  formatEnglishCraftDurationSelectValue,
  parseEnglishCraftDurationSelectValue,
  type EnglishCraftSessionDuration,
} from "@/lib/live-game/modes/english-craft/config";

type Props = {
  gameTitle?: string;
  startLabel?: string;
  previewTopOffset?: boolean;
  joinCode: string;
  durationMinutes: EnglishCraftSessionDuration;
  onDurationChange: (duration: EnglishCraftSessionDuration) => void;
  canUseUnlimitedDuration?: boolean;
  players: LiveGameLobbyPlayerEntry[];
  selfId: string;
  studentCount: number;
  connectedCount: number;
  canStart: boolean;
  onStart: () => void;
  onChangeCharacter: () => void;
  changeCharacterDisabled?: boolean;
  onLeaveClick: () => void;
};

export const LiveGameHostLobbyPanel = memo(LiveGameHostLobbyPanelInner);

function LiveGameHostLobbyPanelInner({
  gameTitle = ENGLISH_CRAFT_MODE.title,
  startLabel = `Start ${ENGLISH_CRAFT_MODE.title}`,
  previewTopOffset = false,
  joinCode,
  durationMinutes,
  onDurationChange,
  canUseUnlimitedDuration = false,
  players,
  selfId,
  studentCount,
  connectedCount,
  canStart,
  onStart,
  onChangeCharacter,
  changeCharacterDisabled = false,
  onLeaveClick,
}: Props) {
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [joinCode]);

  return (
    <div
      className={clsx(
        "pointer-events-auto fixed z-30 flex flex-col border-white/20 bg-neutral-950/95 text-white shadow-2xl",
        "inset-x-0 bottom-0 max-h-[58dvh] rounded-t-2xl border-t",
        "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-80 md:rounded-none md:border-t-0 md:border-l",
        previewTopOffset && "md:top-11",
        !mobileExpanded && "max-h-14 md:max-h-none",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 md:px-4 md:py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{gameTitle}</p>
          <p className="text-[11px] font-semibold text-white/65">Host lobby</p>
        </div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs font-bold text-white/80 hover:bg-white/10 md:hidden"
          onClick={() => setMobileExpanded((open) => !open)}
          aria-expanded={mobileExpanded}
        >
          {mobileExpanded ? "Hide" : "Show"}
        </button>
      </div>

      <div
        className={clsx(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-4 md:py-4",
          !mobileExpanded && "hidden md:flex",
        )}
      >
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">Join code</p>
          <p className="font-mono text-3xl font-extrabold tracking-[0.2em]">{joinCode}</p>
          <p className="text-xs font-semibold text-white/70">Share with students</p>
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-9 w-full text-sm"
            onClick={() => void handleCopyCode()}
          >
            {copied ? "Copied!" : "Copy code"}
          </KidButton>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-white/75">
            {studentCount}/{LIVE_GAME_MAX_STUDENTS} students · {connectedCount} connected
          </p>
          <ul className="space-y-1.5">
            {players.length === 0 || (players.length === 1 && players[0]?.player.role === "host") ?
              <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/70">
                Waiting for students to join…
              </li>
            : null}
            {players.map(({ id, player }) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
              >
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/10">
                  <Image
                    src={resolveLiveGameCharacter(player.avatarId).src}
                    alt=""
                    fill
                    className="object-contain object-bottom"
                    sizes="32px"
                    unoptimized
                    draggable={false}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {player.name}
                    {id === selfId ? " (You)" : ""}
                  </p>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    player.role === "host" ?
                      "bg-amber-400/20 text-amber-100"
                    : "bg-sky-400/20 text-sky-100",
                  )}
                >
                  {player.role === "host" ? "Teacher" : "Student"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">Settings</p>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-white/75">Session length</span>
            <select
              value={formatEnglishCraftDurationSelectValue(durationMinutes)}
              onChange={(event) =>
                onDurationChange(parseEnglishCraftDurationSelectValue(event.target.value))
              }
              className="w-full rounded-lg border-2 border-white/20 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
            >
              {ENGLISH_CRAFT_DURATION_OPTIONS.map((mins) => (
                <option key={mins} value={mins}>
                  {mins} minutes
                </option>
              ))}
              <option value="unlimited" disabled={!canUseUnlimitedDuration}>
                Unlimited{canUseUnlimitedDuration ? "" : " (Premium)"}
              </option>
            </select>
          </label>

          <details className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 md:open">
            <summary className="cursor-pointer text-sm font-bold text-white/90">Change character</summary>
            <div className="mt-2">
              <KidButton
                type="button"
                variant="accent"
                className="!min-h-10 w-full text-sm"
                disabled={changeCharacterDisabled}
                onClick={onChangeCharacter}
              >
                Pick character
              </KidButton>
            </div>
          </details>
        </section>

        <section className="mt-auto space-y-2 border-t border-white/10 pt-3">
          <KidButton
            type="button"
            variant="primary"
            className="w-full"
            disabled={!canStart}
            onClick={onStart}
          >
            {startLabel}
          </KidButton>
          {!canStart ?
            <p className="text-xs font-semibold text-white/65">
              Need at least 1 student in the lobby before starting (or test with two tabs).
            </p>
          : null}
          <button
            type="button"
            onClick={onLeaveClick}
            className="text-xs font-bold text-white/75 underline underline-offset-2 hover:text-white"
          >
            Leave lobby
          </button>
        </section>
      </div>
    </div>
  );
}

"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import { ENGLISH_CRAFT_WOOD_GOAL } from "@/lib/live-game/modes/english-craft/gameplay-v1";

type StudentLobbyActionsProps = {
  playerCount: number;
  onChangeCharacter: () => void;
  changeCharacterDisabled?: boolean;
};

export function LiveGameStudentLobbyBanner() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      <header className="pointer-events-auto bg-gradient-to-b from-black/70 via-black/40 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
        <div className="min-w-0 max-w-md">
          <h1 className="truncate text-base font-extrabold text-white sm:text-lg">
            {ENGLISH_CRAFT_MODE.title}
          </h1>
          <p className="mt-1 text-xs font-semibold text-white/80 sm:text-sm">
            Wait for your teacher to start the game.
          </p>

          <div className="mt-3 space-y-1.5 text-xs font-semibold text-white/85 sm:text-sm">
            <p className="font-bold text-white">How to play:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Chop trees to collect wood for your team</li>
              <li>
                Craft a bridge at the bench ({ENGLISH_CRAFT_WOOD_GOAL} wood)
              </li>
              <li>Cross the river and touch the flag together</li>
            </ol>
            <p className="pt-1 text-white/70">
              Tip: Tap &quot;Change character&quot; below to pick your avatar.
            </p>
          </div>
        </div>
      </header>
    </div>
  );
}

export function LiveGameStudentLobbyFooter({
  playerCount,
  onChangeCharacter,
  changeCharacterDisabled = false,
}: StudentLobbyActionsProps) {
  return (
    <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-white/75">
        {playerCount} {playerCount === 1 ? "player" : "players"} in room
      </p>
      <ChangeCharacterButton disabled={changeCharacterDisabled} onClick={onChangeCharacter} />
    </div>
  );
}

type ChangeCharacterButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

function ChangeCharacterButton({ disabled, onClick }: ChangeCharacterButtonProps) {
  return (
    <KidButton
      type="button"
      variant="accent"
      className="!min-h-11 px-5 text-sm font-extrabold"
      disabled={disabled}
      onClick={onClick}
    >
      Change character
    </KidButton>
  );
}

"use client";

import Image from "next/image";
import { clsx } from "clsx";
import {
  LIVE_GAME_CHARACTERS,
  type LiveGameCharacterId,
} from "@/lib/live-game/characters/live-game-characters";

type Props = {
  value: LiveGameCharacterId;
  onChange: (avatarId: LiveGameCharacterId) => void;
  takenAvatarIds?: ReadonlySet<LiveGameCharacterId>;
  compact?: boolean;
};

export function LiveGameCharacterPicker({ value, onChange, takenAvatarIds, compact = false }: Props) {
  const taken = takenAvatarIds ?? new Set<LiveGameCharacterId>();

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <span className="text-sm font-bold text-kid-ink">Your character</span>
      <p className="text-xs font-semibold text-kid-ink/65">
        Characters already picked by someone else are unavailable.
      </p>

      <div className={compact ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
        <div className={compact ? "space-y-1" : "space-y-2"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-kid-ink/60">Boys</p>
          <div className={compact ? "grid max-w-md grid-cols-5 gap-1" : "grid grid-cols-5 gap-3"}>
          {LIVE_GAME_CHARACTERS.filter((character) => character.group === "boy").map((character) => (
            <CharacterOption
              key={character.id}
              character={character}
              selected={value === character.id}
              taken={taken.has(character.id)}
              compact={compact}
              onSelect={() => onChange(character.id)}
            />
          ))}
          </div>
        </div>

        <div className={compact ? "space-y-1" : "space-y-2"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-kid-ink/60">Girls</p>
          <div className={compact ? "grid max-w-md grid-cols-5 gap-1" : "grid grid-cols-5 gap-3"}>
          {LIVE_GAME_CHARACTERS.filter((character) => character.group === "girl").map((character) => (
            <CharacterOption
              key={character.id}
              character={character}
              selected={value === character.id}
              taken={taken.has(character.id)}
              compact={compact}
              onSelect={() => onChange(character.id)}
            />
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type CharacterOptionProps = {
  character: (typeof LIVE_GAME_CHARACTERS)[number];
  selected: boolean;
  taken: boolean;
  compact: boolean;
  onSelect: () => void;
};

function CharacterOption({ character, selected, taken, compact, onSelect }: CharacterOptionProps) {
  const disabled = taken && !selected;

  return (
    <button
      type="button"
      aria-label={character.label}
      aria-pressed={selected}
      aria-disabled={disabled}
      disabled={disabled}
      title={disabled ? "Already taken by another player" : character.label}
      onClick={() => {
        if (disabled) return;
        onSelect();
      }}
      className={clsx(
        "relative w-full transition-transform",
        compact ? "h-20" : "h-28",
        disabled && "cursor-not-allowed opacity-35 grayscale",
        selected && (compact ? "scale-105" : "scale-110"),
        !disabled && !selected && "scale-100 opacity-75 hover:scale-105 hover:opacity-100",
        !disabled && selected && "opacity-100",
      )}
    >
      <Image
        src={character.src}
        alt=""
        fill
        className="object-contain object-bottom"
        sizes="112px"
        unoptimized
        draggable={false}
      />
    </button>
  );
}

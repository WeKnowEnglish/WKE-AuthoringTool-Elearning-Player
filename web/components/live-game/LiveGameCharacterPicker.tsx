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
};

export function LiveGameCharacterPicker({ value, onChange, takenAvatarIds }: Props) {
  const taken = takenAvatarIds ?? new Set<LiveGameCharacterId>();

  return (
    <div className="space-y-3">
      <span className="text-sm font-bold text-kid-ink">Your character</span>
      <p className="text-xs font-semibold text-kid-ink/65">
        Characters already picked by someone else are unavailable.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-kid-ink/60">Boys</p>
        <div className="grid grid-cols-5 gap-3">
          {LIVE_GAME_CHARACTERS.filter((character) => character.group === "boy").map((character) => (
            <CharacterOption
              key={character.id}
              character={character}
              selected={value === character.id}
              taken={taken.has(character.id)}
              onSelect={() => onChange(character.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-kid-ink/60">Girls</p>
        <div className="grid grid-cols-5 gap-3">
          {LIVE_GAME_CHARACTERS.filter((character) => character.group === "girl").map((character) => (
            <CharacterOption
              key={character.id}
              character={character}
              selected={value === character.id}
              taken={taken.has(character.id)}
              onSelect={() => onChange(character.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type CharacterOptionProps = {
  character: (typeof LIVE_GAME_CHARACTERS)[number];
  selected: boolean;
  taken: boolean;
  onSelect: () => void;
};

function CharacterOption({ character, selected, taken, onSelect }: CharacterOptionProps) {
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
        "relative h-28 w-full transition-transform",
        disabled && "cursor-not-allowed opacity-35 grayscale",
        selected && "scale-110",
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

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
};

export function LiveGameCharacterPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <span className="text-sm font-bold text-kid-ink">Your character</span>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-kid-ink/60">Boys</p>
        <div className="grid grid-cols-5 gap-3">
          {LIVE_GAME_CHARACTERS.filter((character) => character.group === "boy").map((character) => (
            <CharacterOption
              key={character.id}
              character={character}
              selected={value === character.id}
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
  onSelect: () => void;
};

function CharacterOption({ character, selected, onSelect }: CharacterOptionProps) {
  return (
    <button
      type="button"
      aria-label={character.label}
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        "relative h-28 w-full transition-transform",
        selected ? "scale-110" : "scale-100 opacity-75 hover:scale-105 hover:opacity-100",
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

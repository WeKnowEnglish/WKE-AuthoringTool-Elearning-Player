"use client";

import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";

type Props = {
  className?: string;
};

export function SoundMuteButton({ className }: Props) {
  const { muted, toggleMuted } = useAudioMuted();

  return (
    <KidButton
      type="button"
      variant="secondary"
      className={clsx("!min-h-10 !min-w-0 px-3 py-2 text-sm", className)}
      onClick={toggleMuted}
      aria-pressed={muted}
    >
      {muted ? "Sound off" : "Sound on"}
    </KidButton>
  );
}

import { clsx } from "clsx";
import { ENGLISH_CRAFT_CARRY_OVERLAY_SIZE_PX } from "@/lib/live-game/modes/english-craft/gameplay-v1";

type Props = {
  name: string;
  isCarrying?: boolean;
  isLocal?: boolean;
};

export function LiveGamePlayerNameplate({ name, isCarrying = false, isLocal = false }: Props) {
  const label = name.trim() || "Player";
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
      style={{ top: isCarrying ? -ENGLISH_CRAFT_CARRY_OVERLAY_SIZE_PX - 34 : -28 }}
    >
      <span
        className={clsx(
          "block max-w-32 truncate whitespace-nowrap rounded-full border-2 px-2 py-0.5 text-center text-xs font-extrabold leading-none shadow-md",
          isLocal ? "border-kid-ink bg-kid-cta text-kid-ink" : "border-white bg-kid-ink/90 text-white",
        )}
        title={label}
      >
        {label}
      </span>
    </div>
  );
}

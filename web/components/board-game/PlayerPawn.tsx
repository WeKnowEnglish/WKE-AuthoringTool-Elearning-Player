import type { Player } from "@/lib/board-game/types";

type Props = {
  player: Player;
  isCurrent: boolean;
  size?: "sm" | "md";
  offsetIndex?: number;
};

export function PlayerPawn({ player, isCurrent, size = "md", offsetIndex = 0 }: Props) {
  const initial = player.name.trim().charAt(0).toUpperCase() || "?";
  const dimension = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";

  return (
    <div
      className={`flex ${dimension} shrink-0 items-center justify-center rounded-full border-4 font-bold text-white shadow-[2px_2px_0_0_var(--kid-shadow)] ${
        isCurrent ? "ring-4 ring-kid-accent ring-offset-2" : ""
      }`}
      style={{
        backgroundColor: player.color,
        marginLeft: offsetIndex > 0 ? `${offsetIndex * 6}px` : undefined,
      }}
      title={player.name}
    >
      {initial}
    </div>
  );
}

import type {
  BoardConnection,
  BoardMap,
  BoardMapSpace,
  MapLayoutTemplate,
  MapSpaceEffectType,
  MapSpaceType,
  MapThemeId,
  PathTerrainDecoration,
} from "@/lib/board-game/map/types";

export const BUILDER_SPACE_TYPES: { value: MapSpaceType; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "normal", label: "Normal" },
  { value: "bonus", label: "Bonus" },
  { value: "penalty", label: "Penalty" },
  { value: "moveForward", label: "Move forward" },
  { value: "moveBackward", label: "Move back" },
  { value: "skipTurn", label: "Skip turn" },
  { value: "rollAgain", label: "Roll again" },
  { value: "shortcutStart", label: "Shortcut start" },
  { value: "shortcutEnd", label: "Shortcut end" },
];

export const BUILDER_THEMES: { value: MapThemeId; label: string }[] = [
  { value: "classroom", label: "Classroom" },
  { value: "jungle", label: "Jungle" },
  { value: "space", label: "Space" },
  { value: "ocean", label: "Ocean" },
  { value: "castle", label: "Castle" },
];

export const BUILDER_LAYOUTS: { value: MapLayoutTemplate; label: string }[] = [
  { value: "snake", label: "Snake path" },
  { value: "spiral", label: "Spiral path" },
  { value: "island", label: "Island path" },
];

export const BUILDER_SPACE_COUNTS = [12, 20, 30, 40, 60, 80] as const;

export const BUILDER_TERRAIN_DECORATIONS: {
  value: PathTerrainDecoration;
  label: string;
  description: string;
}[] = [
  {
    value: "endpoints-only",
    label: "Endpoints only",
    description: "Plain filler under the path; start and finish get themed tiles.",
  },
  {
    value: "full-legacy",
    label: "Full legacy pattern",
    description: "Alternating plain/alt terrain under every path cell (matches old CSS board).",
  },
];

export const BUILDER_ICONS = ["⭐", "🎁", "❓", "🐸", "💣", "🌉", "🎲", "⏸️", "💨", "🏁", "✨", "🔥"] as const;

export const BUILDER_EFFECTS: { value: MapSpaceEffectType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "moveAhead3", label: "Move ahead 3" },
  { value: "moveBack2", label: "Move back 2" },
  { value: "rollAgain", label: "Roll again" },
  { value: "stealPoint", label: "Steal point from leader" },
  { value: "skipTurn", label: "Skip next turn" },
  { value: "swapLeader", label: "Swap with leader" },
];

export const BUILDER_WRONG_PRESETS: {
  value: MapSpaceEffectType | "random" | "";
  label: string;
  points?: number;
  moveAmount?: number;
}[] = [
  { value: "random", label: "Random penalty (default)" },
  { value: "", label: "None" },
  { value: "moveBack2", label: "Move back 2", moveAmount: 2 },
  { value: "moveBack2", label: "Move back 1", moveAmount: 1 },
  { value: "skipTurn", label: "Skip next turn" },
  { value: "", label: "Lose 1 point", points: -1 },
];

export const BUILDER_CORRECT_PRESETS: {
  value: MapSpaceEffectType | "";
  label: string;
  points?: number;
}[] = [
  { value: "", label: "+1 point (default)", points: 1 },
  { value: "", label: "+2 points", points: 2 },
  { value: "moveAhead3", label: "Move ahead 3" },
  { value: "rollAgain", label: "Roll again" },
];

export const BUILDER_CONNECTION_TYPES: { value: BoardConnection["type"]; label: string }[] = [
  { value: "bridge", label: "Bridge" },
  { value: "tunnel", label: "Tunnel" },
  { value: "shortcut", label: "Shortcut" },
];

export function defaultEffectsForSpaceType(type: MapSpaceType): BoardMapSpace["effects"] {
  switch (type) {
    case "bonus":
      return { onLand: "moveAhead3" };
    case "penalty":
      return { onLand: "moveBack2", moveAmount: 1 };
    case "moveForward":
      return { onLand: "moveAhead3", moveAmount: 1 };
    case "moveBackward":
      return { onLand: "moveBack2", moveAmount: 1 };
    case "rollAgain":
      return { onLand: "rollAgain" };
    case "skipTurn":
      return { onLand: "skipTurn" };
    default:
      return undefined;
  }
}

export function defaultIconForSpaceType(type: MapSpaceType): string | undefined {
  switch (type) {
    case "bonus":
      return "⭐";
    case "penalty":
      return "💣";
    case "moveForward":
      return "🐸";
    case "rollAgain":
      return "🎲";
    case "shortcutStart":
      return "🌉";
    default:
      return undefined;
  }
}

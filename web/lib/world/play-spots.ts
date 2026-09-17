export const PLAY_SPOTS = ["cottage", "school", "pet"] as const;
export type PlaySpotId = (typeof PLAY_SPOTS)[number];

export function isPlaySpot(value: string): value is PlaySpotId {
  return value === "cottage" || value === "school" || value === "pet";
}

export function playHref(spot: PlaySpotId, surface: "student" | "pilot" = "student"): string {
  if (spot === "pet") return "/primary?nav=games";
  const root = surface === "pilot" ? `/pilots/world/play/${spot}` : `/primary/world/play/${spot}`;
  return `${root}?inside=1`;
}

export function playSpotLabel(spot: PlaySpotId): string {
  if (spot === "cottage") return "Your house";
  if (spot === "pet") return "Pet yard";
  return "School";
}

export function playMapHref(spot: PlaySpotId, surface: "student" | "pilot" = "student"): string {
  return surface === "pilot" ? `/pilots/world?at=${spot}` : `/primary/world?at=${spot}`;
}

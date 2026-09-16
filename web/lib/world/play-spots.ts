export const PLAY_SPOTS = ["cottage", "school"] as const;
export type PlaySpotId = (typeof PLAY_SPOTS)[number];

export function isPlaySpot(value: string): value is PlaySpotId {
  return value === "cottage" || value === "school";
}

export function playHref(spot: PlaySpotId, surface: "student" | "pilot" = "student"): string {
  return surface === "pilot" ? `/pilots/world/play/${spot}` : `/primary/world/play/${spot}`;
}

export function playSpotLabel(spot: PlaySpotId): string {
  return spot === "cottage" ? "Your house" : "School";
}

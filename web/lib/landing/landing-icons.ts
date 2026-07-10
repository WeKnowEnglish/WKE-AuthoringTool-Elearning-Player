export const LANDING_ICON_NAMES = [
  "graduation",
  "level",
  "music",
  "book",
  "story",
  "game",
  "pencil",
  "target",
  "compass",
  "brain",
  "trophy",
  "users",
  "arrow-right",
  "user",
] as const;

export type LandingIconName = (typeof LANDING_ICON_NAMES)[number];

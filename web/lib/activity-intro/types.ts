import type {
  StoryAnimationPreset,
  StoryIdleAnimation,
} from "@/lib/lesson-schemas";

export type ActivityIntroItemEnter = {
  preset: StoryAnimationPreset;
  duration_ms?: number;
  delay_ms?: number;
};

export type ActivityIntroIdle = {
  id: string;
  preset: StoryIdleAnimation["preset"];
  amplitude?: number;
  period_ms?: number;
};

type ActivityIntroItemBase = {
  id: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  showCard?: boolean;
  enter?: ActivityIntroItemEnter;
  idle?: ActivityIntroIdle;
};

export type ActivityIntroImageItem = ActivityIntroItemBase & {
  kind?: "image";
  imageUrl: string;
};

export type ActivityIntroTextItem = ActivityIntroItemBase & {
  kind: "text";
  text: string;
  textColor?: string;
  textSizePx?: number;
};

export type ActivityIntroShapeItem = ActivityIntroItemBase & {
  kind: "shape";
  colorHex: string;
};

export type ActivityIntroItemSpec =
  | ActivityIntroImageItem
  | ActivityIntroTextItem
  | ActivityIntroShapeItem;

export type ActivityIntroPageSpec = {
  id: string;
  title: string;
  /** Prefer solid comic stages over photographic backgrounds for kids intros. */
  backgroundImageUrl?: string;
  backgroundColor?: string;
  backgroundImageFit?: "cover" | "contain";
  bodyText: string;
  readAloudText: string;
  items: ActivityIntroItemSpec[];
};

/**
 * Exactly two pages: situation (hook) → invitation (practice cue).
 * Builder emits a StoryBook `story` payload — no phases, no mastery.
 */
export type ActivityIntroSpec = {
  introId: string;
  topicLabel: string;
  pages: [ActivityIntroPageSpec, ActivityIntroPageSpec];
};

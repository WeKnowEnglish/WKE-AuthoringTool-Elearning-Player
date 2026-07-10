import type { LandingPathVariant } from "@/lib/landing/landing-path-config";

/** Processed mascot paths (see scripts/prepare-landing-mascots.ts). */
export const LANDING_CHARACTERS: Record<LandingPathVariant, string> = {
  primary: "/landing/primary-mascot.png",
  secondary: "/landing/secondary-mascot.png",
};

export type LandingCharacterSide = "left" | "right";

/** Per-character display tuning for full-body mascots in side-by-side card layout. */
export const LANDING_CHARACTER_DISPLAY: Record<
  LandingPathVariant,
  {
    /** Intrinsic size hint for next/image (not layout height). */
    height: number;
    objectPosition: string;
    side: LandingCharacterSide;
    flipHorizontal: boolean;
    /** Fraction of card height — boy 1, girl ~0.8 (same proportional shortness). */
    heightScale: number;
    /** Extend character past the outer card edge toward the other card (not into content). */
    insetTowardCenterClass: string;
    /** Padding on the content column facing the character. */
    contentInsetClass: string;
  }
> = {
  primary: {
    height: 400,
    objectPosition: "center bottom",
    side: "right",
    flipHorizontal: true,
    heightScale: 0.8,
    insetTowardCenterClass: "-mr-4 sm:-mr-8",
    contentInsetClass: "pr-3 sm:pr-5",
  },
  secondary: {
    height: 500,
    objectPosition: "center bottom",
    side: "left",
    flipHorizontal: false,
    heightScale: 1,
    insetTowardCenterClass: "-ml-4 sm:-ml-8",
    contentInsetClass: "pl-3 sm:pl-5",
  },
};

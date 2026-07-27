import type { Metadata } from "next";

/** Login, account gateway, public utility ΓÇö crawlable so Google sees noindex. */
export const robotsNoIndexFollow = {
  index: false,
  follow: true,
} as const satisfies NonNullable<Metadata["robots"]>;

/** Session, preview, editor, raw player ΓÇö do not pass equity to deep session URLs. */
export const robotsNoIndexNoFollow = {
  index: false,
  follow: false,
} as const satisfies NonNullable<Metadata["robots"]>;

/** Public marketing pages. */
export const robotsIndexFollow = {
  index: true,
  follow: true,
} as const satisfies NonNullable<Metadata["robots"]>;

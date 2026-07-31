import type { ReactNode } from "react";
import {
  SECONDARY_CHROME_CLASS,
  SECONDARY_CHROME_STYLE,
} from "@/lib/secondary/secondary-chrome";

/** Applies Secondary study-desk CSS variables for the portal subtree. */
export function SecondaryChrome({ children }: { children: ReactNode }) {
  return (
    <div
      data-secondary-chrome
      className={`min-w-0 ${SECONDARY_CHROME_CLASS}`}
      style={SECONDARY_CHROME_STYLE}
    >
      {children}
    </div>
  );
}

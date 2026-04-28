import { clsx } from "clsx";
import type { ReactNode } from "react";

type Tone = "default" | "discovery" | "workspace";

const toneClass: Record<Tone, string> = {
  default: "bg-kid-panel",
  discovery: "bg-kid-surface/80",
  workspace: "bg-kid-panel",
};

export function KidPanel({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  /** discovery = light sky tint for instruction slides; workspace = neutral card */
  tone?: Tone;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border-4 border-kid-ink p-4 shadow-[4px_4px_0_0_var(--kid-shadow)]",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

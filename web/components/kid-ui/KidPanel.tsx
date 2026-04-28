import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Tone = "default" | "discovery" | "workspace";
type KidPanelProps = {
  children: ReactNode;
  /** discovery = light sky tint for instruction slides; workspace = neutral card */
  tone?: Tone;
} & ComponentPropsWithoutRef<"div">;

const toneClass: Record<Tone, string> = {
  default: "bg-kid-panel",
  discovery: "bg-kid-surface/80",
  workspace: "bg-kid-panel",
};

export function KidPanel({
  children,
  className,
  tone = "default",
  ...divProps
}: KidPanelProps) {
  return (
    <div
      {...divProps}
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

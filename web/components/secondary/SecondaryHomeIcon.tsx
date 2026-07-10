import clsx from "clsx";
import { isSecondaryWebIconUrl } from "@/lib/secondary/secondary-topic-icons";

type Props = {
  src: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

/** Compact Twemoji / web icon for secondary home cards and headers. */
export function SecondaryHomeIcon({ src, size = "md", className }: Props) {
  const isIcon = isSecondaryWebIconUrl(src);

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={clsx(
        "shrink-0 rounded-lg border border-kid-ink/10 bg-kid-panel/50",
        isIcon ? "object-contain p-0.5" : "object-cover",
        sizeClass[size],
        className,
      )}
    />
  );
}

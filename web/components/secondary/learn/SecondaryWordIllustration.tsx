import clsx from "clsx";
import { isSecondaryWebIconUrl } from "@/lib/secondary/secondary-topic-icons";

export type SecondaryWordIllustrationSize =
  | "chip"
  | "chipCompact"
  | "chipTrailing"
  | "chipTrailingRow"
  | "drawer";

type Props = {
  imageUrl: string | null | undefined;
  word: string;
  size: SecondaryWordIllustrationSize;
  className?: string;
};

const sizeClass: Record<SecondaryWordIllustrationSize, string> = {
  chip: "h-6 w-6",
  chipCompact: "h-5 w-5",
  chipTrailing: "h-10 w-10",
  chipTrailingRow: "h-9 w-9",
  drawer: "h-14 w-14 shrink-0 md:h-16 md:w-16",
};

export function SecondaryWordIllustration({ imageUrl, word, size, className }: Props) {
  const src = imageUrl?.trim();
  if (!src) return null;

  const isIcon = isSecondaryWebIconUrl(src);
  const isEmbedded =
    size === "chip" ||
    size === "chipCompact" ||
    size === "chipTrailing" ||
    size === "chipTrailingRow";

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={clsx(
        "shrink-0",
        isEmbedded
          ? "bg-transparent object-contain"
          : "rounded-lg border border-sec-ink/15 bg-sec-panel/40 object-cover",
        isEmbedded && isIcon ? "p-0" : isIcon ? "object-contain p-0.5" : "",
        sizeClass[size],
        className,
      )}
    />
  );
}

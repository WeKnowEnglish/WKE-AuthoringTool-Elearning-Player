"use client";

import { useState } from "react";
import { clsx } from "clsx";

type Props = {
  emoji: string;
  imageUrl?: string;
  className?: string;
  imgClassName?: string;
};

export function PosterGraphic({ emoji, imageUrl, className, imgClassName }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  if (showImage && imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- author-supplied poster asset URLs
      <img
        src={imageUrl}
        alt=""
        className={clsx("max-h-full max-w-full object-contain", imgClassName)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={className} aria-hidden>
      {emoji || "❓"}
    </span>
  );
}

export function posterAlignClass(
  align: "left" | "center" | "right" | undefined,
): string {
  switch (align) {
    case "left":
      return "text-left";
    case "right":
      return "text-right";
    case "center":
    default:
      return "text-center";
  }
}

export function posterAlignItemsClass(
  align: "left" | "center" | "right" | undefined,
): string {
  switch (align) {
    case "left":
      return "items-start";
    case "right":
      return "items-end";
    case "center":
    default:
      return "items-center";
  }
}

export function posterJustifyClass(
  align: "left" | "center" | "right" | undefined,
): string {
  switch (align) {
    case "left":
      return "justify-start";
    case "right":
      return "justify-end";
    case "center":
    default:
      return "justify-center";
  }
}

"use client";

import { GlobeScene } from "./GlobeScene";

type Props = {
  className?: string;
};

/** Public shell: sized container + client-only R3F scene. */
export function WorldGlobe({ className }: Props) {
  return (
    <div
      className={className ?? "h-full w-full"}
      role="application"
      aria-label="WKE World globe"
      style={{ touchAction: "none", overscrollBehavior: "none", userSelect: "none" }}
    >
      <GlobeScene />
    </div>
  );
}

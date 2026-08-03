"use client";

import Image from "next/image";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { ComicLetteringElement, ComicSpeakerId } from "@/lib/comic/overlay";
import type { ComicPage } from "@/lib/comic/types";

const speakerNames: Record<ComicSpeakerId, string> = {
  narrator: "Narrator",
  mia: "Mia",
  zara: "Zara",
  leo: "Leo",
  ethan: "Ethan",
  keelan: "Keelan",
  grandpa_minh: "Grandpa Minh",
};

const speakerRings: Partial<Record<ComicSpeakerId, string>> = {
  mia: "#8b5bb7",
  zara: "#e3ad24",
  leo: "#2f7fc1",
  ethan: "#3d8a4c",
  keelan: "#2c9ac5",
  grandpa_minh: "#8a6b46",
  narrator: "#765f3e",
};

type ComicElementStyle = CSSProperties & {
  "--comic-enter-delay": string;
};

function elementFontSize(element: ComicLetteringElement): string {
  const bases: Record<ComicLetteringElement["kind"], number> = {
    speech: 2.15,
    thought: 2.15,
    narration: 2.05,
    caption: 2.15,
    sfx: 3.5,
    panel_number: 2.35,
    title: 5.1,
    subtitle: 2.1,
  };
  const value = bases[element.kind] * element.fontScale;
  return `clamp(9px, ${value}cqi, 48px)`;
}

function kindClass(kind: ComicLetteringElement["kind"]): string {
  switch (kind) {
    case "speech":
      return "rounded-[48%] border-[0.22cqw] border-neutral-950 bg-[#fffdf7] px-[1.1cqw] py-[0.55cqw] text-neutral-950 shadow-[0_0.3cqw_0.5cqw_rgba(0,0,0,0.2)]";
    case "thought":
      return "rounded-[50%] border-[0.22cqw] border-neutral-950 border-dashed bg-[#fffdf7] px-[1.1cqw] py-[0.55cqw] text-neutral-950 shadow-[0_0.3cqw_0.5cqw_rgba(0,0,0,0.2)]";
    case "narration":
      return "rounded-[0.5cqw] border-[0.2cqw] border-[#4f3b20] bg-[#f4ddb0] px-[0.9cqw] py-[0.45cqw] text-[#251b10] shadow-[0_0.25cqw_0.45cqw_rgba(0,0,0,0.22)]";
    case "caption":
      return "rounded-[0.5cqw] border-[0.18cqw] border-[#4f3b20] bg-[#f4ddb0] px-[0.9cqw] py-[0.4cqw] text-[#251b10] shadow-[0_0.25cqw_0.45cqw_rgba(0,0,0,0.22)]";
    case "panel_number":
      return "rounded-[0.45cqw] border-[0.2cqw] border-[#4f3b20] bg-[#e8c982] text-[#1f180e] shadow-[0_0.2cqw_0.35cqw_rgba(0,0,0,0.3)]";
    case "sfx":
      return "text-[#f4c431] [-webkit-text-stroke:0.14cqw_#111] [text-shadow:0.25cqw_0.25cqw_0_#111]";
    case "title":
      return "text-center font-black uppercase tracking-tight text-[#f3d083] [-webkit-text-stroke:0.18cqw_#111] [text-shadow:0.45cqw_0.45cqw_0_#12233a]";
    case "subtitle":
      return "text-center font-black uppercase tracking-[0.12em] text-[#ffe28b] [text-shadow:0.2cqw_0.2cqw_0_#12233a]";
  }
}

function BubbleTail({ element }: { element: ComicLetteringElement }) {
  if (!element.tail || (element.kind !== "speech" && element.kind !== "thought")) {
    return null;
  }
  const { side, offset } = element.tail;
  const style: CSSProperties = {
    position: "absolute",
    width: "2.1cqw",
    height: "2.1cqw",
    background: "#fffdf7",
    borderRight: "0.22cqw solid #0a0a0a",
    borderBottom: "0.22cqw solid #0a0a0a",
    zIndex: -1,
  };
  if (side === "bottom") {
    Object.assign(style, { left: `${offset}%`, bottom: "-0.8cqw", transform: "translateX(-50%) rotate(45deg)" });
  } else if (side === "top") {
    Object.assign(style, { left: `${offset}%`, top: "-0.8cqw", transform: "translateX(-50%) rotate(225deg)" });
  } else if (side === "left") {
    Object.assign(style, { top: `${offset}%`, left: "-0.8cqw", transform: "translateY(-50%) rotate(135deg)" });
  } else {
    Object.assign(style, { top: `${offset}%`, right: "-0.8cqw", transform: "translateY(-50%) rotate(-45deg)" });
  }
  return <span aria-hidden style={style} />;
}

type Props = {
  page: ComicPage;
  textVisible?: boolean;
  animateLettering?: boolean;
  animationEpoch?: number;
  activeElementId?: string | null;
  selectedElementId?: string | null;
  onElementClick?: (element: ComicLetteringElement) => void;
  onElementPointerDown?: (
    element: ComicLetteringElement,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  overlayExtras?: ReactNode;
  className?: string;
};

export function ComicPageCanvas({
  page,
  textVisible = true,
  animateLettering = false,
  animationEpoch = 0,
  activeElementId,
  selectedElementId,
  onElementClick,
  onElementPointerDown,
  overlayExtras,
  className = "",
}: Props) {
  const width = page.overlay?.canvas.width ?? page.imageWidth ?? 1024;
  const height = page.overlay?.canvas.height ?? page.imageHeight ?? 1536;
  const overlay = page.overlay;

  return (
    <div
      className={`relative isolate w-full overflow-hidden bg-black shadow-[0_24px_48px_rgba(0,0,0,0.65)] ${className}`}
      style={{ aspectRatio: `${width} / ${height}`, containerType: "inline-size" }}
    >
      <Image
        src={page.publicUrl}
        alt={overlay?.altText ?? `Comic page ${page.pageIndex}`}
        fill
        priority
        unoptimized
        sizes="(max-width: 900px) 100vw, 900px"
        className="object-fill"
      />

      {overlay ? (
        <div
          key={animationEpoch}
          className={`absolute inset-0 z-10 transition-opacity duration-200 ${
            textVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-label="Editable comic lettering"
          aria-hidden={!textVisible}
        >
          {overlay.elements.map((element, elementIndex) => {
            const interactive = Boolean(onElementClick && element.readOrder);
            const draggable = Boolean(onElementPointerDown);
            const speakerName = element.speakerId ? speakerNames[element.speakerId] : undefined;
            const entranceDelay = Math.min(
              (element.readOrder ?? elementIndex + 1) * 85,
              900,
            );
            const content =
              textVisible || !element.readOrder ? element.text : element.kind === "speech" ? "•••" : "";
            const commonProps = {
              className: `absolute flex items-center justify-center text-center font-black leading-[1.08] transition-[filter,box-shadow] ${kindClass(element.kind)} ${
                interactive || draggable ? "cursor-pointer" : "pointer-events-none"
              } ${interactive ? "hover:brightness-105" : ""} ${
                animateLettering ? "comic-lettering-enter" : ""
              } ${activeElementId === element.id ? "comic-lettering-tap ring-[0.45cqw] ring-sky-400" : ""} ${
                selectedElementId === element.id ? "ring-[0.4cqw] ring-fuchsia-500" : ""
              }`,
              style: {
                left: `${element.bounds.x}%`,
                top: `${element.bounds.y}%`,
                width: `${element.bounds.width}%`,
                height: `${element.bounds.height}%`,
                fontSize: elementFontSize(element),
                fontStyle: element.emphasis === "whisper" ? "italic" : undefined,
                transform: element.emphasis === "shout" && element.kind === "sfx" ? "rotate(-4deg)" : undefined,
                outlineColor: element.speakerId ? speakerRings[element.speakerId] : undefined,
                "--comic-enter-delay": `${entranceDelay}ms`,
              } satisfies ComicElementStyle,
              onPointerDown: onElementPointerDown
                ? (event: ReactPointerEvent<HTMLElement>) => onElementPointerDown(element, event)
                : undefined,
            };

            return interactive ? (
              <button
                key={element.id}
                type="button"
                {...commonProps}
                aria-label={`${speakerName ?? "Character"}: ${element.text}`}
                title={speakerName ? `${speakerName} · tap to pop` : "Tap to pop"}
                onClick={() => onElementClick?.(element)}
              >
                <BubbleTail element={element} />
                <span>{content}</span>
                {!textVisible ? <span className="sr-only">{element.text}</span> : null}
              </button>
            ) : (
              <div key={element.id} {...commonProps}>
                <BubbleTail element={element} />
                <span>{content}</span>
              </div>
            );
          })}
          {overlayExtras}
        </div>
      ) : null}
    </div>
  );
}

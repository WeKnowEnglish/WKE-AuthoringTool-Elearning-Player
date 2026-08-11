"use client";

import type { WhiteboardElement } from "@/lib/whiteboard/domain";
import { pointsToPath } from "@/lib/whiteboard/coordinates";
import { getStamp, stampDataUrl } from "@/lib/whiteboard/stamps";

type Props = {
  elements: WhiteboardElement[];
  annotationTone?: boolean;
};

export function BoardElementLayer({ elements, annotationTone = false }: Props) {
  const highlights = elements.filter((e) => e.type === "stroke" && e.strokeKind === "highlight");
  const rest = elements.filter((e) => !(e.type === "stroke" && e.strokeKind === "highlight"));

  return (
    <g opacity={annotationTone ? 0.95 : 1}>
      {[...highlights, ...rest].map((el) => {
        if (el.type === "stroke") {
          return (
            <path
              key={el.id}
              d={pointsToPath(el.points)}
              stroke={el.color}
              strokeWidth={el.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={el.opacity}
            />
          );
        }
        if (el.type === "text") {
          return (
            <text
              key={el.id}
              x={el.x}
              y={el.y}
              fill={annotationTone ? "#b91c1c" : el.color}
              fontSize={el.fontSize}
              fontFamily="Nunito, system-ui, sans-serif"
            >
              {el.text}
            </text>
          );
        }
        if (el.type === "shape") {
          if (el.shape === "rect") {
            return (
              <rect
                key={el.id}
                x={Math.min(el.x, el.x + el.width)}
                y={Math.min(el.y, el.y + el.height)}
                width={Math.abs(el.width)}
                height={Math.abs(el.height)}
                fill={el.fill}
                stroke={annotationTone ? "#b91c1c" : el.stroke}
                strokeWidth={el.strokeWidth}
                opacity={el.opacity}
              />
            );
          }
          if (el.shape === "ellipse") {
            return (
              <ellipse
                key={el.id}
                cx={el.x + el.width / 2}
                cy={el.y + el.height / 2}
                rx={Math.abs(el.width) / 2}
                ry={Math.abs(el.height) / 2}
                fill={el.fill}
                stroke={annotationTone ? "#b91c1c" : el.stroke}
                strokeWidth={el.strokeWidth}
                opacity={el.opacity}
              />
            );
          }
          return (
            <line
              key={el.id}
              x1={el.x}
              y1={el.y}
              x2={el.x + el.width}
              y2={el.y + el.height}
              stroke={annotationTone ? "#b91c1c" : el.stroke}
              strokeWidth={el.strokeWidth}
              opacity={el.opacity}
              strokeLinecap="round"
            />
          );
        }
        if (el.type === "image") {
          return (
            <image
              key={el.id}
              href={el.url}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              preserveAspectRatio="none"
            />
          );
        }
        const stamp = getStamp(el.stampId);
        const href = stampDataUrl(el.stampId);
        return (
          <image
            key={el.id}
            href={href}
            x={el.x - el.size / 2}
            y={el.y - el.size / 2}
            width={el.size}
            height={el.size}
            opacity={stamp ? 1 : 0.4}
          />
        );
      })}
    </g>
  );
}

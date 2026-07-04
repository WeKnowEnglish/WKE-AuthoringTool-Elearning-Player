"use client";

import { useEffect, useState } from "react";
import { useBoardLayout } from "@/components/board-game/BoardLayoutContext";
import { elementCenterWithin } from "@/lib/board-game/board-coords";
import { pathIndexFromSpaceId } from "@/lib/board-game/map/generate-map";
import type { BoardMap } from "@/lib/board-game/map/types";

type Props = {
  map: BoardMap;
};

type LineSegment = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: BoardMap["connections"][number]["type"];
};

function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 28;
  return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
}

export function BoardConnectionsLayer({ map }: Props) {
  const { boardRef, getSpaceElement } = useBoardLayout();
  const [segments, setSegments] = useState<LineSegment[]>([]);

  useEffect(() => {
    function measure() {
      const board = boardRef.current;
      if (!board || map.connections.length === 0) {
        setSegments([]);
        return;
      }

      const next: LineSegment[] = [];

      for (const connection of map.connections) {
        const fromIndex = pathIndexFromSpaceId(map, connection.from);
        const toIndex = pathIndexFromSpaceId(map, connection.to);
        if (fromIndex < 0 || toIndex < 0) continue;

        const fromEl = getSpaceElement(fromIndex);
        const toEl = getSpaceElement(toIndex);
        if (!fromEl || !toEl) continue;

        const fromCenter = elementCenterWithin(fromEl, board);
        const toCenter = elementCenterWithin(toEl, board);

        next.push({
          id: `${connection.from}-${connection.to}`,
          x1: fromCenter.x,
          y1: fromCenter.y,
          x2: toCenter.x,
          y2: toCenter.y,
          type: connection.type,
        });
      }

      setSegments(next);
    }

    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    if (boardRef.current) observer.observe(boardRef.current);

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [boardRef, getSpaceElement, map]);

  if (segments.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible">
      {segments.map((segment) => (
        <g key={segment.id}>
          <path
            d={curvePath(segment.x1, segment.y1, segment.x2, segment.y2)}
            fill="none"
            stroke={segment.type === "tunnel" ? "#6366f1" : segment.type === "bridge" ? "#0ea5e9" : "#f59e0b"}
            strokeWidth={4}
            strokeDasharray={segment.type === "tunnel" ? "8 8" : undefined}
            strokeLinecap="round"
            opacity={0.85}
          />
          <circle cx={segment.x2} cy={segment.y2} r={6} fill="#fff" stroke="#1e293b" strokeWidth={2} />
        </g>
      ))}
    </svg>
  );
}

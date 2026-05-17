"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { unopt } from "@/components/lesson/interactions/shared";
import { playSfx } from "@/lib/audio/sfx";
import type { PivotPercent } from "@/lib/puppet-activity/pivot-utils";
import { PUPPET_PART_LABELS } from "@/lib/puppet-activity/pivot-utils";
import {
  clearBoneParent,
  formatSkeletonForSource,
  formatSkeletonJson,
  getRootPart,
  parentMapToEdges,
  setBoneParent,
  skeletonFromParentMap,
  validateParentMap,
  wouldCreateCycle,
  type SkeletonParentMap,
} from "@/lib/puppet-activity/puppet-skeleton-utils";
import type { PuppetPartKey, PuppetRigDefinition } from "@/lib/puppet-activity/types";
import { PUPPET_PART_KEYS } from "@/lib/puppet-activity/types";

type Props = {
  open: boolean;
  puppet: PuppetRigDefinition;
  pivots: Record<PuppetPartKey, PivotPercent>;
  parentMap: SkeletonParentMap;
  onParentMapChange: (map: SkeletonParentMap) => void;
  onReset: () => void;
  onClose: () => void;
  muted: boolean;
};

type DragState = {
  fromPart: PuppetPartKey;
  x: number;
  y: number;
};

type NodeLayout = {
  part: PuppetPartKey;
  x: number;
  y: number;
};

function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}

function clientToLocal(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cx = mx + (y2 - y1) * 0.12;
  const cy = my - (x2 - x1) * 0.12;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function markerEndId(selected: boolean): string {
  return selected ? "skeleton-arrow-selected" : "skeleton-arrow";
}

export function PuppetSkeletonGraphModal({
  open,
  puppet,
  pivots,
  parentMap,
  onParentMapChange,
  onReset,
  onClose,
  muted,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedPart, setSelectedPart] = useState<PuppetPartKey>("body");
  const [selectedEdgeChild, setSelectedEdgeChild] = useState<PuppetPartKey | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const tree = useMemo(() => skeletonFromParentMap(parentMap), [parentMap]);
  const edges = useMemo(() => parentMapToEdges(parentMap), [parentMap]);
  const validation = useMemo(() => validateParentMap(parentMap), [parentMap]);
  const root = getRootPart(parentMap);

  const nodeLayouts: NodeLayout[] = useMemo(
    () =>
      PUPPET_PART_KEYS.map((part) => ({
        part,
        x: pivots[part].x,
        y: pivots[part].y,
      })),
    [pivots],
  );

  const layoutByPart = useMemo(() => {
    const map = {} as Record<PuppetPartKey, NodeLayout>;
    for (const n of nodeLayouts) map[n.part] = n;
    return map;
  }, [nodeLayouts]);

  useEffect(() => {
    if (!open) return;
    setStatusMessage(null);
    setDrag(null);
  }, [open]);

  const finishDrag = useCallback(
    (targetPart: PuppetPartKey | null) => {
      if (!drag) return;
      const from = drag.fromPart;
      setDrag(null);

      if (!targetPart || targetPart === from) return;

      if (wouldCreateCycle(parentMap, targetPart, from)) {
        setStatusMessage("Cannot connect — would create a loop.");
        playSfx("wrong", muted);
        return;
      }

      playSfx("tap", muted);
      onParentMapChange(setBoneParent(parentMap, targetPart, from));
      setSelectedPart(targetPart);
      setSelectedEdgeChild(targetPart);
      setStatusMessage(
        `${PUPPET_PART_LABELS[from]} → ${PUPPET_PART_LABELS[targetPart]}`,
      );
    },
    [drag, parentMap, onParentMapChange, muted],
  );

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const local = clientToLocal(e.clientX, e.clientY, rect);
      setDrag((d) => (d ? { ...d, x: local.x, y: local.y } : null));
    };

    const onUp = (e: PointerEvent) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const partAttr = hit
        ?.closest("[data-skeleton-node]")
        ?.getAttribute("data-skeleton-node") as PuppetPartKey | null;
      finishDrag(partAttr);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, finishDrag]);

  const startDrag = (part: PuppetPartKey, e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const local = clientToLocal(e.clientX, e.clientY, rect);
    setDrag({ fromPart: part, x: local.x, y: local.y });
    setSelectedPart(part);
    setStatusMessage(`Drag to child of ${PUPPET_PART_LABELS[part]}`);
  };

  const handleDeleteEdge = () => {
    if (!selectedEdgeChild) return;
    playSfx("tap", muted);
    onParentMapChange(clearBoneParent(parentMap, selectedEdgeChild));
    setSelectedEdgeChild(null);
    setStatusMessage("Parent link removed.");
  };

  const handleMakeRoot = () => {
    playSfx("tap", muted);
    onParentMapChange(setBoneParent(parentMap, selectedPart, null));
    setStatusMessage(`${PUPPET_PART_LABELS[selectedPart]} is root.`);
  };

  const exportJson = tree ? formatSkeletonJson(tree) : "{}";

  if (!open) return null;

  const aspectRatio = `${puppet.canvasWidth} / ${puppet.canvasHeight}`;
  const fromLayout = drag ? layoutByPart[drag.fromPart] : null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-kid-ink/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Skeleton graph editor"
      onClick={() => {
        playSfx("tap", muted);
        onClose();
      }}
    >
      <KidPanel
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col border-4 border-kid-ink bg-[#e8f5e9] shadow-[6px_6px_0_#152668] sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b-2 border-kid-ink/25 px-4 py-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-kid-ink">
              Skeleton
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-kid-ink/80">
              Drag from a node&apos;s handle to another node (parent → child).
            </p>
          </div>
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-8 shrink-0 !px-2 text-xs"
            onClick={() => {
              playSfx("tap", muted);
              onClose();
            }}
          >
            Done
          </KidButton>
        </div>

        <div
          ref={canvasRef}
          className="relative mx-auto w-full max-w-[min(100%,320px)] touch-none select-none"
          style={{ aspectRatio }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-lg bg-[#fffde7]">
            {PUPPET_PART_KEYS.map((part) => (
              <div key={part} className="absolute inset-0">
                <Image
                  src={puppet.parts[part].src}
                  alt=""
                  fill
                  className="pointer-events-none object-contain opacity-35"
                  unoptimized={unopt(puppet.parts[part].src)}
                  sizes="320px"
                  aria-hidden
                />
              </div>
            ))}
          </div>

          <svg
            className="absolute inset-0 z-10 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <marker
                id="skeleton-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#152668" />
              </marker>
              <marker
                id="skeleton-arrow-selected"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#2e7d32" />
              </marker>
            </defs>
            {edges.map(({ parent, child }) => {
              const a = layoutByPart[parent];
              const b = layoutByPart[child];
              if (!a || !b) return null;
              const selected = selectedEdgeChild === child;
              return (
                <path
                  key={`${parent}-${child}`}
                  d={edgePath(a.x, a.y, b.x, b.y)}
                  fill="none"
                  stroke={selected ? "#2e7d32" : "#152668"}
                  strokeWidth={selected ? 0.55 : 0.4}
                  strokeLinecap="round"
                  markerEnd={`url(#${markerEndId(selected)})`}
                  className="cursor-pointer"
                  style={{ pointerEvents: "stroke" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playSfx("tap", muted);
                    setSelectedEdgeChild(child);
                    setSelectedPart(child);
                    setStatusMessage(
                      `${PUPPET_PART_LABELS[parent]} → ${PUPPET_PART_LABELS[child]}`,
                    );
                  }}
                />
              );
            })}
            {drag && fromLayout ?
              <line
                x1={fromLayout.x}
                y1={fromLayout.y}
                x2={drag.x}
                y2={drag.y}
                stroke="#43a047"
                strokeWidth={0.45}
                strokeDasharray="1.2 0.8"
                strokeLinecap="round"
              />
            : null}
          </svg>

          {nodeLayouts.map(({ part, x, y }) => {
            const isRoot = root === part;
            const isSelected = selectedPart === part;
            const isDragSource = drag?.fromPart === part;
            return (
              <div
                key={part}
                data-skeleton-node={part}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  playSfx("tap", muted);
                  setSelectedPart(part);
                  setSelectedEdgeChild(
                    parentMap[part] !== null ? part : selectedEdgeChild,
                  );
                }}
              >
                <div
                  className={`relative flex flex-col items-center ${
                    isDragSource ? "scale-110" : ""
                  } transition-transform`}
                >
                  <div
                    className={`flex h-7 min-w-[4.5rem] items-center justify-center rounded-full border-2 border-kid-ink px-2 text-[9px] font-extrabold uppercase shadow-[2px_2px_0_#152668] ${
                      isSelected ?
                        "bg-kid-ink text-white"
                      : isRoot ?
                        "bg-[#ffe135] text-kid-ink"
                      : "bg-white text-kid-ink"
                    }`}
                  >
                    {PUPPET_PART_LABELS[part] ?? part}
                    {isRoot ? " · root" : ""}
                  </div>
                  <button
                    type="button"
                    aria-label={`Drag from ${part} to set parent`}
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-kid-ink bg-[#66bb6a] shadow-[1px_1px_0_#152668] ${
                      isDragSource ? "ring-2 ring-white" : "hover:bg-[#81c784]"
                    }`}
                    onPointerDown={(e) => startDrag(part, e)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t-2 border-kid-ink/20 px-4 py-3">
          <p className="text-[11px] font-bold text-kid-ink">
            {statusMessage ??
              (validation.ok ?
                `Root: ${root ? (PUPPET_PART_LABELS[root] ?? root) : "—"}`
              : validation.error)}
          </p>

          <div className="flex flex-wrap gap-2">
            <KidButton
              type="button"
              variant="secondary"
              className="!min-h-8 !px-2 text-xs"
              disabled={!selectedEdgeChild || parentMap[selectedEdgeChild] === null}
              onClick={handleDeleteEdge}
            >
              Remove link
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              className="!min-h-8 !px-2 text-xs"
              onClick={handleMakeRoot}
            >
              Make selected root
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              className="!min-h-8 !px-2 text-xs"
              onClick={() => {
                playSfx("tap", muted);
                onReset();
                setStatusMessage("Skeleton reset to default.");
              }}
            >
              Reset
            </KidButton>
          </div>

          <p className="text-[10px] font-bold uppercase text-kid-ink/70">Export</p>
          <div className="flex flex-wrap gap-2">
            <KidButton
              type="button"
              className="!min-h-8 !px-2 text-xs"
              onClick={() => void copyText(exportJson)}
            >
              Copy skeleton JSON
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              className="!min-h-8 !px-2 text-xs"
              onClick={() => void copyText(tree ? formatSkeletonForSource(tree) : "")}
            >
              Copy for source
            </KidButton>
          </div>
        </div>
      </KidPanel>
    </div>
  );
}

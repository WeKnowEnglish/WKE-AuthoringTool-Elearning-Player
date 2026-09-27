"use client";

import { useState } from "react";
import { formatPlacementsAsCode } from "./world-placements";
import { useWorldPlacements } from "./WorldPlacementContext";
import { landmassById } from "./world-landmasses";

export function WorldPlacementPanel({
  onChoose,
}: {
  onChoose?: (placementId: string | null) => void;
}) {
  const { placements, selectedId, setSelectedId, updatePlacement, resetPlacements } = useWorldPlacements();
  const selected = placements.find((placement) => placement.id === selectedId) ?? null;
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    const text = formatPlacementsAsCode(placements);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="pointer-events-auto w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-black/70 p-3 text-white shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Edit buildings</p>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
          onClick={resetPlacements}
        >
          Reset
        </button>
      </div>
      <p className="mt-1 text-[11px] text-white/55">Click a building, then drag it on the grass. Numbers stay live.</p>
      <label className="mt-2 block text-[11px] text-white/60">
        Building
        <select
          className="mt-1 w-full rounded-md bg-white/10 px-2 py-1.5 text-xs text-white"
          value={selectedId ?? ""}
          onChange={(event) => {
            const next = event.target.value || null;
            setSelectedId(next);
            onChoose?.(next);
          }}
        >
          <option value="">Select…</option>
          {placements.map((placement) => (
            <option key={placement.id} value={placement.id}>
              {landmassById(placement.landmassId)?.label ?? placement.landmassId} · {placement.label}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <NumberField
            label="X"
            value={selected.localX}
            step={0.02}
            onChange={(localX) => updatePlacement(selected.id, { localX })}
          />
          <NumberField
            label="Z"
            value={selected.localZ}
            step={0.02}
            onChange={(localZ) => updatePlacement(selected.id, { localZ })}
          />
          <NumberField
            label="Yaw °"
            value={((selected.yaw ?? 0) * 180) / Math.PI}
            step={5}
            onChange={(degrees) => updatePlacement(selected.id, { yaw: (degrees * Math.PI) / 180 })}
          />
          <NumberField
            label="Scale"
            value={selected.scale}
            step={0.01}
            onChange={(scale) => updatePlacement(selected.id, { scale })}
          />
        </div>
      ) : null}
      <button
        type="button"
        className="mt-3 w-full rounded-md bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-sky-300"
        onClick={() => void copyCode()}
      >
        {copied ? "Copied" : "Copy placements"}
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-white/60">
      {label}
      <input
        type="number"
        step={step}
        value={Number(value.toFixed(3))}
        className="mt-1 w-full rounded-md bg-white/10 px-2 py-1 text-white"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

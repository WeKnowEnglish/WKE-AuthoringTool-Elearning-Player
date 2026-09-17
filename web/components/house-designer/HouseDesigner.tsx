"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HouseDesignerScene } from "./HouseDesignerScene";
import { FLOOR_OPTIONS, FURNITURE_LIST, HOUSE_MAX_ITEMS, WALL_OPTIONS } from "@/lib/house/house-catalog";
import { DEFAULT_HOUSE_CAMERA, setCameraPreset, turnCamera, zoomCamera } from "@/lib/house/house-camera";
import { canPlaceItem, nextRot, snapItem } from "@/lib/house/house-grid";
import { STARTER_HOUSE } from "@/lib/house/house-normalize";
import { downloadHouseLayoutJson, loadHouseLayout, saveHouseLayout } from "@/lib/house/house-storage";
import type {
  HouseDesignerCamera,
  HouseFloorId,
  HouseFurnitureId,
  HouseInteriorLayout,
  HouseRot,
  HouseTab,
  HouseWallId,
} from "@/lib/house/house-types";
import { PRIMARY_CHROME_CLASS, PRIMARY_CHROME_STYLE } from "@/lib/primary/primary-chrome";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";

type Props = {
  backHref: string;
  playHref: string;
  canExportStarter?: boolean;
};

function newItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `item-${Date.now()}`;
}

const btn = "rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-white";
const tabBtn = "min-h-11 rounded-lg px-4 py-2 text-sm font-bold";
const chip = "min-h-11 rounded-lg border-4 px-3 py-2 text-sm font-bold";

export function HouseDesigner({ backHref, playHref, canExportStarter = false }: Props) {
  const hydrated = useClientHydrated();
  const [layout, setLayout] = useState<HouseInteriorLayout>(STARTER_HOUSE);
  const [tab, setTab] = useState<HouseTab>("stuff");
  const [view, setView] = useState<HouseDesignerCamera>(DEFAULT_HOUSE_CAMERA);
  const [holding, setHolding] = useState<HouseFurnitureId | null>(null);
  const [holdRot, setHoldRot] = useState<HouseRot>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setLayout(loadHouseLayout());
  }, [hydrated]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1400);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const persist = (next: HouseInteriorLayout) => {
    setLayout(next);
    saveHouseLayout(next);
    setSaved(true);
  };

  const selected = layout.items.find((item) => item.id === selectedId) ?? null;

  const placeAt = (x: number, z: number) => {
    if (!holding) return;
    const snapped = snapItem(holding, x, z, holdRot);
    const nextItem = { id: newItemId(), kind: holding, rot: holdRot, ...snapped };
    if (canPlaceItem(layout.items, nextItem, HOUSE_MAX_ITEMS)) return;
    persist({ ...layout, items: [...layout.items, nextItem] });
    setSelectedId(nextItem.id);
    setHolding(null);
  };

  return (
    <div className={`${PRIMARY_CHROME_CLASS} relative h-[100dvh] w-full overflow-hidden bg-[#f4efe6]`} style={PRIMARY_CHROME_STYLE}>
      <HouseDesignerScene
        layout={layout}
        view={view}
        selectedId={selectedId}
        holding={holding}
        holdRot={holdRot}
        onSelectItem={(id) => {
          setSelectedId(id);
          if (id) setHolding(null);
        }}
        onPlace={placeAt}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-3">
        <div>
          <p className="text-sm font-extrabold text-slate-900">Design your house</p>
          <p className="text-xs font-semibold text-slate-700">
            {holding ? `Tap the floor to place a ${holding}.` : "Pick stuff, then tap the floor."}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <Link href={backHref} className={btn}>
            Back
          </Link>
          <Link href={playHref} className={btn}>
            Walk around
          </Link>
          {canExportStarter ? (
            <button type="button" className={btn} onClick={() => downloadHouseLayoutJson(layout)}>
              Save as starter
            </button>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex flex-wrap justify-center gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap justify-center gap-1 rounded-full bg-black/40 p-1">
          {(["door", "corner", "top"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-bold capitalize ${view.preset === preset ? "bg-white text-slate-900" : "text-white"}`}
              onClick={() => setView(setCameraPreset(view, preset))}
            >
              {preset}
            </button>
          ))}
          <button type="button" className="rounded-full px-3 py-1.5 text-sm font-bold text-white" onClick={() => setView(turnCamera(view, -1))}>
            ←
          </button>
          <button type="button" className="rounded-full px-3 py-1.5 text-sm font-bold text-white" onClick={() => setView(turnCamera(view, 1))}>
            →
          </button>
          <button type="button" className="rounded-full px-3 py-1.5 text-sm font-bold text-white" onClick={() => setView(zoomCamera(view, -1))}>
            Farther
          </button>
          <button type="button" className="rounded-full px-3 py-1.5 text-sm font-bold text-white" onClick={() => setView(zoomCamera(view, 1))}>
            Closer
          </button>
        </div>
      </div>

      {selected ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-36 z-10 flex justify-center gap-2">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-slate-900"
            onClick={() => {
              const rot = nextRot(selected.rot);
              const moved = { ...selected, rot, ...snapItem(selected.kind, selected.x, selected.z, rot) };
              if (canPlaceItem(layout.items, moved, HOUSE_MAX_ITEMS)) return;
              persist({ ...layout, items: layout.items.map((item) => (item.id === selected.id ? moved : item)) });
            }}
          >
            Spin
          </button>
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-rose-400 px-4 py-2 text-sm font-bold text-slate-900"
            onClick={() => {
              persist({ ...layout, items: layout.items.filter((item) => item.id !== selected.id) });
              setSelectedId(null);
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/95 to-transparent p-3 pt-8">
        <div className="pointer-events-auto mx-auto max-w-3xl">
          <div className="mb-2 flex gap-2">
            {(["floor", "walls", "stuff"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={`${tabBtn} ${tab === id ? "bg-[var(--pl-purple)] text-white" : "bg-white text-slate-900"}`}
                onClick={() => {
                  setTab(id);
                  if (id !== "stuff") setHolding(null);
                }}
              >
                {id === "floor" ? "Floor" : id === "walls" ? "Walls" : "Stuff"}
              </button>
            ))}
            <span className="ml-auto self-center text-xs font-bold text-slate-600">
              {saved ? "Saved" : `${layout.items.length}/${HOUSE_MAX_ITEMS} things`}
            </span>
            <button
              type="button"
              className={chip + " border-[var(--pl-border)] bg-white"}
              onClick={() => {
                persist(STARTER_HOUSE);
                setSelectedId(null);
                setHolding(null);
              }}
            >
              Reset
            </button>
          </div>

          {tab === "floor" ? (
            <div className="flex flex-wrap gap-2">
              {FLOOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${chip} ${layout.floor === option.id ? "border-[var(--pl-ink)] bg-[var(--pl-purple-soft)]" : "border-[var(--pl-border)] bg-white"}`}
                  onClick={() => persist({ ...layout, floor: option.id as HouseFloorId })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {tab === "walls" ? (
            <div className="flex flex-wrap gap-2">
              {WALL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${chip} ${layout.walls === option.id ? "border-[var(--pl-ink)] bg-[var(--pl-purple-soft)]" : "border-[var(--pl-border)] bg-white"}`}
                  onClick={() => persist({ ...layout, walls: option.id as HouseWallId })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {tab === "stuff" ? (
            <div className="flex flex-wrap gap-2">
              {FURNITURE_LIST.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${chip} ${holding === item.id ? "border-[var(--pl-ink)] bg-[var(--pl-purple)] text-white" : "border-[var(--pl-border)] bg-white"}`}
                  onClick={() => {
                    setHolding(holding === item.id ? null : item.id);
                    setSelectedId(null);
                    setHoldRot(0);
                  }}
                >
                  {item.label}
                </button>
              ))}
              {holding ? (
                <button type="button" className={`${chip} border-[var(--pl-border)] bg-white`} onClick={() => setHoldRot(nextRot(holdRot))}>
                  Spin piece
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { bugMarketMapDocumentSchema, type BugMarketMapDocument } from "@/lib/live-game/modes/bug-market/map-schema";

type Props = { maps: BugMarketMapDocument[] };
type Bounds = { x: number; y: number; w: number; h: number };
type EditSession = { mode: "move" | "resize"; pointerId: number; startX: number; startY: number; bounds: Bounds };
const GRID_SIZE = 16;

function boundsStyle(map: BugMarketMapDocument, bounds: Bounds) {
  return {
    left: `${bounds.x / map.size.widthPx * 100}%`, top: `${bounds.y / map.size.heightPx * 100}%`,
    width: `${bounds.w / map.size.widthPx * 100}%`, height: `${bounds.h / map.size.heightPx * 100}%`,
  };
}

export function BugMarketMapViewer({ maps }: Props) {
  const [editorMaps, setEditorMaps] = useState<BugMarketMapDocument[]>(() => structuredClone(maps));
  const [selectedId, setSelectedId] = useState(maps[0]?.id ?? "");
  const [selectedBarrierId, setSelectedBarrierId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const editSessionRef = useRef<EditSession | null>(null);
  const selected = useMemo(() => editorMaps.find((map) => map.id === selectedId) ?? editorMaps[0]!, [editorMaps, selectedId]);
  const selectedBarrier = selected?.collisionRects.find((barrier) => barrier.id === selectedBarrierId) ?? null;
  const validation = selected ? bugMarketMapDocumentSchema.safeParse(selected) : null;

  const updateBarrier = (id: string, bounds: Bounds) => {
    setEditorMaps((current) => current.map((map) => map.id !== selected.id ? map : {
      ...map, collisionRects: map.collisionRects.map((barrier) => barrier.id === id ? { ...barrier, ...bounds } : barrier),
    }));
  };

  const removeSelectedBarrier = () => {
    if (!selectedBarrierId) return;
    setEditorMaps((current) => current.map((map) => map.id !== selected.id ? map : {
      ...map, collisionRects: map.collisionRects.filter((barrier) => barrier.id !== selectedBarrierId),
    }));
    setSelectedBarrierId(null);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedBarrierId) {
        event.preventDefault();
        removeSelectedBarrier();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const beginEdit = (event: ReactPointerEvent<HTMLElement>, barrier: Bounds & { id: string }, mode: EditSession["mode"]) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedBarrierId(barrier.id);
    editSessionRef.current = { mode, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, bounds: { x: barrier.x, y: barrier.y, w: barrier.w, h: barrier.h } };
  };

  const continueEdit = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = editSessionRef.current;
    const canvas = canvasRef.current;
    if (!session || !canvas || session.pointerId !== event.pointerId || !selectedBarrierId) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (event.clientX - session.startX) / rect.width * selected.size.widthPx;
    const dy = (event.clientY - session.startY) / rect.height * selected.size.heightPx;
    const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
    if (session.mode === "move") {
      const x = Math.max(0, Math.min(selected.size.widthPx - session.bounds.w, snap(session.bounds.x + dx)));
      const y = Math.max(0, Math.min(selected.size.heightPx - session.bounds.h, snap(session.bounds.y + dy)));
      updateBarrier(selectedBarrierId, { ...session.bounds, x, y });
    } else {
      const w = Math.max(GRID_SIZE, Math.min(selected.size.widthPx - session.bounds.x, snap(session.bounds.w + dx)));
      const h = Math.max(GRID_SIZE, Math.min(selected.size.heightPx - session.bounds.y, snap(session.bounds.h + dy)));
      updateBarrier(selectedBarrierId, { ...session.bounds, w, h });
    }
  };

  const addBarrier = () => {
    const id = `barrier-${Date.now().toString(36)}`;
    const barrier = { id, x: 576, y: 320, w: 128, h: 64 };
    setEditorMaps((current) => current.map((map) => map.id !== selected.id ? map : { ...map, collisionRects: [...map.collisionRects, barrier] }));
    setSelectedBarrierId(id);
  };

  const resetSelectedMap = () => {
    const original = maps.find((map) => map.id === selected.id);
    if (!original) return;
    setEditorMaps((current) => current.map((map) => map.id === selected.id ? structuredClone(original) : map));
    setSelectedBarrierId(null);
  };

  const selectMap = (id: string) => { setSelectedId(id); setSelectedBarrierId(null); };

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-6 text-white sm:px-8">
      <header className="mx-auto mb-5 flex max-w-[1500px] flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-lime-300">Bug Market · map documents</p>
          <h1 className="mt-1 text-3xl font-black">Meadow collision editor</h1>
          <p className="mt-1 text-sm text-white/60">Arrange temporary cliff barriers while inspecting gameplay regions, spawns, and connections.</p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold">Schema v{selected.schemaVersion} · in memory</span>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[18rem_1fr]">
        <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-white/55">Registered meadows</h2>
          {editorMaps.map((map) => <button key={map.id} type="button" onClick={() => selectMap(map.id)} className={`w-full rounded-2xl border-2 p-3 text-left transition ${selected.id === map.id ? "border-lime-300 bg-lime-300/15" : "border-white/10 bg-black/20 hover:border-white/30"}`}><span className="block font-black">{map.title}</span><span className="mt-1 block text-[11px] text-white/55">{map.id}</span><span className="mt-2 block text-xs font-bold text-white/75">{map.collisionRects.length} barriers · {map.spawnPoints.length} spawns · {map.exits.length} exit</span></button>)}
          <section className="rounded-2xl bg-black/25 p-3 text-xs"><h2 className="font-black uppercase tracking-wider text-cyan-300">Connections</h2>{selected.exits.length ? selected.exits.map((exit) => <button key={exit.id} type="button" className="mt-2 block w-full rounded-xl bg-cyan-400/10 p-2 text-left font-bold text-cyan-100" onClick={() => selectMap(exit.destinationMapId)}>{exit.id}<span className="block text-[10px] font-medium text-cyan-100/60">→ {exit.destinationMapId} / {exit.destinationSpawnId}</span></button>) : <p className="mt-2 text-white/50">No connected meadow.</p>}</section>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{selected.title}</h2><p className="text-xs text-white/50">{selected.size.widthPx} × {selected.size.heightPx}px · {selected.terrain.tileSizePx}px terrain tile</p></div><div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider"><span className="rounded-full bg-rose-500/25 px-3 py-1 text-rose-200">Barrier</span><span className="rounded-full bg-lime-500/25 px-3 py-1 text-lime-200">Region</span><span className="rounded-full bg-cyan-500/25 px-3 py-1 text-cyan-200">Exit</span><span className="rounded-full bg-white/15 px-3 py-1">Spawn</span></div></div>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
            <button type="button" onClick={addBarrier} className="rounded-xl bg-rose-400 px-4 py-2 text-xs font-black text-rose-950">+ Add barrier</button>
            <button type="button" disabled={!selectedBarrier} onClick={removeSelectedBarrier} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black disabled:opacity-35">Delete selected</button>
            <button type="button" onClick={resetSelectedMap} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black">Reset meadow</button>
            <span className="ml-auto text-xs font-bold text-white/55">Grid: {GRID_SIZE}px · {selectedBarrier ? `${selectedBarrier.id} · x ${selectedBarrier.x}, y ${selectedBarrier.y}, ${selectedBarrier.w}×${selectedBarrier.h}` : "Select a pink barrier"}</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${validation?.success ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>{validation?.success ? "Valid map" : "Invalid map"}</span>
          </div>

          <div ref={canvasRef} onPointerMove={continueEdit} onPointerUp={() => { editSessionRef.current = null; }} onPointerCancel={() => { editSessionRef.current = null; }} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedBarrierId(null); }} className="relative aspect-video w-full touch-none overflow-hidden rounded-3xl border-4 border-white/15 shadow-2xl" style={{ backgroundColor: selected.terrain.backgroundColor, backgroundImage: `url('${selected.terrain.textureUrl}')`, backgroundPosition: "left top", backgroundRepeat: "repeat", backgroundSize: `${selected.terrain.tileSizePx}px ${selected.terrain.tileSizePx}px` }}>
            {selected.regions.map((region) => <div key={region.id} className="pointer-events-none absolute z-10 rounded-2xl border-2 border-dashed border-lime-200/80 bg-lime-300/10" style={boundsStyle(selected, region.displayBounds)}><span className="absolute left-2 top-2 rounded-full bg-lime-950/85 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-lime-100">{region.label}</span></div>)}
            {selected.collisionRects.map((barrier) => <div key={barrier.id} title={`${barrier.id} · drag to move`} onPointerDown={(event) => beginEdit(event, barrier, "move")} className={`absolute z-20 cursor-move border bg-rose-950/60 ${selectedBarrierId === barrier.id ? "border-4 border-yellow-200 shadow-[0_0_18px_#fde047]" : "border-rose-200/70"}`} style={boundsStyle(selected, barrier)}>{selectedBarrierId === barrier.id ? <button type="button" aria-label={`Resize ${barrier.id}`} onPointerDown={(event) => beginEdit(event, barrier, "resize")} className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-sm border-2 border-slate-950 bg-yellow-300" /> : null}</div>)}
            {selected.exits.map((exit) => <button key={exit.id} type="button" title={`Open ${exit.destinationMapId}`} onClick={() => selectMap(exit.destinationMapId)} className="absolute z-30 flex items-center justify-center border-2 border-cyan-100 bg-cyan-400/70 text-lg font-black text-cyan-950 shadow-[0_0_18px_#22d3ee]" style={boundsStyle(selected, exit)}>→</button>)}
            {selected.spawnPoints.map((spawn, index) => <div key={spawn.id} title={spawn.id} className="pointer-events-none absolute z-40 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-950 bg-white text-[10px] font-black text-slate-950 shadow-lg" style={{ left: `${spawn.x / selected.size.widthPx * 100}%`, top: `${spawn.y / selected.size.heightPx * 100}%` }}>{index + 1}</div>)}
          </div>
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">Collision edits are in-memory only in this slice. Drag a pink barrier to move it, use its yellow corner to resize, and press Delete to remove it. Saving/export comes after the interaction model is proven.</p>
        </section>
      </div>
    </main>
  );
}

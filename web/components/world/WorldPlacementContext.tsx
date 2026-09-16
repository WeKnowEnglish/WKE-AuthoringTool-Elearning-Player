"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadWorldPlacements, saveWorldPlacements } from "./world-placement-storage";
import { DEFAULT_WORLD_PLACEMENTS, type WorldPlacement } from "./world-placements";

type WorldPlacementContextValue = {
  placements: WorldPlacement[];
  selectedId: string | null;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  setSelectedId: (id: string | null) => void;
  updatePlacement: (id: string, patch: Partial<Pick<WorldPlacement, "localX" | "localZ" | "scale" | "yaw">>) => void;
  resetPlacements: () => void;
};

const WorldPlacementContext = createContext<WorldPlacementContextValue>({
  placements: DEFAULT_WORLD_PLACEMENTS,
  selectedId: null,
  editMode: false,
  setEditMode: () => {},
  setSelectedId: () => {},
  updatePlacement: () => {},
  resetPlacements: () => {},
});

export function WorldPlacementProvider({
  persist = false,
  children,
}: {
  persist?: boolean;
  children: ReactNode;
}) {
  const [placements, setPlacements] = useState<WorldPlacement[]>(() =>
    DEFAULT_WORLD_PLACEMENTS.map((placement) => ({ ...placement })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!persist) return;
    setPlacements(loadWorldPlacements());
  }, [persist]);

  const updatePlacement = useCallback(
    (id: string, patch: Partial<Pick<WorldPlacement, "localX" | "localZ" | "scale" | "yaw">>) => {
      setPlacements((current) => {
        const next = current.map((placement) => (placement.id === id ? { ...placement, ...patch } : placement));
        if (persist) saveWorldPlacements(next);
        return next;
      });
    },
    [persist],
  );

  const resetPlacements = useCallback(() => {
    const next = DEFAULT_WORLD_PLACEMENTS.map((placement) => ({ ...placement }));
    setPlacements(next);
    if (persist) saveWorldPlacements(next);
  }, [persist]);

  const value = useMemo(
    () => ({
      placements,
      selectedId,
      editMode,
      setEditMode,
      setSelectedId,
      updatePlacement,
      resetPlacements,
    }),
    [editMode, placements, resetPlacements, selectedId, updatePlacement],
  );

  return <WorldPlacementContext.Provider value={value}>{children}</WorldPlacementContext.Provider>;
}

export function useWorldPlacements(): WorldPlacementContextValue {
  return useContext(WorldPlacementContext);
}

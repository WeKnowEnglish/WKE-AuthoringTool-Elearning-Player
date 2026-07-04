"use client";

import { createContext, useCallback, useContext, useRef } from "react";

type BoardLayoutContextValue = {
  registerSpace: (index: number, element: HTMLElement | null) => void;
  getSpaceElement: (index: number) => HTMLElement | null;
  boardRef: React.RefObject<HTMLDivElement | null>;
};

export const BoardLayoutContext = createContext<BoardLayoutContextValue | null>(null);

export function useBoardLayout() {
  const ctx = useContext(BoardLayoutContext);
  if (!ctx) throw new Error("useBoardLayout must be used within BoardLayoutProvider");
  return ctx;
}

export function useBoardLayoutRegistry() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const spacesRef = useRef<Map<number, HTMLElement>>(new Map());

  const registerSpace = useCallback((index: number, element: HTMLElement | null) => {
    if (element) spacesRef.current.set(index, element);
    else spacesRef.current.delete(index);
  }, []);

  const getSpaceElement = useCallback((index: number) => {
    return spacesRef.current.get(index) ?? null;
  }, []);

  return { boardRef, registerSpace, getSpaceElement };
}

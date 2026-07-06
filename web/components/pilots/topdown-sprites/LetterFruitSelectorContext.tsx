"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LETTER_FRUIT_SLUGS,
  letterFruitAtlasIdForSlug,
  type LetterFruitSlug,
} from "@/lib/topdown/letter-fruit-variants";

const STORAGE_KEY = "letter-fruit-selected-slug";

type LetterFruitSelectorContextValue = {
  slug: LetterFruitSlug;
  atlasId: ReturnType<typeof letterFruitAtlasIdForSlug>;
  setSlug: (slug: LetterFruitSlug) => void;
};

const LetterFruitSelectorContext =
  createContext<LetterFruitSelectorContextValue | null>(null);

function isLetterFruitSlug(value: string): value is LetterFruitSlug {
  return LETTER_FRUIT_SLUGS.includes(value as LetterFruitSlug);
}

function readStoredSlug(): LetterFruitSlug {
  if (typeof window === "undefined") return "a";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isLetterFruitSlug(raw)) return raw;
  } catch {
    // ignore
  }
  return "a";
}

export function LetterFruitSelectorProvider({ children }: { children: ReactNode }) {
  const [slug, setSlugState] = useState<LetterFruitSlug>("a");

  useEffect(() => {
    setSlugState(readStoredSlug());
  }, []);

  const setSlug = useCallback((next: LetterFruitSlug) => {
    setSlugState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore quota errors
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      slug,
      atlasId: letterFruitAtlasIdForSlug(slug),
      setSlug,
    }),
    [slug, setSlug],
  );

  return (
    <LetterFruitSelectorContext.Provider value={value}>
      {children}
    </LetterFruitSelectorContext.Provider>
  );
}

export function useLetterFruitSelector() {
  const ctx = useContext(LetterFruitSelectorContext);
  if (!ctx) {
    throw new Error(
      "useLetterFruitSelector must be used within LetterFruitSelectorProvider",
    );
  }
  return ctx;
}

export function useOptionalLetterFruitSelector() {
  return useContext(LetterFruitSelectorContext);
}

export function useLetterFruitSlug(): LetterFruitSlug {
  return useLetterFruitSelector().slug;
}

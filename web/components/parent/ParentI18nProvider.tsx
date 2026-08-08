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
import { writeParentLangCookie } from "@/lib/parent/i18n/cookie";
import {
  translateParent,
  type ParentLocale,
  type ParentMessageKey,
} from "@/lib/parent/i18n";

type ParentI18nContextValue = {
  locale: ParentLocale;
  setLocale: (locale: ParentLocale) => void;
  t: (key: ParentMessageKey, vars?: Record<string, string | number>) => string;
};

const ParentI18nContext = createContext<ParentI18nContextValue | null>(null);

export function ParentI18nProvider(props: {
  initialLocale: ParentLocale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<ParentLocale>(props.initialLocale);

  useEffect(() => {
    setLocaleState(props.initialLocale);
  }, [props.initialLocale]);

  const setLocale = useCallback((next: ParentLocale) => {
    setLocaleState(next);
    writeParentLangCookie(next);
  }, []);

  const value = useMemo<ParentI18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translateParent(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return (
    <ParentI18nContext.Provider value={value}>{props.children}</ParentI18nContext.Provider>
  );
}

export function useParentI18n(): ParentI18nContextValue {
  const ctx = useContext(ParentI18nContext);
  if (!ctx) {
    throw new Error("useParentI18n must be used within ParentI18nProvider.");
  }
  return ctx;
}

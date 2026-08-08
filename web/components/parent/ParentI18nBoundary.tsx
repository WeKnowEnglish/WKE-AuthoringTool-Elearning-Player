"use client";

import { ParentI18nProvider } from "@/components/parent/ParentI18nProvider";
import type { ParentLocale } from "@/lib/parent/i18n";

/** Client boundary so server pages can pass the resolved parent locale. */
export function ParentI18nBoundary(props: {
  locale: ParentLocale;
  children: React.ReactNode;
}) {
  return (
    <ParentI18nProvider initialLocale={props.locale}>{props.children}</ParentI18nProvider>
  );
}

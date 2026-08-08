"use client";

import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import type { ParentLocale } from "@/lib/parent/i18n";

export function ParentLanguageToggle(props: { className?: string }) {
  const { locale, setLocale, t } = useParentI18n();

  function select(next: ParentLocale) {
    if (next === locale) return;
    setLocale(next);
  }

  return (
    <div
      className={props.className}
      role="group"
      aria-label={t("login.language")}
    >
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {t("login.language")}
      </p>
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => select("en")}
          aria-pressed={locale === "en"}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
            locale === "en"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {t("login.languageEn")}
        </button>
        <button
          type="button"
          onClick={() => select("vi")}
          aria-pressed={locale === "vi"}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
            locale === "vi"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {t("login.languageVi")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { updateParentPreferredLanguage } from "@/lib/actions/parent-notifications";
import type { ParentLocale } from "@/lib/parent/i18n";

type Props = {
  className?: string;
  /** full = login label + buttons; compact = header EN | VI chip */
  variant?: "full" | "compact";
  /** When true (signed-in portal), also save preferred_language on the account. */
  persistAccount?: boolean;
};

export function ParentLanguageToggle({
  className,
  variant = "full",
  persistAccount = false,
}: Props) {
  const { locale, setLocale, t } = useParentI18n();

  function select(next: ParentLocale) {
    if (next === locale) return;
    setLocale(next);
    if (persistAccount) {
      void updateParentPreferredLanguage(next);
    }
  }

  if (variant === "compact") {
    return (
      <div
        className={className}
        role="group"
        aria-label={t("login.language")}
      >
        <div className="inline-flex rounded-xl border border-slate-300 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => select("en")}
            aria-pressed={locale === "en"}
            title={t("login.languageEn")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-extrabold transition ${
              locale === "en"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => select("vi")}
            aria-pressed={locale === "vi"}
            title={t("login.languageVi")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-extrabold transition ${
              locale === "vi"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            VI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
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

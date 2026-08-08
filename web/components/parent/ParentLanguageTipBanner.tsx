"use client";

import { useEffect, useState } from "react";
import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { updateParentPreferredLanguage } from "@/lib/actions/parent-notifications";

const TIP_DISMISS_KEY = "wke-parent-lang-tip-dismissed";

/**
 * One-time soft tip when the portal is still in English — points parents to VI
 * without blocking the page. Hidden after dismiss or choosing Vietnamese.
 */
export function ParentLanguageTipBanner() {
  const { locale, setLocale, t } = useParentI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (locale === "vi") {
      setVisible(false);
      return;
    }
    try {
      if (window.localStorage.getItem(TIP_DISMISS_KEY) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      // private mode
    }
    setVisible(true);
  }, [locale]);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(TIP_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function chooseVi() {
    setLocale("vi");
    void updateParentPreferredLanguage("vi");
    dismiss();
  }

  return (
    <div className="border-b border-indigo-100 bg-indigo-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="text-sm font-semibold text-indigo-950">{t("langTip.message")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={chooseVi}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-indigo-700"
          >
            {t("langTip.chooseVi")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-extrabold text-indigo-900 hover:bg-indigo-100"
          >
            {t("langTip.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { clsx } from "clsx";
import { useEffect } from "react";
import { PortalLoginPanel, type PortalKind } from "@/components/auth/PortalLoginPanel";
import type { LearningBand } from "@/lib/learning-band";

type Props = {
  open: boolean;
  learningBand: LearningBand;
  defaultPortal?: PortalKind;
  nextPath?: string;
  onClose: () => void;
};

export function PortalLoginModal({
  open,
  learningBand,
  defaultPortal = "student",
  nextPath,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-login-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-kid-ink/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative z-10 max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto",
          "rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-5 shadow-xl sm:p-6",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="portal-login-title" className="text-xl font-extrabold text-kid-ink">
              Sign in to save progress
            </h2>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              Students use a username and secret code. Teachers use email.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border-2 border-kid-ink px-2.5 py-1 text-sm font-bold [touch-action:manipulation] hover:bg-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <PortalLoginPanel
          learningBand={learningBand}
          defaultPortal={defaultPortal}
          nextPath={nextPath}
        />
      </div>
    </div>
  );
}

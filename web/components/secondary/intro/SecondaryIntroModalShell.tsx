import clsx from "clsx";
import type { ReactNode } from "react";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type Props = {
  title: string;
  titleId: string;
  description: string;
  descriptionId: string;
  liveMessage: string;
  children: ReactNode;
  footer: ReactNode;
  dialogRef?: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
  backdropZIndexClass?: string;
  zIndexClass?: string;
  maxWidthClass?: string;
};

/** Shared centered modal shell for secondary intro overlays (P7A / P7B). */
export function SecondaryIntroModalShell({
  title,
  titleId,
  description,
  descriptionId,
  liveMessage,
  children,
  footer,
  dialogRef,
  visible,
  backdropZIndexClass = "z-[70]",
  zIndexClass = "z-[71]",
  maxWidthClass = "max-w-lg",
}: Props) {
  return (
    <>
      <div
        className={clsx(
          `fixed inset-0 ${backdropZIndexClass} bg-black/40 transition-opacity duration-200 motion-reduce:transition-none`,
          visible ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={clsx(
          `fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 transition-[opacity,transform] duration-200 motion-reduce:transition-none`,
          visible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div
          className={clsx(
            `flex max-h-[min(85dvh,640px)] w-full ${maxWidthClass} flex-col rounded-2xl border-2 border-sec-ink bg-white shadow-2xl transition-transform duration-200 motion-reduce:transition-none motion-reduce:transform-none`,
            visible ? "scale-100" : "scale-[0.98]",
          )}
        >
          <p className="sr-only" aria-live="polite">
            {liveMessage}
          </p>

          <header className="shrink-0 border-b-2 border-sec-ink/15 px-5 py-4">
            <h2 className={secondaryUi.pageTitle} id={titleId}>
              {title}
            </h2>
            <p className={`mt-1 ${secondaryUi.bodyMuted}`} id={descriptionId}>
              {description}
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          <footer className="shrink-0 border-t-2 border-sec-ink/15 px-5 py-4">{footer}</footer>
        </div>
      </div>
    </>
  );
}

export const secondaryIntroModalFooterClass =
  "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-stretch";

export const secondaryIntroModalButtonClass = "!min-h-11 w-full !min-w-0 text-base sm:w-auto sm:flex-1";

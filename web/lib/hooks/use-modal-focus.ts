import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

type UseModalFocusOptions = {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

export function useModalFocus({
  open,
  containerRef,
  returnFocusRef,
  initialFocusRef,
}: UseModalFocusOptions): void {
  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = getFocusableElements(container);
    const initialTarget =
      initialFocusRef?.current ?? focusables[0] ?? container;
    initialTarget.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      const trapFocusables = getFocusableElements(currentContainer);
      if (trapFocusables.length === 0) return;

      const first = trapFocusables[0];
      const last = trapFocusables[trapFocusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", onKeyDown);

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      const returnTarget = returnFocusRef.current ?? previouslyFocused;
      returnTarget?.focus();
    };
  }, [open, containerRef, returnFocusRef, initialFocusRef]);
}

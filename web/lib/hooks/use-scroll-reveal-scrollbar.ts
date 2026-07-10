import { useCallback, useEffect, useRef } from "react";

const SCROLLING_CLASS = "is-scrolling";
const HIDE_DELAY_MS = 1000;

export function useScrollRevealScrollbar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScrollingClass = useCallback(() => {
    ref.current?.classList.remove(SCROLLING_CLASS);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onScroll = () => {
      element.classList.add(SCROLLING_CLASS);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(clearScrollingClass, HIDE_DELAY_MS);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [clearScrollingClass]);

  return ref;
}

"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  label: ReactNode;
  active?: boolean;
  align?: "left" | "right";
  children: ReactNode;
  /** Accessible name when label is an icon. */
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
};

type MenuCoords = {
  top: number;
  left?: number;
  right?: number;
};

function useFinePointerHover() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return enabled;
}

/**
 * Click/tap toggle dropdown for the teacher chrome.
 * Hover-open only on fine pointers (mouse). Menu is portaled + fixed so
 * header overflow clipping cannot trap it or create header scrollbars.
 */
export function TeacherNavDropdown({
  label,
  active = false,
  align = "left",
  children,
  ariaLabel,
  className = "",
  triggerClassName = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<MenuCoords>({ top: 0 });
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const hoverEnabled = useFinePointerHover();

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (!hoverEnabled) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer, hoverEnabled]);

  const openMenu = useCallback(() => {
    if (!hoverEnabled) return;
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer, hoverEnabled]);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    setPortalTarget(
      rootRef.current.closest<HTMLElement>("[data-teacher-root]") ??
        document.body,
    );
  }, []);

  const updateCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gutter = 8;
    if (align === "right") {
      setCoords({
        top: rect.bottom + 4,
        right: Math.max(gutter, window.innerWidth - rect.right),
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left: Math.min(
          Math.max(gutter, rect.left),
          window.innerWidth - gutter - 192,
        ),
      });
    }
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener("resize", updateCoords);
    // Capture scroll from nested containers too.
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const menuStyle: CSSProperties = {
    position: "fixed",
    top: coords.top,
    left: coords.left,
    right: coords.right,
    zIndex: 200,
  };

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      className="teacher-nav-menu min-w-[12rem]"
      style={menuStyle}
      onMouseEnter={hoverEnabled ? openMenu : undefined}
      onMouseLeave={hoverEnabled ? scheduleClose : undefined}
      onClick={(event) => {
        // Close after navigation picks; leave theme/settings controls alone.
        const el = event.target as HTMLElement | null;
        if (el?.closest('a[href], [role="menuitem"]')) closeMenu();
      }}
    >
      <div className="teacher-nav-menu-panel rounded-lg border px-1 py-1 shadow-lg">
        {children}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onMouseEnter={hoverEnabled ? openMenu : undefined}
      onMouseLeave={hoverEnabled ? scheduleClose : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        className={
          triggerClassName ||
          "teacher-tab inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm"
        }
        data-active={active ? "true" : "false"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => {
          clearCloseTimer();
          setOpen((value) => !value);
        }}
      >
        {label}
        {!ariaLabel ? (
          <span className="teacher-chrome-muted text-[0.65em]" aria-hidden>
            ▾
          </span>
        ) : null}
      </button>
      {mounted && portalTarget && menu
        ? createPortal(menu, portalTarget)
        : null}
    </div>
  );
}

export function TeacherNavMenuLink({
  href,
  children,
  onClick,
  active = false,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      data-active={active ? "true" : "false"}
      className="teacher-nav-menu-item block rounded-md px-2.5 py-1.5 text-sm font-medium"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function TeacherNavMenuButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="teacher-nav-menu-item block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-medium"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TeacherNavMenuDivider() {
  return <div className="teacher-nav-menu-divider my-1 h-px" role="separator" />;
}

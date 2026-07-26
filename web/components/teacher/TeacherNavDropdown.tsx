"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

/**
 * Hover (desktop) + click/tap toggle dropdown for the teacher chrome.
 * Stays open while pointer is over the menu; closes on outside click / Escape.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={
          triggerClassName ||
          `teacher-tab inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold sm:px-2.5 sm:py-1.5 sm:text-sm ${
            active ? "" : ""
          }`
        }
        data-active={active ? "true" : "false"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        {!ariaLabel ? (
          <span className="teacher-chrome-muted text-[0.65em]" aria-hidden>
            ▾
          </span>
        ) : null}
      </button>
      <div
        id={menuId}
        role="menu"
        className={`teacher-nav-menu absolute top-full z-50 min-w-[12rem] pt-1 ${
          align === "right" ? "right-0" : "left-0"
        } ${open ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0"}`}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div className="teacher-nav-menu-panel rounded-lg border px-1 py-1 shadow-lg">
          {children}
        </div>
      </div>
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

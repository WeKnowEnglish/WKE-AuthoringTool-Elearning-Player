import type { HTMLAttributes, ReactNode } from "react";
import {
  PRIMARY_CHROME_CLASS,
  PRIMARY_CHROME_STYLE,
} from "@/lib/primary/primary-chrome";

type Props = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "style">;

/** Applies Primary --pl-* tokens + Nunito for overlays and homework pages. */
export function PrimaryChrome({ children, className = "", ...rest }: Props) {
  return (
    <div
      className={`${PRIMARY_CHROME_CLASS} ${className}`.trim()}
      style={PRIMARY_CHROME_STYLE}
      {...rest}
    >
      {children}
    </div>
  );
}

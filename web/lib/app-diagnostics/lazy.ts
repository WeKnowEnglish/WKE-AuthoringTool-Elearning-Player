"use client";

import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";
import type { AppDiagnosticSurface } from "@/lib/app-diagnostics/types";

// Mirrors React.lazy typing — props vary per interaction view.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithDiagnostics<T extends ComponentType<any>>(
  name: string,
  factory: () => Promise<{ default: T }>,
  surface: AppDiagnosticSurface = "lesson",
): LazyExoticComponent<T> {
  return lazy(async () => {
    const startedAt = performance.now();
    recordAppDiagnostic(surface, "chunk", `${name}_start`);
    try {
      const module = await factory();
      recordAppDiagnostic(
        surface,
        "chunk",
        name,
        { success: true },
        { kind: "span", durationMs: Math.max(0, performance.now() - startedAt) },
      );
      return module;
    } catch (error) {
      recordAppDiagnostic(
        surface,
        "chunk",
        name,
        { error: error instanceof Error ? error.message : String(error) },
        { kind: "error", durationMs: Math.max(0, performance.now() - startedAt) },
      );
      throw error;
    }
  });
}

"use client";

import { useState } from "react";
import type { GrammarModule } from "@/lib/grammar-builder/schema";
import { formatGrammarModuleJson } from "@/lib/grammar-builder/editor/export-grammar-module";

type Props = {
  module: GrammarModule;
};

export function GrammarPosterJsonPanel({ module }: Props) {
  const [open, setOpen] = useState(false);
  const json = formatGrammarModuleJson(module);

  return (
    <section className="rounded-xl border-2 border-kid-ink/15 bg-white/80 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left text-xs font-extrabold uppercase tracking-wide text-kid-ink/60"
      >
        JSON preview
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ?
        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-kid-ink/5 p-2 text-[10px] leading-relaxed text-kid-ink/80">
          {json}
        </pre>
      : null}
    </section>
  );
}

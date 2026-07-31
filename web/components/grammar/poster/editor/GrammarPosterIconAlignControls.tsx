"use client";

import { clsx } from "clsx";
import type { GrammarAlign } from "@/lib/grammar-builder/schema";
import { isAllowedGrammarGraphicUrl } from "@/lib/grammar-builder/graphic-asset";
import { EditorFieldLabel, EditorTextInput } from "./fields/EditorFields";

export const GRAMMAR_POSTER_ICON_PRESETS = [
  "📘",
  "📚",
  "🥛",
  "🪑",
  "⭐",
  "💧",
  "👧👦",
  "🐱",
  "❓",
  "✅",
  "👍",
  "✏️",
] as const;

type Props = {
  emoji: string;
  imageUrl?: string;
  align: GrammarAlign;
  onEmojiChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onAlignChange: (value: GrammarAlign) => void;
  showAlign?: boolean;
};

export function GrammarPosterIconAlignControls({
  emoji,
  imageUrl = "",
  align,
  onEmojiChange,
  onImageUrlChange,
  onAlignChange,
  showAlign = true,
}: Props) {
  const urlError =
    imageUrl.trim().length > 0 && !isAllowedGrammarGraphicUrl(imageUrl) ?
      "Use https://, http://, or a /path"
    : null;

  return (
    <div className="space-y-2">
      <div>
        <EditorFieldLabel>Icon presets</EditorFieldLabel>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {GRAMMAR_POSTER_ICON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onEmojiChange(preset)}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-lg border-2 text-lg transition",
                emoji === preset && !imageUrl ?
                  "border-kid-cta bg-kid-cta/30"
                : "border-kid-ink/20 bg-white hover:border-kid-ink/50",
              )}
              aria-label={`Use icon ${preset}`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <EditorFieldLabel>Emoji (custom)</EditorFieldLabel>
        <EditorTextInput
          value={emoji}
          onChange={onEmojiChange}
          placeholder="📘"
        />
      </div>

      <div>
        <EditorFieldLabel>Custom image URL</EditorFieldLabel>
        <EditorTextInput
          value={imageUrl}
          onChange={onImageUrlChange}
          placeholder="https://… or /images/icon.png"
        />
        {urlError ?
          <p className="mt-1 text-xs font-semibold text-amber-800">{urlError}</p>
        : <p className="mt-1 text-xs font-medium text-kid-ink/45">
            URL icons override emoji when valid.
          </p>
        }
      </div>

      {showAlign ?
        <div>
          <EditorFieldLabel>Justification</EditorFieldLabel>
          <div className="mt-1 flex overflow-hidden rounded-lg border-2 border-kid-ink/20">
            {(["left", "center", "right"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onAlignChange(option)}
                className={clsx(
                  "flex-1 px-2 py-1.5 text-xs font-extrabold uppercase tracking-wide",
                  align === option ?
                    "bg-kid-cta text-kid-ink"
                  : "bg-white text-kid-ink/60 hover:bg-kid-panel",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      : null}
    </div>
  );
}

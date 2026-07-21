"use client";

import { useId, useState } from "react";
import { normalizeTopicTag } from "@/lib/vocabulary/platform-lexicon";

type Props = {
  tags: readonly string[];
  onChange: (tags: string[]) => void;
  onCommit?: (tags: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  /** Tags that cannot be removed (e.g. primary topic mirrored into topics). */
  lockedTags?: readonly string[];
  className?: string;
};

/**
 * Chip editor for topic / subtopic tags.
 * Type a tag and press Enter or comma to add; click × to remove.
 */
export function TopicTagsInput({
  tags,
  onChange,
  onCommit,
  suggestions = [],
  placeholder = "Add subtopic…",
  disabled = false,
  lockedTags = [],
  className = "",
}: Props) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const locked = new Set(
    lockedTags.map((t) => normalizeTopicTag(t) ?? t).filter(Boolean) as string[],
  );

  function commitDraft() {
    const tag = normalizeTopicTag(draft);
    if (!tag) {
      setDraft("");
      return;
    }
    if (tags.includes(tag)) {
      setDraft("");
      return;
    }
    const next = [...tags, tag];
    onChange(next);
    onCommit?.(next);
    setDraft("");
  }

  function removeTag(tag: string) {
    if (locked.has(tag)) return;
    const next = tags.filter((t) => t !== tag);
    onChange(next);
    onCommit?.(next);
  }

  return (
    <div
      className={`flex min-w-[12rem] flex-wrap items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-1 focus-within:border-neutral-900 ${className}`}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-800"
        >
          {tag}
          {!disabled && !locked.has(tag) ? (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-neutral-500 hover:text-neutral-900"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
      <input
        value={draft}
        disabled={disabled}
        list={suggestions.length > 0 ? listId : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitDraft();
          } else if (e.key === "Backspace" && !draft && tags.length > 0) {
            const last = tags[tags.length - 1]!;
            if (!locked.has(last)) removeTag(last);
          }
        }}
        onBlur={() => {
          if (draft.trim()) commitDraft();
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
        aria-label="Add subtopic"
      />
      {suggestions.length > 0 ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

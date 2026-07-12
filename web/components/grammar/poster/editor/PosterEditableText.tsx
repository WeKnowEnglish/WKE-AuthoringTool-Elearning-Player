"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePosterInlineEdit } from "./PosterInlineEditContext";

type Variant =
  | "header-title"
  | "header-subtitle"
  | "glance-rule"
  | "glance-highlight"
  | "example-sentence"
  | "example-highlight"
  | "emoji"
  | "caption"
  | "column-title"
  | "body-text"
  | "banner-highlight"
  | "formula-mono";

type Props = {
  cardId: number;
  fieldKey: string;
  value: string;
  variant: Variant;
  maxLength?: number;
  placeholder?: string;
  trimOnCommit?: boolean;
  children: ReactNode;
};

const VARIANT_CLASS: Record<Variant, { display: string; input: string; wrapper?: "span" | "div" }> =
  {
    "header-title": {
      display: "",
      input:
        "w-full rounded-md border-2 border-white/80 bg-white/15 px-2 py-1 text-sm font-extrabold uppercase leading-snug text-white outline-none focus:border-white md:text-base",
      wrapper: "span",
    },
    "header-subtitle": {
      display: "",
      input:
        "w-full rounded-md border-2 border-white/70 bg-white/15 px-2 py-0.5 text-xs font-bold uppercase leading-tight text-white outline-none focus:border-white md:text-sm",
      wrapper: "span",
    },
    "glance-rule": {
      display: "text-balance text-xl font-extrabold leading-snug text-kid-ink md:text-2xl",
      input:
        "w-full rounded-lg border-2 border-kid-cta/50 bg-white px-2 py-1 text-xl font-extrabold leading-snug text-kid-ink outline-none focus:border-kid-cta md:text-2xl",
      wrapper: "div",
    },
    "glance-highlight": {
      display: "",
      input:
        "w-full rounded-md border-2 border-kid-ink/20 bg-white px-2 py-1 text-xs font-bold uppercase tracking-wide text-kid-ink outline-none focus:border-kid-cta",
      wrapper: "span",
    },
    "example-sentence": {
      display: "",
      input:
        "w-full rounded-lg border-2 border-kid-cta/50 bg-white px-2 py-1 text-lg font-semibold leading-snug text-kid-ink outline-none focus:border-kid-cta md:text-xl",
      wrapper: "span",
    },
    "example-highlight": {
      display: "",
      input:
        "w-full rounded-md border-2 border-kid-ink/20 bg-white px-2 py-1 text-xs font-bold uppercase tracking-wide text-kid-ink outline-none focus:border-kid-cta",
      wrapper: "span",
    },
    emoji: {
      display: "",
      input:
        "w-16 rounded-lg border-2 border-kid-cta/50 bg-white px-1 py-1 text-center text-2xl outline-none focus:border-kid-cta md:text-4xl",
      wrapper: "span",
    },
    caption: {
      display: "",
      input:
        "w-full rounded-md border-2 border-kid-ink/20 bg-white px-2 py-1 text-sm font-semibold text-kid-ink outline-none focus:border-kid-cta",
      wrapper: "span",
    },
    "column-title": {
      display: "",
      input:
        "w-full rounded-md border-2 border-kid-cta/40 bg-white px-2 py-1 text-xs font-extrabold uppercase text-kid-ink outline-none focus:border-kid-cta md:text-sm",
      wrapper: "span",
    },
    "body-text": {
      display: "",
      input:
        "w-full rounded-lg border-2 border-kid-cta/50 bg-white px-2 py-1 text-base font-semibold leading-snug text-kid-ink outline-none focus:border-kid-cta md:text-lg",
      wrapper: "span",
    },
    "banner-highlight": {
      display: "",
      input:
        "w-full rounded-md border-2 border-kid-cta/50 bg-white px-2 py-1 text-sm font-extrabold uppercase tracking-wide text-kid-ink outline-none focus:border-kid-cta md:text-base",
      wrapper: "span",
    },
    "formula-mono": {
      display: "",
      input:
        "w-full rounded-md border-2 border-kid-cta/40 bg-white px-2 py-1 font-mono text-sm font-extrabold text-kid-ink outline-none focus:border-kid-cta md:text-base",
      wrapper: "span",
    },
  };

export function PosterEditableText({
  cardId,
  fieldKey,
  value,
  variant,
  maxLength,
  placeholder,
  trimOnCommit = true,
  children,
}: Props) {
  const inlineEdit = usePosterInlineEdit();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftValue, setDraftValue] = useState(value);

  const enabled = inlineEdit?.enabled ?? false;
  const isCardSelected = inlineEdit?.selectedCardId === cardId;
  const isActive = inlineEdit?.activeFieldKey === fieldKey;
  const canEdit = enabled && isCardSelected;
  const styles = VARIANT_CLASS[variant];
  const Wrapper = styles.wrapper ?? "span";

  useEffect(() => {
    if (!isActive) {
      setDraftValue(value);
    }
  }, [value, isActive]);

  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isActive]);

  if (!enabled) {
    return <>{children}</>;
  }

  function commit() {
    const nextValue = trimOnCommit ? draftValue.trim() : draftValue;
    inlineEdit?.onCommitField(fieldKey, nextValue);
  }

  function cancel() {
    setDraftValue(value);
    inlineEdit?.onDeactivateField();
  }

  if (isActive) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draftValue}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commit}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className={styles.input}
        aria-label="Edit poster text"
      />
    );
  }

  const headerVariant = variant === "header-title" || variant === "header-subtitle";

  return (
    <Wrapper
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={(event) => {
        event.stopPropagation();
        if (!inlineEdit) {
          return;
        }
        if (!isCardSelected) {
          inlineEdit.onSelectCard(cardId);
          return;
        }
        inlineEdit.onActivateField(fieldKey);
      }}
      onKeyDown={(event) => {
        if (!canEdit || !inlineEdit) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          inlineEdit.onActivateField(fieldKey);
        }
      }}
      className={clsx(
        styles.display,
        canEdit &&
          "cursor-text rounded-sm underline decoration-dashed decoration-kid-cta/50 underline-offset-4 hover:bg-kid-cta/10",
        headerVariant ? canEdit && "hover:bg-white/15 decoration-white/70" : null,
      )}
      title={canEdit ? "Click to edit on poster" : undefined}
    >
      {children}
    </Wrapper>
  );
}

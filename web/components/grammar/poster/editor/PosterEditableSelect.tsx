"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePosterInlineEdit } from "./PosterInlineEditContext";

type Props = {
  cardId: number;
  fieldKey: string;
  value: string;
  options: { value: string; label: string }[];
  children: ReactNode;
  ariaLabel?: string;
};

export function PosterEditableSelect({
  cardId,
  fieldKey,
  value,
  options,
  children,
  ariaLabel = "Edit poster option",
}: Props) {
  const inlineEdit = usePosterInlineEdit();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [draftValue, setDraftValue] = useState(value);

  const enabled = inlineEdit?.enabled ?? false;
  const isCardSelected = inlineEdit?.selectedCardId === cardId;
  const isActive = inlineEdit?.activeFieldKey === fieldKey;
  const canEdit = enabled && isCardSelected;

  useEffect(() => {
    if (!isActive) {
      setDraftValue(value);
    }
  }, [value, isActive]);

  useEffect(() => {
    if (isActive) {
      selectRef.current?.focus();
    }
  }, [isActive]);

  if (!enabled) {
    return <>{children}</>;
  }

  function commit() {
    inlineEdit?.onCommitField(fieldKey, draftValue);
  }

  function cancel() {
    setDraftValue(value);
    inlineEdit?.onDeactivateField();
  }

  if (isActive) {
    return (
      <select
        ref={selectRef}
        value={draftValue}
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
        className="rounded-md border-2 border-kid-cta/50 bg-white px-2 py-1 text-sm font-semibold text-kid-ink outline-none focus:border-kid-cta"
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
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
        canEdit &&
          "cursor-pointer rounded-sm underline decoration-dashed decoration-kid-cta/50 underline-offset-4 hover:bg-kid-cta/10",
      )}
      title={canEdit ? "Click to edit on poster" : undefined}
    >
      {children}
    </span>
  );
}

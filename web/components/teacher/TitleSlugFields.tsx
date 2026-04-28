"use client";

import { useCallback, useRef } from "react";

function slugifyTitle(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Pairs title + slug inputs. Slug follows title until the teacher edits slug.
 */
export function TitleSlugFields({
  titleName = "title",
  slugName = "slug",
  titleLabel = "Title",
  slugLabel = "Slug (URL)",
  slugPlaceholder = "e.g. unit-2-park",
}: {
  titleName?: string;
  slugName?: string;
  titleLabel?: string;
  slugLabel?: string;
  slugPlaceholder?: string;
}) {
  const slugEditedByUser = useRef(false);

  const onSlugInput = useCallback(() => {
    slugEditedByUser.current = true;
  }, []);

  const onTitleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (slugEditedByUser.current) return;
      const form = e.currentTarget.form;
      if (!form) return;
      const slugInput = form.elements.namedItem(slugName) as
        | HTMLInputElement
        | undefined;
      if (!slugInput) return;
      const s = slugifyTitle(e.currentTarget.value);
      slugInput.value = s;
    },
    [slugName],
  );

  const onTitleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (slugEditedByUser.current) return;
      const form = e.currentTarget.form;
      if (!form) return;
      const slugInput = form.elements.namedItem(slugName) as
        | HTMLInputElement
        | undefined;
      if (!slugInput) return;
      const s = slugifyTitle(e.currentTarget.value);
      if (s) slugInput.value = s;
    },
    [slugName],
  );

  return (
    <>
      <div>
        <label className="block text-sm font-medium" htmlFor={titleName}>
          {titleLabel}
        </label>
        <input
          id={titleName}
          name={titleName}
          required
          onInput={onTitleInput}
          onBlur={onTitleBlur}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor={slugName}>
          {slugLabel}
        </label>
        <input
          id={slugName}
          name={slugName}
          required
          placeholder={slugPlaceholder}
          onInput={onSlugInput}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Fills from title automatically; edit this field if you want a custom
          URL slug.
        </p>
      </div>
    </>
  );
}

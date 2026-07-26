"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ClassroomFormatIcon,
  classroomFormatLabel,
} from "@/components/teacher-space/ClassroomFormatIcon";
import {
  removeSpaceItem,
  reorderMySpaceItems,
  saveTeacherSpaceSettings,
} from "@/lib/actions/teacher-space";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import {
  CLASSROOM_THEME_IDS,
  CLASSROOM_THEMES,
  type ClassroomThemeId,
} from "@/lib/teacher-space/themes";
import type {
  TeacherSpaceItemSummary,
  TeacherSpaceSummary,
} from "@/lib/teacher-space/types";

type Props = {
  space: TeacherSpaceSummary | null;
  items: TeacherSpaceItemSummary[];
  origin: string;
};

export function TeacherSpacePanel({ space, items: initialItems, origin }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploadingHero, setUploadingHero] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [items, setItems] = useState(initialItems);

  const [title, setTitle] = useState(space?.title ?? "Classroom Wall");
  const [bio, setBio] = useState(space?.bio ?? "");
  const [isPublished, setIsPublished] = useState(space?.is_published ?? false);
  const [themeId, setThemeId] = useState<ClassroomThemeId>(
    space?.theme_id ?? "sky_day",
  );
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(
    space?.hero_image_url ?? null,
  );
  const [heroAssetId, setHeroAssetId] = useState<string | null>(null);
  const [heroDirty, setHeroDirty] = useState(false);
  const [showSettings, setShowSettings] = useState(!space);

  const [clientOrigin, setClientOrigin] = useState(origin);
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setClientOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!space) return;
    setTitle(space.title);
    setBio(space.bio);
    setIsPublished(space.is_published);
    setThemeId(space.theme_id);
    setHeroImageUrl(space.hero_image_url);
    setHeroDirty(false);
    setHeroAssetId(null);
  }, [space]);

  const publicUrl = useMemo(() => {
    const h = (space?.handle || "").trim().toLowerCase();
    if (!h) return "";
    return `${clientOrigin.replace(/\/$/, "")}/wke/${encodeURIComponent(h)}`;
  }, [space?.handle, clientOrigin]);

  function saveSettings() {
    setNotice(null);
    startTransition(async () => {
      const result = await saveTeacherSpaceSettings({
        title,
        bio,
        is_published: isPublished,
        theme_id: themeId,
        hero_image_url: heroImageUrl,
        ...(heroDirty ? { hero_asset_id: heroAssetId } : {}),
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setNotice(result.message ?? "Saved.");
      router.refresh();
    });
  }

  function copyLink() {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl).then(
      () => setNotice("Link copied."),
      () => setNotice(publicUrl),
    );
  }

  async function uploadHero(file: File) {
    setNotice(null);
    setUploadingHero(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("kind", "image");
      form.append(
        "meta",
        JSON.stringify({ source: "classroom_hero", field: "hero_image_url" }),
      );
      const response = await fetch("/api/studio/assets", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const payload = (await response.json()) as {
        error?: string;
        public_url?: string;
        id?: string;
      };
      if (!response.ok || !payload.public_url) {
        throw new Error(payload.error || "Hero upload failed.");
      }
      setHeroImageUrl(payload.public_url);
      setHeroAssetId(payload.id ?? null);
      setHeroDirty(true);
      setNotice("Hero uploaded — click Save settings to keep it.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Hero upload failed.");
    } finally {
      setUploadingHero(false);
    }
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((row) => row.id === id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row!);
    setItems(next);
    startTransition(async () => {
      const result = await reorderMySpaceItems(next.map((r) => r.id));
      if (!result.ok) {
        setNotice(result.error);
        setItems(initialItems);
        return;
      }
      router.refresh();
    });
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this activity from Classroom Wall?")) return;
    startTransition(async () => {
      const result = await removeSpaceItem(id);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setItems((current) => current.filter((row) => row.id !== id));
      setNotice(result.message ?? "Removed.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Classroom Wall</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Publish activities students open on your public classroom link. Private
            classes stay separate for roster and homework.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPublished && publicUrl ? (
            <>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border px-3 py-1.5 text-sm font-medium"
              >
                Open as student
              </a>
              <button
                type="button"
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white"
                onClick={copyLink}
              >
                Copy link
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={`rounded border px-2.5 py-1.5 text-xs font-medium ${
              showSettings
                ? "border-sky-400 bg-sky-50 text-sky-950"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
            onClick={() => setShowSettings((open) => !open)}
            aria-expanded={showSettings}
          >
            {showSettings ? "Hide settings" : "Classroom Wall settings"}
          </button>
        </div>
      </div>

      {notice ? (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      {showSettings ? (
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Classroom Wall settings
          </h2>
          <button
            type="button"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
            onClick={() => setShowSettings(false)}
          >
            Close
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Your wall link
          </p>
          {publicUrl ? (
            <p className="mt-1 break-all font-mono text-xs text-neutral-800">{publicUrl}</p>
          ) : (
            <p className="mt-1 text-xs text-neutral-600">
              Assigned automatically when you save — one link per teacher, not editable.
            </p>
          )}
        </div>

        <label className="block text-sm">
          <span className="font-medium">Title</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Short blurb</span>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            placeholder="Practice English with our class."
          />
        </label>

        <div>
          <p className="text-sm font-medium">Color theme</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CLASSROOM_THEME_IDS.map((id) => {
              const theme = CLASSROOM_THEMES[id];
              const selected = themeId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThemeId(id)}
                  className={`rounded-lg border p-2 text-left ${
                    selected
                      ? "border-sky-500 ring-2 ring-sky-200"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="mb-2 flex gap-1">
                    {theme.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-semibold">{theme.label}</p>
                  <p className="text-[10px] text-neutral-500">{theme.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Hero image</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Wide photo works best (about 16:9). Shown full-bleed at the top of your classroom.
          </p>
          <div className="mt-2 overflow-hidden rounded-lg border bg-neutral-50">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt=""
                className="h-36 w-full object-cover"
              />
            ) : (
              <div
                className="flex h-36 items-center justify-center text-xs font-medium text-neutral-500"
                style={{
                  background: CLASSROOM_THEMES[themeId].vars["--classroom-hero-wash"],
                }}
              >
                Theme wash (no hero yet)
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={uploadingHero || pending}
              onClick={() => fileRef.current?.click()}
            >
              {uploadingHero ? "Uploading…" : heroImageUrl ? "Replace hero" : "Upload hero"}
            </button>
            {heroImageUrl ? (
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm text-red-800"
                disabled={pending}
                onClick={() => {
                  setHeroImageUrl(null);
                  setHeroAssetId(null);
                  setHeroDirty(true);
                  setNotice("Hero cleared — click Save settings.");
                }}
              >
                Remove hero
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadHero(file);
              event.target.value = "";
            }}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <span>Published (students / parents can open the link)</span>
        </label>

        <button
          type="button"
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={pending || !title.trim()}
          onClick={saveSettings}
        >
          Save settings
        </button>
      </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Published activities ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Nothing on Classroom Wall yet. Open{" "}
            <button
              type="button"
              className="font-medium text-sky-800 underline"
              onClick={() => router.replace("/teacher/classes?space=1&bank=1")}
            >
              My Activity Bank
            </button>{" "}
            and choose <strong>Publish to Classroom Wall</strong>.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-neutral-100 text-sky-700">
                    {item.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ClassroomFormatIcon
                          format={item.format as StudioActivityFormat}
                          className="h-7 w-7"
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-neutral-500">
                      {classroomFormatLabel(item.format)}
                      {isPublished ? (
                        <>
                          {" · "}
                          <Link
                            href={item.playPath}
                            className="text-sky-800 underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open as student
                          </Link>
                        </>
                      ) : (
                        <span className="text-amber-800"> · Publish wall to share</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    disabled={pending || index === 0}
                    onClick={() => moveItem(item.id, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    disabled={pending || index === items.length - 1}
                    onClick={() => moveItem(item.id, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs text-red-800 disabled:opacity-50"
                    disabled={pending}
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

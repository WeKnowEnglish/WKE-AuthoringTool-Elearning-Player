"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addVocabEntry,
  compressGamesChoiceImageFile,
  countLocalVocabMedia,
  createBakeryVocabularyListDocument,
  createBlankVocabularyListDocument,
  dataUrlToBlob,
  formatBytes,
  patchVocabEntry,
  pickVocabularyListFile,
  publishLocalVocabMedia,
  publishVocabStudioAsset,
  removeVocabEntry,
  renameVocabularyList,
  saveVocabularyListToDisk,
  validateVocabularyListDocument,
  addVocabEntryFromFields,
  type VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list";
import {
  deleteStudioVocabularyList,
  getStudioVocabularyList,
  listStudioVocabularyLists,
  saveVocabularyListToStudio,
  compileAndPublishQuizzesFromVocabList,
  VOCAB_COMPILE_FORMAT_OPTIONS,
  type PublishedVocabQuiz,
  type StudioVocabularyListRef,
  type VocabCompileFormat,
} from "@/lib/activity-library";
import { VocabEntryAudioControls } from "@/components/teacher/activity-builder/VocabEntryAudioControls";
import { VocabularyListLexiconPicker } from "@/components/teacher/activity-builder/VocabularyListLexiconPicker";
import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";

const STARTERS = [
  {
    id: "blank",
    title: "New vocabulary list",
    description: "Start with one empty word row. Add text, pictures, and audio as you go.",
    create: createBlankVocabularyListDocument,
  },
  {
    id: "bakery",
    title: "Bakery sample",
    description: "Four A1 bakery words with definitions and example sentences.",
    create: createBakeryVocabularyListDocument,
  },
] as const;

function cloneDocument(document: VocabularyListDocument): VocabularyListDocument {
  return structuredClone(document);
}

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

type Props = {
  studioOrigin?: string | null;
  /**
   * `page` — full Activity Builder surface (picker + editor).
   * `overlay` — editor-only for Learning Track Compiler embed.
   */
  variant?: "page" | "overlay";
  /** Edit an existing library list (overlay). */
  openLibraryId?: string | null;
  /** Start a blank list (overlay create). */
  startBlank?: boolean;
  onClose?: () => void;
  /** Fired after a successful Activity Bank save (overlay uses this to set track source). */
  onSaved?: (entry: StudioVocabularyListRef) => void;
  /** Platform + Primary search pool (SSR). Falls back to static Primary index. */
  initialPlatformEntries?: readonly PrimaryVocabularySearchIndexEntry[];
  /** Teacher custom lexicon (SSR). */
  initialTeacherLexicon?: readonly TeacherLexiconEntry[];
  showLexiconReviewLink?: boolean;
};

export function VocabularyListWorkspace({
  studioOrigin = null,
  variant = "page",
  openLibraryId = null,
  startBlank = false,
  onClose,
  onSaved,
  initialPlatformEntries,
  initialTeacherLexicon = [],
  showLexiconReviewLink = true,
}: Props) {
  const isOverlay = variant === "overlay";
  const [screen, setScreen] = useState<"picker" | "editor">(
    isOverlay ? "editor" : "picker",
  );
  const [document, setDocument] = useState(() =>
    cloneDocument(createBlankVocabularyListDocument()),
  );
  const [selectedEntryId, setSelectedEntryId] = useState(
    createBlankVocabularyListDocument().entries[0]?.id ?? "",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingAllLocal, setUploadingAllLocal] = useState(false);
  const [libraryId, setLibraryId] = useState<string | null>(openLibraryId);
  const [libraryEntries, setLibraryEntries] = useState<StudioVocabularyListRef[]>([]);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [compileFormats, setCompileFormats] = useState<VocabCompileFormat[]>([
    "multiple_choice",
    "letter_mixup",
    "flashcards",
  ]);
  const [publishedQuizzes, setPublishedQuizzes] = useState<PublishedVocabQuiz[]>(
    [],
  );
  const [overlayBooting, setOverlayBooting] = useState(isOverlay);
  const openRef = useRef<HTMLInputElement>(null);
  const pictureFileRef = useRef<HTMLInputElement>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const documentRef = useRef(document);
  documentRef.current = document;

  const studioCompileHref = studioOrigin
    ? `${studioOrigin}/activity-builder/vocabulary-lists`
    : null;

  const refreshLibrary = async () => {
    try {
      const entries = await listStudioVocabularyLists();
      setLibraryEntries(entries);
    } catch (error) {
      setLibraryEntries([]);
      if (!isOverlay) {
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not load vocabulary lists from Activity Bank.",
        );
      }
    }
  };

  useEffect(() => {
    if (screen === "picker") void refreshLibrary();
    // Picker open is enough; refreshLibrary is stable for this screen toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Overlay: boot into create (blank) or edit (library id).
  useEffect(() => {
    if (!isOverlay) return;
    let cancelled = false;
    void (async () => {
      try {
        if (openLibraryId) {
          const loaded = await getStudioVocabularyList(openLibraryId);
          if (cancelled) return;
          setDocument(cloneDocument(loaded.document));
          setSelectedEntryId(loaded.document.entries[0]?.id ?? "");
          setLibraryId(loaded.id);
          setScreen("editor");
          setNotice(`Editing “${loaded.document.name}”.`);
        } else if (startBlank) {
          const blank = createBlankVocabularyListDocument();
          setDocument(cloneDocument(blank));
          setSelectedEntryId(blank.entries[0]?.id ?? "");
          setLibraryId(null);
          setScreen("editor");
          setNotice("New vocabulary list — add words, then Save.");
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error instanceof Error ? error.message : "Could not open vocabulary list.",
          );
        }
      } finally {
        if (!cancelled) setOverlayBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only boot for overlay session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedEntry =
    document.entries.find((entry) => entry.id === selectedEntryId) ??
    document.entries[0] ??
    null;

  const completeness = useMemo(() => {
    const total = document.entries.length;
    let withDefinition = 0;
    let withExample = 0;
    let withImage = 0;
    let withAudio = 0;
    for (const entry of document.entries) {
      if (entry.definitionEn?.trim()) withDefinition += 1;
      if (entry.example?.trim()) withExample += 1;
      if (entry.imageUrl?.trim()) withImage += 1;
      if (entry.audioUrl?.trim()) withAudio += 1;
    }
    return { total, withDefinition, withExample, withImage, withAudio };
  }, [document.entries]);

  const localMedia = useMemo(() => countLocalVocabMedia(document), [document]);

  const validation = useMemo(() => {
    try {
      validateVocabularyListDocument(document);
      return { ok: true as const, message: "Ready to save to Activity Bank." };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "List is not valid.",
      };
    }
  }, [document]);

  const loadDocument = (
    next: VocabularyListDocument,
    label: string,
    options?: { handle?: FileSystemFileHandle | null; libraryId?: string | null },
  ) => {
    setDocument(cloneDocument(next));
    setSelectedEntryId(next.entries[0]?.id ?? "");
    setLibraryId(options?.libraryId ?? null);
    setScreen("editor");
    setNotice(label);
    fileHandleRef.current = options?.handle ?? null;
    setFileLabel(options?.handle?.name ?? null);
  };

  const patchDocument = (
    updater: (current: VocabularyListDocument) => VocabularyListDocument,
  ) => {
    setDocument((current) => updater(current));
  };

  const openSavedList = async () => {
    try {
      const picked = await pickVocabularyListFile();
      if (picked) {
        loadDocument(picked.document, `Opened ${picked.handle?.name ?? "list"}.`, {
          handle: picked.handle,
          libraryId: null,
        });
        return;
      }
      openRef.current?.click();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open file.");
    }
  };

  const saveToLibrary = async (andUse = false) => {
    setLibraryBusy(true);
    try {
      const entry = await saveVocabularyListToStudio({
        activityId: libraryId,
        document,
      });
      setLibraryId(entry.id);
      setNotice(`Saved “${entry.name}” to Activity Bank.`);
      await refreshLibrary();
      onSaved?.(entry);
      if (andUse) onClose?.();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setLibraryBusy(false);
    }
  };

  const toggleCompileFormat = (format: VocabCompileFormat) => {
    setCompileFormats((current) =>
      current.includes(format)
        ? current.filter((item) => item !== format)
        : [...current, format],
    );
  };

  const compileAndPublishQuizzes = async () => {
    if (compiling || !validation.ok) return;
    if (compileFormats.length < 1) {
      setNotice("Choose at least one quiz format to compile.");
      return;
    }
    setCompiling(true);
    setPublishedQuizzes([]);
    try {
      let vocabListId = libraryId;
      if (!vocabListId) {
        const entry = await saveVocabularyListToStudio({
          activityId: null,
          document,
        });
        vocabListId = entry.id;
        setLibraryId(entry.id);
        await refreshLibrary();
        onSaved?.(entry);
      }

      const result = await compileAndPublishQuizzesFromVocabList({
        list: document,
        formats: compileFormats,
        vocabListId,
      });
      setDocument(cloneDocument(result.list));
      setPublishedQuizzes(result.published);

      const labels = result.published
        .map((row) => `${row.label} (${row.itemCount})`)
        .join(" · ");
      const skipNote =
        result.skipped.length > 0
          ? ` · ${result.skipped.length} word skip${result.skipped.length === 1 ? "" : "s"}`
          : "";
      setNotice(`Published to Activity Bank: ${labels}${skipNote}.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not compile quizzes.",
      );
    } finally {
      setCompiling(false);
    }
  };

  const saveListToDisk = async (forcePicker: boolean) => {
    try {
      const hadHandle = Boolean(fileHandleRef.current) && !forcePicker;
      const result = await saveVocabularyListToDisk(
        document,
        forcePicker ? null : fileHandleRef.current,
      );
      if (!result.success) {
        if (result.error) setNotice(result.error);
        return;
      }
      if (result.handle) {
        fileHandleRef.current = result.handle;
        setFileLabel(result.handle.name);
        setNotice(
          hadHandle ? `Saved to ${result.handle.name}.` : `Saved ${result.handle.name}.`,
        );
      } else {
        setNotice("Downloaded .wkevocab.json (browser has no folder picker).");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save to file failed.");
    }
  };

  const uploadAllLocalMedia = async () => {
    if (uploadingAllLocal) return;
    if (localMedia.total === 0) {
      setNotice("No local pictures or audio to upload.");
      return;
    }
    setUploadingAllLocal(true);
    setNotice(`Uploading local media 0/${localMedia.total}…`);
    try {
      const result = await publishLocalVocabMedia(document, {
        onProgress: (done, total, label) => {
          setNotice(`Uploading local media ${done + 1}/${total} · ${label}…`);
        },
      });
      setDocument(cloneDocument(result.document));
      const parts = [
        result.uploadedImages
          ? `${result.uploadedImages} picture${result.uploadedImages === 1 ? "" : "s"}`
          : null,
        result.uploadedAudio ? `${result.uploadedAudio} audio` : null,
      ].filter(Boolean);
      const okPart = parts.length ? `Uploaded ${parts.join(" · ")}.` : "Nothing uploaded.";
      const failPart =
        result.failed > 0
          ? ` ${result.failed} failed${result.errors[0] ? ` (${result.errors[0]})` : ""}.`
          : "";
      setNotice(`${okPart}${failPart} Save the list to keep the cloud URLs.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload local media.");
    } finally {
      setUploadingAllLocal(false);
    }
  };

  const openFileInput = (
    <input
      ref={openRef}
      hidden
      type="file"
      accept=".json,.wkevocab.json,application/json"
      onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const loaded = validateVocabularyListDocument(JSON.parse(await file.text()));
          loadDocument(loaded, `Imported ${file.name}.`, { libraryId: null });
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not open file.");
        }
        event.target.value = "";
      }}
    />
  );

  if (isOverlay && overlayBooting) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-50 p-8 text-sm text-stone-500">
        Opening vocabulary list…
      </div>
    );
  }

  if (screen === "picker") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/teacher/activity-builder"
              className="text-xs font-medium text-sky-800 hover:underline"
            >
              ← Activity Builder
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-stone-900 sm:text-2xl">
              Vocabulary lists
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Build shared word lists, then compile multiple choice, letter
              scramble, and flashcards into Activity Bank.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 sm:text-sm"
            onClick={() => void openSavedList()}
          >
            Import file
          </button>
          {openFileInput}
        </header>

        {notice ? (
          <button
            type="button"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950"
            onClick={() => setNotice(null)}
          >
            {notice} ×
          </button>
        ) : null}

        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            Activity Bank
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Saved on the server for your teacher account. Lists survive browser clears and
            are available to the Learning Track Compiler on this same site.
          </p>
          {libraryEntries.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500">
              No vocabulary lists saved yet. Start one below or import a .wkevocab.json file,
              then press Save.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {libraryEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{entry.name}</p>
                    <p className="text-xs text-stone-500">
                      Updated {new Date(entry.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white"
                    onClick={() => {
                      void (async () => {
                        try {
                          const loaded = await getStudioVocabularyList(entry.id);
                          loadDocument(
                            loaded.document,
                            `Opened “${entry.name}” from Activity Bank.`,
                            { libraryId: loaded.id },
                          );
                        } catch (error) {
                          setNotice(
                            error instanceof Error
                              ? error.message
                              : "Could not open vocabulary list.",
                          );
                        }
                      })();
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800"
                    onClick={() => {
                      void (async () => {
                        try {
                          await deleteStudioVocabularyList(entry.id);
                          if (libraryId === entry.id) setLibraryId(null);
                          await refreshLibrary();
                          setNotice(`Deleted “${entry.name}”.`);
                        } catch (error) {
                          setNotice(
                            error instanceof Error ? error.message : "Could not delete.",
                          );
                        }
                      })();
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            Start a list
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {STARTERS.map((starter) => (
              <button
                key={starter.id}
                type="button"
                onClick={() =>
                  loadDocument(starter.create(), `Loaded ${starter.title}.`, {
                    libraryId: null,
                  })
                }
                className="rounded-xl border border-stone-200 bg-white/80 p-4 text-left transition hover:border-stone-400 hover:bg-white"
              >
                <h3 className="font-semibold text-stone-900">{starter.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{starter.description}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-stone-200 bg-white/70 px-3 py-2.5 sm:px-4">
        {isOverlay ? (
          <button
            type="button"
            className="text-xs font-medium text-sky-800 hover:underline"
            onClick={() => onClose?.()}
          >
            ← Close
          </button>
        ) : (
          <Link
            href="/teacher/activity-builder"
            className="text-xs font-medium text-sky-800 hover:underline"
          >
            ← Activity Builder
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-stone-900">
            {isOverlay ? "Track vocabulary list" : "Vocabulary list"}
          </h1>
          <p className="truncate text-xs text-stone-500">
            {document.name}
            {libraryId ? " · in library" : " · unsaved"}
            {fileLabel ? ` · file ${fileLabel}` : ""}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {isOverlay ? (
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
              onClick={() => void openSavedList()}
            >
              Import file…
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
              onClick={() => {
                fileHandleRef.current = null;
                setFileLabel(null);
                setScreen("picker");
              }}
            >
              Library
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-40"
            disabled={uploadingAllLocal || localMedia.total === 0}
            onClick={() => void uploadAllLocalMedia()}
          >
            {uploadingAllLocal
              ? "Uploading…"
              : localMedia.total > 0
                ? `Upload local media (${localMedia.total})`
                : "Upload local media"}
          </button>
          <button
            type="button"
            className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            disabled={!validation.ok || libraryBusy}
            onClick={() => void saveToLibrary(false)}
          >
            Save
          </button>
          {isOverlay ? (
            <button
              type="button"
              className="rounded-lg bg-emerald-800 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              disabled={!validation.ok || libraryBusy}
              onClick={() => void saveToLibrary(true)}
            >
              Save & use
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-40"
            disabled={!validation.ok}
            onClick={() => void saveListToDisk(true)}
          >
            Save as file…
          </button>
          {openFileInput}
        </div>
      </header>

      {notice ? (
        <button
          type="button"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950"
          onClick={() => setNotice(null)}
        >
          {notice} ×
        </button>
      ) : null}

      {isOverlay ? null : (
        <section className="shrink-0 border-b border-stone-200 bg-white px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Compile to Activity Bank
              </h2>
              <p className="mt-1 text-xs text-stone-600">
                Builds playable quizzes from this list and saves them beside your
                other bank activities.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {VOCAB_COMPILE_FORMAT_OPTIONS.map((option) => {
                  const checked = compileFormats.includes(option.format);
                  return (
                    <label
                      key={option.format}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-800"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-stone-300"
                        checked={checked}
                        onChange={() => toggleCompileFormat(option.format)}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
                disabled={!validation.ok || compiling || compileFormats.length < 1}
                onClick={() => void compileAndPublishQuizzes()}
              >
                {compiling ? "Compiling…" : "Compile & publish"}
              </button>
              {studioCompileHref ? (
                <a
                  href={studioCompileHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-stone-500 underline hover:text-stone-800"
                >
                  Open in Studio
                </a>
              ) : null}
            </div>
          </div>
          {publishedQuizzes.length > 0 ? (
            <ul className="mt-3 space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2">
              {publishedQuizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950"
                >
                  <span className="font-medium">
                    {quiz.label} · {quiz.itemCount} item
                    {quiz.itemCount === 1 ? "" : "s"}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <a
                      href={quiz.playPath}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline"
                    >
                      Play
                    </a>
                    <Link href={quiz.bankPath} className="font-semibold underline">
                      Bank
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <div
        className={`shrink-0 border-b px-3 py-2 text-sm ${
          validation.ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-rose-200 bg-rose-50 text-rose-900"
        }`}
      >
        {validation.message}
      </div>

      <VocabularyListLexiconPicker
        document={document}
        initialPlatformEntries={initialPlatformEntries}
        initialTeacherLexicon={initialTeacherLexicon}
        showLexiconReviewLink={showLexiconReviewLink}
        onAddFields={(fields) => {
          const result = addVocabEntryFromFields(documentRef.current, fields);
          if (!result.ok) {
            return { ok: false, reason: result.reason };
          }
          documentRef.current = result.document;
          setDocument(result.document);
          setSelectedEntryId(result.entryId);
          setNotice(`Added “${fields.word}” from the dictionary.`);
          return { ok: true, entryId: result.entryId };
        }}
      />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-stone-200 bg-stone-50/50">
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Words
            </h2>
            <button
              type="button"
              className="rounded-lg bg-stone-900 px-2 py-1 text-xs font-medium text-white"
              onClick={() => {
                patchDocument((current) => {
                  const next = addVocabEntry(current);
                  setSelectedEntryId(next.entries.at(-1)?.id ?? "");
                  return next;
                });
              }}
            >
              Add blank
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {document.entries.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntryId(entry.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  selectedEntry?.id === entry.id
                    ? "border-stone-900 bg-white"
                    : "border-stone-200 bg-white/70 hover:border-stone-400"
                }`}
              >
                <span className="text-xs text-stone-500">#{index + 1}</span>
                <span className="mt-1 block truncate text-sm font-semibold text-stone-900">
                  {entry.word.trim() || "(empty word)"}
                </span>
                {entry.sourceWordId ? (
                  <span className="mt-1 block truncate text-[10px] text-sky-800">
                    Linked · {entry.sourceWordId}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="mx-auto max-w-2xl space-y-4">
            <section className="space-y-3 rounded-xl border border-stone-200 bg-white/80 p-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                List
              </h2>
              <label className="block text-sm text-stone-800">
                List name
                <input
                  className={inputClass}
                  value={document.name}
                  onChange={(event) =>
                    patchDocument((current) =>
                      renameVocabularyList(current, event.target.value),
                    )
                  }
                />
              </label>
              <label className="block text-sm text-stone-800">
                CEFR (optional)
                <input
                  className={inputClass}
                  value={document.cefr ?? ""}
                  placeholder="A1"
                  onChange={(event) =>
                    patchDocument((current) => ({
                      ...current,
                      cefr: event.target.value || undefined,
                    }))
                  }
                />
              </label>
              <p className="text-xs text-stone-500">
                {completeness.total} word{completeness.total === 1 ? "" : "s"} ·{" "}
                {completeness.withDefinition} def · {completeness.withExample}{" "}
                example · {completeness.withImage} picture ·{" "}
                {completeness.withAudio} audio
              </p>
            </section>

            {selectedEntry ? (
              <section className="space-y-3 rounded-xl border border-stone-200 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                    Selected word
                  </h2>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
                    disabled={document.entries.length <= 1}
                    onClick={() => {
                      try {
                        const removeId = selectedEntry.id;
                        patchDocument((current) => {
                          const next = removeVocabEntry(current, removeId);
                          setSelectedEntryId(next.entries[0]?.id ?? "");
                          return next;
                        });
                      } catch (error) {
                        setNotice(
                          error instanceof Error
                            ? error.message
                            : "Could not remove word.",
                        );
                      }
                    }}
                  >
                    Remove word
                  </button>
                </div>
                <label className="block text-sm text-stone-800">
                  Word
                  <input
                    className={inputClass}
                    value={selectedEntry.word}
                    onChange={(event) =>
                      patchDocument((current) =>
                        patchVocabEntry(current, selectedEntry.id, {
                          word: event.target.value,
                        }),
                      )
                    }
                  />
                </label>
                {selectedEntry.sourceWordId ? (
                  <p className="text-xs text-stone-500">
                    Linked to dictionary{" "}
                    <span className="font-mono text-stone-700">
                      {selectedEntry.sourceWordId}
                    </span>
                    . Edits here stay on this list only.
                  </p>
                ) : null}
                <label className="block text-sm text-stone-800">
                  Definition (English)
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={selectedEntry.definitionEn ?? ""}
                    onChange={(event) =>
                      patchDocument((current) =>
                        patchVocabEntry(current, selectedEntry.id, {
                          definitionEn: event.target.value || undefined,
                        }),
                      )
                    }
                  />
                </label>
                <label className="block text-sm text-stone-800">
                  Example sentence
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={selectedEntry.example ?? ""}
                    onChange={(event) =>
                      patchDocument((current) =>
                        patchVocabEntry(current, selectedEntry.id, {
                          example: event.target.value || undefined,
                        }),
                      )
                    }
                  />
                </label>

                <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-stone-800">
                      Picture (optional)
                    </h3>
                    {selectedEntry.imageUrl?.startsWith("data:") ? (
                      <span className="text-xs text-emerald-800">Local image</span>
                    ) : null}
                    {selectedEntry.imageUrl?.startsWith("http") ? (
                      <span className="text-xs text-sky-800">Cloud URL</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      disabled={uploadingPicture}
                      onClick={() => pictureFileRef.current?.click()}
                    >
                      {uploadingPicture ? "Working…" : "Choose from computer"}
                    </button>
                    {selectedEntry.imageUrl ? (
                      <button
                        type="button"
                        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs"
                        onClick={() =>
                          patchDocument((current) =>
                            patchVocabEntry(current, selectedEntry.id, {
                              imageUrl: undefined,
                              imageFit: undefined,
                            }),
                          )
                        }
                      >
                        Clear picture
                      </button>
                    ) : null}
                  </div>
                  <label className="block text-xs text-stone-500">
                    Or paste image URL
                    <input
                      className={inputClass}
                      placeholder="https://…"
                      value={
                        selectedEntry.imageUrl?.startsWith("data:")
                          ? ""
                          : (selectedEntry.imageUrl ?? "")
                      }
                      onChange={(event) =>
                        patchDocument((current) =>
                          patchVocabEntry(current, selectedEntry.id, {
                            imageUrl: event.target.value || undefined,
                          }),
                        )
                      }
                    />
                  </label>
                  {selectedEntry.imageUrl?.trim() ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedEntry.imageUrl}
                        alt=""
                        className="h-24 w-24 rounded-lg border border-stone-200 object-contain"
                      />
                      <label className="flex items-center gap-2 text-sm text-stone-800">
                        Image fit
                        <select
                          className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                          value={selectedEntry.imageFit ?? "contain"}
                          onChange={(event) =>
                            patchDocument((current) =>
                              patchVocabEntry(current, selectedEntry.id, {
                                imageFit: event.target.value as "cover" | "contain",
                              }),
                            )
                          }
                        >
                          <option value="contain">Contain</option>
                          <option value="cover">Cover</option>
                        </select>
                      </label>
                    </>
                  ) : null}
                </div>

                <VocabEntryAudioControls
                  value={selectedEntry.audioUrl}
                  cloudMeta={{
                    source: "vocabulary_list",
                    listId: document.id,
                    entryId: selectedEntry.id,
                    field: "audioUrl",
                  }}
                  onChange={(next) =>
                    patchDocument((current) =>
                      patchVocabEntry(current, selectedEntry.id, {
                        audioUrl: next,
                      }),
                    )
                  }
                />

                <label className="block text-sm text-stone-800">
                  Notes (optional)
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={selectedEntry.notes ?? ""}
                    onChange={(event) =>
                      patchDocument((current) =>
                        patchVocabEntry(current, selectedEntry.id, {
                          notes: event.target.value || undefined,
                        }),
                      )
                    }
                  />
                </label>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={pictureFileRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          const entryId = selectedEntryId;
          event.target.value = "";
          if (!file || !entryId) return;
          setUploadingPicture(true);
          try {
            const compressed = await compressGamesChoiceImageFile(file);
            let imageUrl = compressed.dataUrl;
            let cloudNote = "";
            try {
              const blob = await dataUrlToBlob(compressed.dataUrl);
              const ext =
                compressed.mimeType === "image/jpeg"
                  ? "jpg"
                  : compressed.mimeType === "image/png"
                    ? "png"
                    : "webp";
              const published = await publishVocabStudioAsset({
                file: blob,
                filename: `vocab-${entryId}.${ext}`,
                kind: "image",
                meta: {
                  source: "vocabulary_list",
                  listId: document.id,
                  entryId,
                },
              });
              imageUrl = published.public_url;
              cloudNote = " · published to cloud";
            } catch (publishError) {
              cloudNote = ` · cloud publish failed (${
                publishError instanceof Error ? publishError.message : "error"
              }); kept local`;
            }
            patchDocument((current) =>
              patchVocabEntry(current, entryId, {
                imageUrl,
                imageFit:
                  current.entries.find((entry) => entry.id === entryId)?.imageFit ??
                  "contain",
              }),
            );
            const shrink =
              compressed.outputBytes < compressed.originalBytes
                ? ` · ${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.outputBytes)}`
                : ` · ${formatBytes(compressed.outputBytes)}`;
            setNotice(
              `Loaded picture${shrink} (${compressed.width}×${compressed.height})${cloudNote}.`,
            );
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not import image.");
          } finally {
            setUploadingPicture(false);
          }
        }}
      />
    </div>
  );
}

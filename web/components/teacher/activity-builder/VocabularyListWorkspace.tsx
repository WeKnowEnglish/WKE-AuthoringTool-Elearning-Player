"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  addVocabEntry,
  countLocalVocabMedia,
  createBakeryVocabularyListDocument,
  createBlankVocabularyListDocument,
  patchVocabEntry,
  pickVocabularyListFile,
  publishLocalVocabMedia,
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
import {
  linkLexiconMedia,
  linkLexiconMediaByPublicUrl,
} from "@/lib/actions/lexicon-media";
import { LexiconLinkedMediaStrip } from "@/components/teacher/activity-builder/LexiconLinkedMediaStrip";
import { AuthoringItemPager } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { VocabEntryAudioControls } from "@/components/teacher/activity-builder/VocabEntryAudioControls";
import { VocabularyListLexiconPicker } from "@/components/teacher/activity-builder/VocabularyListLexiconPicker";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";
import type { LexiconMediaRole } from "@/lib/vocabulary/lexicon-media";

/** Placeholder lemmas used for empty / starter rows — clear on focus so authors can type. */
const PLACEHOLDER_WORDS = new Set(["", "word", "new word"]);

function isPlaceholderWord(word: string): boolean {
  return PLACEHOLDER_WORDS.has(word.trim().toLowerCase());
}

/** Match Explore Hotspots status banners — auto-clear after a short beat. */
const BANNER_DISMISS_MS = 3000;
/** Debounce Activity Bank writes while typing / editing media. */
const AUTOSAVE_MS = 1200;

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

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

const MOBILE_WORKSPACE_TABS = [
  { id: "list", label: "Word List", panelId: "vocab-word-list-panel" },
  { id: "details", label: "Word Details", panelId: "vocab-word-details-panel" },
  { id: "dictionary", label: "Dictionary", panelId: "vocab-dictionary-panel" },
] as const satisfies readonly {
  id: MobileWorkspaceTab;
  label: string;
  panelId: string;
}[];

function cloneDocument(document: VocabularyListDocument): VocabularyListDocument {
  return structuredClone(document);
}

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-400/70 bg-white px-2.5 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

/** Word-details form surface: darker card so white fields read clearly. */
const detailsCardClass =
  "space-y-4 rounded-xl border border-stone-300 bg-stone-200/90 p-4 shadow-sm";
const detailsNestClass =
  "space-y-2 rounded-lg border border-stone-300/80 bg-stone-300/50 p-3";
const detailsLabelClass = "block text-sm font-medium text-stone-800";

type MobileWorkspaceTab = "list" | "details" | "dictionary";

function usesTouchKeyboardNavigation(): boolean {
  if (typeof window === "undefined") return false;

  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isTouchOnly =
    window.navigator.maxTouchPoints > 0 &&
    window.matchMedia("(hover: none)").matches;

  return hasCoarsePointer || isTouchOnly;
}

function usesSinglePanelVocabularyLayout(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 1023px)").matches ||
    usesTouchKeyboardNavigation()
  );
}

function focusWordInput(entryId: string): void {
  const input = window.document.querySelector<HTMLInputElement>(
    `input[data-vocab-word-id="${CSS.escape(entryId)}"]`,
  );
  input?.focus();
  input?.select();
}

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
  const [editorTab, setEditorTab] = useState<"dictionary" | "details">("details");
  const [mobileWorkspaceTab, setMobileWorkspaceTab] =
    useState<MobileWorkspaceTab>("list");
  const [singlePanelLayout, setSinglePanelLayout] = useState(false);
  const [compileOverlayOpen, setCompileOverlayOpen] = useState(false);
  const [showValidationBanner, setShowValidationBanner] = useState(true);
  const [lexiconMediaRefreshKey, setLexiconMediaRefreshKey] = useState(0);
  const [overlayBooting, setOverlayBooting] = useState(isOverlay);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const openRef = useRef<HTMLInputElement>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const documentRef = useRef(document);
  documentRef.current = document;
  const libraryIdRef = useRef(libraryId);
  libraryIdRef.current = libraryId;
  const autosaveTimerRef = useRef<number | null>(null);
  const dirtySeqRef = useRef(0);
  const lastSavedJsonRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingResaveRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const beginCleanEditorSession = useCallback(
    (nextLibraryId: string | null, nextDocument: VocabularyListDocument) => {
      clearAutosaveTimer();
      dirtySeqRef.current = 0;
      pendingResaveRef.current = false;
      saveInFlightRef.current = false;
      lastSavedJsonRef.current = JSON.stringify(nextDocument);
      setSaveError(null);
      setSaveStatus(nextLibraryId ? "saved" : "idle");
    },
    [clearAutosaveTimer],
  );

  const studioCompileHref = studioOrigin
    ? `${studioOrigin}/activity-builder/vocabulary-lists`
    : null;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), BANNER_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const mediaQueries = [
      window.matchMedia("(max-width: 1023px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(hover: none)"),
    ];
    const updateLayout = () =>
      setSinglePanelLayout(usesSinglePanelVocabularyLayout());

    updateLayout();
    for (const mediaQuery of mediaQueries) {
      mediaQuery.addEventListener("change", updateLayout);
    }
    return () => {
      for (const mediaQuery of mediaQueries) {
        mediaQuery.removeEventListener("change", updateLayout);
      }
    };
  }, []);

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
          setMobileWorkspaceTab("list");
          setLibraryId(loaded.id);
          libraryIdRef.current = loaded.id;
          setScreen("editor");
          beginCleanEditorSession(loaded.id, loaded.document);
          setNotice(`Editing “${loaded.document.name}”.`);
        } else if (startBlank) {
          const blank = createBlankVocabularyListDocument();
          setDocument(cloneDocument(blank));
          setSelectedEntryId(blank.entries[0]?.id ?? "");
          setMobileWorkspaceTab("list");
          setLibraryId(null);
          libraryIdRef.current = null;
          setScreen("editor");
          beginCleanEditorSession(null, blank);
          setNotice("New vocabulary list — edits autosave to Activity Bank.");
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

  const selectedEntryIndex = Math.max(
    0,
    document.entries.findIndex((entry) => entry.id === selectedEntry?.id),
  );

  const wordPagerLabels = useMemo(
    () => document.entries.map((entry) => entry.word.trim() || "New"),
    [document.entries],
  );

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
      return { ok: true as const, message: "Autosaves to Activity Bank." };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "List is not valid.",
      };
    }
  }, [document]);

  useEffect(() => {
    setShowValidationBanner(true);
    const timer = window.setTimeout(
      () => setShowValidationBanner(false),
      BANNER_DISMISS_MS,
    );
    return () => window.clearTimeout(timer);
  }, [validation.ok, validation.message]);

  const loadDocument = (
    next: VocabularyListDocument,
    label: string,
    options?: { handle?: FileSystemFileHandle | null; libraryId?: string | null },
  ) => {
    const nextLibraryId = options?.libraryId ?? null;
    setDocument(cloneDocument(next));
    setSelectedEntryId(next.entries[0]?.id ?? "");
    setMobileWorkspaceTab("list");
    setLibraryId(nextLibraryId);
    libraryIdRef.current = nextLibraryId;
    setScreen("editor");
    setNotice(label);
    fileHandleRef.current = options?.handle ?? null;
    setFileLabel(options?.handle?.name ?? null);
    beginCleanEditorSession(nextLibraryId, next);
  };

  const patchDocument = (
    updater: (current: VocabularyListDocument) => VocabularyListDocument,
  ) => {
    setDocument((current) => updater(current));
  };

  const runAutosave = useCallback(
    async (seq: number) => {
      if (screen !== "editor" || overlayBooting) return;

      let snapshot: VocabularyListDocument;
      try {
        snapshot = validateVocabularyListDocument(documentRef.current);
      } catch {
        setSaveStatus("dirty");
        return;
      }

      if (saveInFlightRef.current) {
        pendingResaveRef.current = true;
        return;
      }

      saveInFlightRef.current = true;
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const entry = await saveVocabularyListToStudio({
          activityId: libraryIdRef.current,
          document: snapshot,
        });
        libraryIdRef.current = entry.id;
        setLibraryId(entry.id);
        onSavedRef.current?.(entry);

        if (dirtySeqRef.current === seq) {
          setDocument(cloneDocument(entry.document));
          dirtySeqRef.current = 0;
          lastSavedJsonRef.current = JSON.stringify(entry.document);
          setSaveStatus("saved");
        } else {
          setSaveStatus("dirty");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Autosave failed.";
        setSaveError(message);
        setSaveStatus("error");
      } finally {
        saveInFlightRef.current = false;
        if (pendingResaveRef.current) {
          pendingResaveRef.current = false;
          dirtySeqRef.current += 1;
          const nextSeq = dirtySeqRef.current;
          setSaveStatus("dirty");
          clearAutosaveTimer();
          autosaveTimerRef.current = window.setTimeout(() => {
            void runAutosave(nextSeq);
          }, AUTOSAVE_MS);
        }
      }
    },
    [screen, overlayBooting, clearAutosaveTimer],
  );

  useEffect(() => {
    if (screen !== "editor" || overlayBooting) return;
    const json = JSON.stringify(document);
    if (json === lastSavedJsonRef.current) return;

    dirtySeqRef.current += 1;
    const seq = dirtySeqRef.current;
    setSaveStatus((current) => (current === "saving" ? current : "dirty"));
    clearAutosaveTimer();
    autosaveTimerRef.current = window.setTimeout(() => {
      void runAutosave(seq);
    }, AUTOSAVE_MS);

    return () => {
      clearAutosaveTimer();
    };
  }, [document, screen, overlayBooting, clearAutosaveTimer, runAutosave]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveStatus === "dirty" || saveStatus === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearAutosaveTimer();
    };
  }, [saveStatus, clearAutosaveTimer]);

  const addEntryAndFocusWord = () => {
    const next = addVocabEntry(documentRef.current);
    const newEntryId = next.entries.at(-1)?.id ?? "";
    if (!newEntryId) return;

    // Render the new input while this key event is still active so mobile
    // browsers allow focus to transfer without dismissing the keyboard.
    flushSync(() => {
      setDocument(next);
      setSelectedEntryId(newEntryId);
      setEditorTab("details");
    });
    focusWordInput(newEntryId);
  };

  const attachMediaToLexicon = async (input: {
    lexiconId?: string;
    surface: string;
    role: LexiconMediaRole;
    mediaAssetId?: string;
    publicUrl?: string;
  }) => {
    if (!input.lexiconId) return;
    const result = input.mediaAssetId
      ? await linkLexiconMedia({
          lexiconId: input.lexiconId,
          mediaAssetId: input.mediaAssetId,
          role: input.role,
          surface: input.surface,
        })
      : input.publicUrl
        ? await linkLexiconMediaByPublicUrl({
            lexiconId: input.lexiconId,
            publicUrl: input.publicUrl,
            role: input.role,
            surface: input.surface,
          })
        : null;
    if (!result) return;
    if (result.ok) {
      setLexiconMediaRefreshKey((key) => key + 1);
      return;
    }
    // Missing migration / Studio-only URL — keep list media; don't block authoring.
    if (!/not in the shared media library|Run migration/i.test(result.error)) {
      setNotice(result.error);
    }
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
    clearAutosaveTimer();
    const seqAtStart = dirtySeqRef.current;
    setLibraryBusy(true);
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const entry = await saveVocabularyListToStudio({
        activityId: libraryIdRef.current,
        document: documentRef.current,
      });
      libraryIdRef.current = entry.id;
      setLibraryId(entry.id);
      if (dirtySeqRef.current === seqAtStart) {
        setDocument(cloneDocument(entry.document));
        dirtySeqRef.current = 0;
        lastSavedJsonRef.current = JSON.stringify(entry.document);
        setSaveStatus("saved");
      } else {
        setSaveStatus("dirty");
      }
      setNotice(`Saved “${entry.name}” to Activity Bank.`);
      await refreshLibrary();
      onSavedRef.current?.(entry);
      if (andUse) onClose?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed.";
      setSaveError(message);
      setSaveStatus("error");
      setNotice(message);
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
      let vocabListId = libraryIdRef.current;
      if (!vocabListId) {
        const entry = await saveVocabularyListToStudio({
          activityId: null,
          document: documentRef.current,
        });
        vocabListId = entry.id;
        libraryIdRef.current = entry.id;
        setLibraryId(entry.id);
        setDocument(cloneDocument(entry.document));
        dirtySeqRef.current = 0;
        lastSavedJsonRef.current = JSON.stringify(entry.document);
        setSaveStatus("saved");
        await refreshLibrary();
        onSavedRef.current?.(entry);
      }

      const result = await compileAndPublishQuizzesFromVocabList({
        list: documentRef.current,
        formats: compileFormats,
        vocabListId,
      });
      setDocument(cloneDocument(result.list));
      dirtySeqRef.current = 0;
      lastSavedJsonRef.current = JSON.stringify(result.list);
      setSaveStatus("saved");
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
            className="fixed bottom-4 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-full border border-stone-700/40 bg-stone-900/90 px-4 py-2 text-center text-xs font-medium text-white shadow-lg backdrop-blur-sm"
            onClick={() => setNotice(null)}
          >
            {notice}
          </button>
        ) : null}

        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            Activity Bank
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Saved on the server for your teacher account. Lists autosave while you
            edit, survive browser clears, and are available to the Learning Track
            Compiler on this same site.
          </p>
          {libraryEntries.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500">
              No vocabulary lists saved yet. Start one below or import a
              .wkevocab.json file — edits autosave to the Activity Bank.
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
      <header className="flex shrink-0 flex-wrap items-start gap-2 border-b border-stone-200 bg-white/70 px-3 py-2.5 sm:items-center sm:px-4">
        {isOverlay ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 text-xs font-medium text-sky-800 hover:underline sm:mt-0"
            onClick={() => onClose?.()}
          >
            ← Close
          </button>
        ) : (
          <Link
            href="/teacher/activity-builder"
            aria-label="Back to Activity Builder"
            title="Back to Activity Builder"
            className="mt-0.5 flex shrink-0 items-center justify-center rounded-lg p-1 text-sky-800 hover:bg-sky-50 sm:mt-0"
          >
            <svg
              viewBox="0 0 24 40"
              className="h-10 w-6"
              fill="currentColor"
              aria-hidden
            >
              <path d="M18 4 L6 20 L18 36 L22 32 L13 20 L22 8 Z" />
            </svg>
          </Link>
        )}
        <div className="min-w-0 flex-1 basis-[16rem]">
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="List name"
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-base font-semibold text-stone-900 outline-none hover:border-stone-200 focus:border-sky-300 focus:bg-white"
              value={document.name}
              placeholder="List name"
              onChange={(event) =>
                patchDocument((current) =>
                  renameVocabularyList(current, event.target.value),
                )
              }
            />
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
              {libraryId ? "In library" : "Unsaved"}
              {fileLabel ? ` · ${fileLabel}` : ""}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 px-1.5">
            <label className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className="shrink-0 font-medium uppercase tracking-wide">
                CEFR
              </span>
              <input
                aria-label="CEFR level"
                className="w-14 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm text-stone-600 outline-none placeholder:text-stone-400 hover:border-stone-200 focus:border-sky-300 focus:bg-white"
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
            <span className="text-xs text-stone-500">
              {completeness.total} word{completeness.total === 1 ? "" : "s"} ·{" "}
              {completeness.withDefinition} def · {completeness.withExample}{" "}
              example · {completeness.withImage} picture ·{" "}
              {completeness.withAudio} audio
            </span>
          </div>
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
          {!isOverlay ? (
            <button
              type="button"
              className="rounded-lg bg-amber-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
              disabled={!validation.ok}
              onClick={() => {
                setPublishedQuizzes([]);
                setCompileOverlayOpen(true);
              }}
            >
              Compile
            </button>
          ) : null}
          <span
            className={`hidden text-[11px] font-medium sm:inline ${
              saveStatus === "error"
                ? "text-rose-700"
                : saveStatus === "saving" || saveStatus === "dirty"
                  ? "text-amber-800"
                  : saveStatus === "saved"
                    ? "text-emerald-800"
                    : "text-stone-500"
            }`}
            title={saveError ?? undefined}
          >
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "dirty"
                ? validation.ok
                  ? "Unsaved…"
                  : "Fix list to autosave"
                : saveStatus === "saved"
                  ? "Saved"
                  : saveStatus === "error"
                    ? "Autosave failed"
                    : "Autosave on"}
          </span>
          <button
            type="button"
            className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            disabled={!validation.ok || libraryBusy || saveStatus === "saving"}
            onClick={() => void saveToLibrary(false)}
          >
            {saveStatus === "saving" || libraryBusy ? "Saving…" : "Save now"}
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

      {compileOverlayOpen && !isOverlay ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vocab-compile-title"
          onClick={() => {
            if (!compiling) setCompileOverlayOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-4 shadow-xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="vocab-compile-title"
                  className="text-base font-semibold text-stone-900"
                >
                  Compile quizzes
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Choose quiz types to build from this list and save them to the
                  Activity Bank.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-40"
                disabled={compiling}
                onClick={() => setCompileOverlayOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {VOCAB_COMPILE_FORMAT_OPTIONS.map((option) => {
                const checked = compileFormats.includes(option.format);
                return (
                  <label
                    key={option.format}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm font-medium text-stone-800 hover:border-stone-300"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-stone-300"
                      checked={checked}
                      disabled={compiling}
                      onChange={() => toggleCompileFormat(option.format)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
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

            {publishedQuizzes.length > 0 ? (
              <ul className="mt-4 space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
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
                      <Link
                        href={quiz.bankPath}
                        className="font-semibold underline"
                      >
                        Bank
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {showValidationBanner ? (
        <button
          type="button"
          className={`shrink-0 border-b px-3 py-2 text-left text-sm ${
            validation.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
          onClick={() => setShowValidationBanner(false)}
        >
          {validation.message} ×
        </button>
      ) : null}

      {singlePanelLayout ? (
        <div
          className="flex shrink-0 gap-1 border-b border-stone-200 bg-stone-100 p-1.5"
          role="tablist"
          aria-label="Vocabulary workspace"
        >
          {MOBILE_WORKSPACE_TABS.map((tab) => {
            const active = mobileWorkspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`vocab-mobile-tab-${tab.id}`}
                aria-controls={tab.panelId}
                aria-selected={active}
                className={`min-h-11 min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
                onClick={() => {
                  setMobileWorkspaceTab(tab.id);
                  if (tab.id !== "list") setEditorTab(tab.id);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className={`min-h-0 flex-1 ${
          singlePanelLayout
            ? "flex flex-col"
            : "grid lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]"
        }`}
      >
        <aside
          id="vocab-word-list-panel"
          role={singlePanelLayout ? "tabpanel" : undefined}
          aria-labelledby={
            singlePanelLayout ? "vocab-mobile-tab-list" : undefined
          }
          className={`${
            singlePanelLayout && mobileWorkspaceTab !== "list" ? "hidden" : "flex"
          } min-h-0 flex-col bg-white ${
            singlePanelLayout ? "flex-1" : "border-r border-stone-200"
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Words · {document.entries.length}
            </h2>
            <button
              type="button"
              className="rounded-lg bg-stone-900 px-2 py-1 text-xs font-medium text-white"
              onClick={() => {
                patchDocument((current) => {
                  const next = addVocabEntry(current);
                  setSelectedEntryId(next.entries.at(-1)?.id ?? "");
                  setEditorTab("details");
                  return next;
                });
              }}
            >
              Add blank
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-stone-100 shadow-[inset_0_-1px_0_0_#e7e5e4]">
                <tr>
                  <th className="w-[38%] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Word
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Definition
                  </th>
                </tr>
              </thead>
              <tbody>
                {document.entries.map((entry, index) => {
                  const selected = selectedEntry?.id === entry.id;
                  const isLastRow = index === document.entries.length - 1;
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-stone-100 ${
                        selected
                          ? "bg-sky-50"
                          : "bg-white hover:bg-stone-50"
                      }`}
                      onClick={() => {
                        setSelectedEntryId(entry.id);
                        setEditorTab("details");
                      }}
                    >
                      <td className="align-top p-0">
                        <input
                          aria-label="Word"
                          data-vocab-word-id={entry.id}
                          enterKeyHint="next"
                          value={entry.word}
                          placeholder="New word"
                          onFocus={() => {
                            setSelectedEntryId(entry.id);
                            setEditorTab("details");
                            if (
                              entry.word.trim() !== "" &&
                              isPlaceholderWord(entry.word)
                            ) {
                              patchDocument((current) =>
                                patchVocabEntry(current, entry.id, { word: "" }),
                              );
                            }
                          }}
                          onChange={(event) =>
                            patchDocument((current) =>
                              patchVocabEntry(current, entry.id, {
                                word: event.target.value,
                              }),
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key !== "Enter" ||
                              event.nativeEvent.isComposing ||
                              !usesTouchKeyboardNavigation()
                            ) {
                              return;
                            }

                            event.preventDefault();
                            const nextEntryId = document.entries[index + 1]?.id;
                            if (nextEntryId) {
                              setSelectedEntryId(nextEntryId);
                              setEditorTab("details");
                              focusWordInput(nextEntryId);
                              return;
                            }

                            addEntryAndFocusWord();
                          }}
                          className={`w-full border-0 bg-transparent px-2 py-1.5 text-sm font-semibold text-stone-900 outline-none placeholder:font-normal placeholder:text-stone-400 focus:bg-white focus:ring-1 focus:ring-inset focus:ring-sky-300 ${
                            selected ? "bg-sky-50/80" : ""
                          }`}
                        />
                      </td>
                      <td className="align-top p-0">
                        <input
                          aria-label="Definition"
                          value={entry.definitionEn ?? ""}
                          placeholder="Definition"
                          onFocus={() => {
                            setSelectedEntryId(entry.id);
                            setEditorTab("details");
                          }}
                          onChange={(event) =>
                            patchDocument((current) =>
                              patchVocabEntry(current, entry.id, {
                                definitionEn: event.target.value,
                              }),
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              !isLastRow ||
                              event.key !== "Tab" ||
                              event.shiftKey
                            ) {
                              return;
                            }
                            event.preventDefault();
                            addEntryAndFocusWord();
                          }}
                          className={`w-full border-0 bg-transparent px-2 py-1.5 text-sm text-stone-700 outline-none placeholder:text-stone-400 focus:bg-white focus:ring-1 focus:ring-inset focus:ring-sky-300 ${
                            selected ? "bg-sky-50/80" : ""
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </aside>

        <div
          className={`${
            singlePanelLayout && mobileWorkspaceTab === "list" ? "hidden" : "flex"
          } min-h-0 flex-col ${singlePanelLayout ? "flex-1" : ""}`}
        >
          {!singlePanelLayout ? (
            <div
              className="flex shrink-0 gap-1 border-b border-stone-200 bg-white px-3 pt-2"
              role="tablist"
              aria-label="Word editor"
            >
            <button
              type="button"
              role="tab"
              aria-selected={editorTab === "dictionary"}
              id="vocab-editor-tab-dictionary"
              aria-controls="vocab-dictionary-panel"
              className={`rounded-t-lg border border-b-0 px-3 py-2 text-xs font-semibold transition ${
                editorTab === "dictionary"
                  ? "relative z-10 -mb-px border-stone-200 bg-white text-stone-900"
                  : "border-transparent bg-stone-100 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
              onClick={() => setEditorTab("dictionary")}
            >
              Dictionary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editorTab === "details"}
              id="vocab-editor-tab-details"
              aria-controls="vocab-word-details-panel"
              className={`rounded-t-lg border border-b-0 px-3 py-2 text-xs font-semibold transition ${
                editorTab === "details"
                  ? "relative z-10 -mb-px border-stone-200 bg-white text-stone-900"
                  : "border-transparent bg-stone-100 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
              onClick={() => setEditorTab("details")}
            >
              Word details
            </button>
            </div>
          ) : null}

          {(singlePanelLayout
            ? mobileWorkspaceTab === "dictionary"
            : editorTab === "dictionary") ? (
            <div
              id="vocab-dictionary-panel"
              className="min-h-0 flex-1 overflow-y-auto"
              role="tabpanel"
              aria-labelledby={
                singlePanelLayout
                  ? "vocab-mobile-tab-dictionary"
                  : "vocab-editor-tab-dictionary"
              }
            >
              <VocabularyListLexiconPicker
                document={document}
                initialPlatformEntries={initialPlatformEntries}
                initialTeacherLexicon={initialTeacherLexicon}
                showLexiconReviewLink={showLexiconReviewLink}
                onAddFields={(fields) => {
                  const result = addVocabEntryFromFields(
                    documentRef.current,
                    fields,
                  );
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
            </div>
          ) : (
            <div
              id="vocab-word-details-panel"
              className={`min-h-0 flex-1 overflow-y-auto p-4 ${
                singlePanelLayout ? "bg-stone-100" : "bg-stone-50"
              }`}
              role="tabpanel"
              aria-labelledby={
                singlePanelLayout
                  ? "vocab-mobile-tab-details"
                  : "vocab-editor-tab-details"
              }
            >
          <div className="mx-auto w-full max-w-5xl space-y-4">
            {singlePanelLayout ? (
              <AuthoringItemPager
                navOnly
                stickyNav
                count={document.entries.length}
                index={selectedEntryIndex}
                onIndexChange={(next) => {
                  const entry = document.entries[next];
                  if (entry) setSelectedEntryId(entry.id);
                }}
                label="Word"
                itemLabels={wordPagerLabels}
                minCount={1}
                onAdd={() => {
                  patchDocument((current) => {
                    const next = addVocabEntry(current);
                    setSelectedEntryId(next.entries.at(-1)?.id ?? "");
                    return next;
                  });
                }}
                onRemove={
                  selectedEntry && document.entries.length > 1
                    ? () => {
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
                      }
                    : undefined
                }
              />
            ) : null}
            {selectedEntry ? (
              <section className={detailsCardClass}>
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 ${
                    singlePanelLayout ? "hidden" : ""
                  }`}
                >
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-900">
                    Selected word
                  </h2>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-40"
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

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="min-w-0 space-y-3">
                    <label className={detailsLabelClass}>
                      Word
                      <input
                        className={inputClass}
                        value={selectedEntry.word}
                        placeholder="New word"
                        onFocus={() => {
                          if (
                            selectedEntry.word.trim() !== "" &&
                            isPlaceholderWord(selectedEntry.word)
                          ) {
                            patchDocument((current) =>
                              patchVocabEntry(current, selectedEntry.id, {
                                word: "",
                              }),
                            );
                          }
                        }}
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
                      <div className="space-y-2">
                        <p className="text-xs text-stone-600">
                          Linked to dictionary{" "}
                          <span className="font-mono text-stone-800">
                            {selectedEntry.sourceWordId}
                          </span>
                          . Edits here stay on this list only; media library picks
                          also attach to the dictionary word.
                        </p>
                        <LexiconLinkedMediaStrip
                          lexiconId={selectedEntry.sourceWordId}
                          refreshKey={lexiconMediaRefreshKey}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600">
                        Add this word from the Dictionary tab to link media to the
                        shared dictionary (many images/audio per word allowed).
                      </p>
                    )}
                    <label className={detailsLabelClass}>
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
                    <label className={detailsLabelClass}>
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
                    <label className={detailsLabelClass}>
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
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className={detailsNestClass}>
                  <MediaUrlControls
                    label="Picture (optional)"
                    compact
                    value={
                      selectedEntry.imageUrl?.startsWith("data:")
                        ? ""
                        : (selectedEntry.imageUrl ?? "")
                    }
                    libraryQueryHint={selectedEntry.word}
                    uploadItemName={selectedEntry.word.trim() || undefined}
                    lexiconId={selectedEntry.sourceWordId}
                    onChange={(url, detail) => {
                          const next = url.trim() || undefined;
                          patchDocument((current) =>
                            patchVocabEntry(current, selectedEntry.id, {
                              imageUrl: next,
                              imageFit: next
                                ? (current.entries.find(
                                    (entry) => entry.id === selectedEntry.id,
                                  )?.imageFit ?? "contain")
                                : undefined,
                            }),
                          );
                          if (next) {
                            void attachMediaToLexicon({
                              lexiconId: selectedEntry.sourceWordId,
                              surface: selectedEntry.word,
                              role: "illustration",
                              mediaAssetId: detail?.mediaAssetId,
                              publicUrl: next,
                            });
                          }
                        }}
                        extraButtons={
                          selectedEntry.imageUrl ? (
                            <button
                              type="button"
                              className="rounded border border-stone-400 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm hover:bg-stone-50"
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
                          ) : null
                        }
                      />
                      {selectedEntry.imageUrl?.startsWith("data:") ? (
                        <div className="space-y-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedEntry.imageUrl}
                            alt=""
                            className="h-24 w-24 rounded-lg border border-stone-300 bg-white object-contain"
                          />
                          <p className="text-xs text-amber-900">
                            Local image still on this list — use Upload above to put it
                            in the shared media library.
                          </p>
                        </div>
                      ) : null}
                      {selectedEntry.imageUrl?.trim() ? (
                        <label className={`flex items-center gap-2 ${detailsLabelClass}`}>
                          Image fit
                          <select
                            className="rounded-lg border border-stone-400/70 bg-white px-2 py-1 text-sm shadow-sm"
                            value={selectedEntry.imageFit ?? "contain"}
                            onChange={(event) =>
                              patchDocument((current) =>
                                patchVocabEntry(current, selectedEntry.id, {
                                  imageFit: event.target.value as
                                    | "cover"
                                    | "contain",
                                }),
                              )
                            }
                          >
                            <option value="contain">Contain</option>
                            <option value="cover">Cover</option>
                          </select>
                        </label>
                      ) : null}
                    </div>

                <VocabEntryAudioControls
                  value={selectedEntry.audioUrl}
                  libraryQueryHint={selectedEntry.word}
                  uploadItemName={selectedEntry.word.trim() || undefined}
                  lexiconId={selectedEntry.sourceWordId}
                  onChange={(next, detail) => {
                        patchDocument((current) =>
                          patchVocabEntry(current, selectedEntry.id, {
                            audioUrl: next,
                          }),
                        );
                        if (next) {
                          void attachMediaToLexicon({
                            lexiconId: selectedEntry.sourceWordId,
                            surface: selectedEntry.word,
                            role: "pronunciation",
                            mediaAssetId: detail?.mediaAssetId,
                            publicUrl: next,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </section>
            ) : (
              <p className="rounded-xl border border-dashed border-stone-400 bg-stone-200/60 px-4 py-8 text-center text-sm text-stone-600">
                Select a word in the list, or switch to Dictionary to add words.
              </p>
            )}
          </div>
            </div>
          )}
        </div>
      </div>

      {notice ? (
        <button
          type="button"
          className="fixed bottom-4 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-full border border-stone-700/40 bg-stone-900/90 px-4 py-2 text-center text-xs font-medium text-white shadow-lg backdrop-blur-sm"
          onClick={() => setNotice(null)}
        >
          {notice}
        </button>
      ) : null}
    </div>
  );
}

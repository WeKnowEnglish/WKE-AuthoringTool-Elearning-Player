"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clickTargetsPayloadSchema,
  dragMatchPayloadSchema,
  dragSentencePayloadSchema,
  essayPayloadSchema,
  fillBlanksPayloadSchema,
  fixTextPayloadSchema,
  hotspotGatePayloadSchema,
  hotspotInfoPayloadSchema,
  letterMixupPayloadSchema,
  listenColorWritePayloadSchema,
  listenHotspotSequencePayloadSchema,
  sortingGamePayloadSchema,
  tableCompletePayloadSchema,
  mcQuizPayloadSchema,
  wordShapeHuntPayloadSchema,
  guidedDialoguePayloadSchema,
  shortAnswerPayloadSchema,
  soundSortPayloadSchema,
  trueFalsePayloadSchema,
  voiceQuestionPayloadSchema,
  parseScreenPayload,
  presentationInteractivePayloadSchema,
  getInteractionSubtype,
  type ScreenPayload,
} from "@/lib/lesson-schemas";
import { updateScreenPayload } from "@/lib/actions/teacher";
import { parseAcceptableAnswersInput } from "@/lib/acceptable-answers-parse";
import {
  payloadToStarredText,
  starredTextToPayload,
} from "@/lib/fill-blanks-star-authoring";
import {
  defaultRegion,
  nextRegionId,
  RectRegionEditor,
  type RectPercent,
} from "@/components/teacher/lesson-editor/RectRegionEditor";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { StoryFields } from "@/components/teacher/lesson-editor/story-fields";
import type { LessonScreenRow } from "@/lib/data/catalog";
import type { ZodType } from "zod";

const DEBUG_SAVE_PIPELINE =
  typeof window !== "undefined" &&
  window.localStorage.getItem("lessonEditorDebug") === "1";

/** Always notify parent; if client Zod rejects, still pass raw (server validates on save). */
function emitLive(
  onLivePayload: (p: unknown) => void,
  schema: ZodType,
  raw: unknown,
) {
  const r = schema.safeParse(raw);
  onLivePayload(r.success ? r.data : raw);
}

type Props = {
  screen: LessonScreenRow;
  index: number;
  lessonId: string;
  moduleId: string;
  isSelected: boolean;
  onSelect: () => void;
  bumpScreenPayload: (screenId: string, payload: unknown) => void;
};

export function ScreenEditorCard({
  screen,
  index,
  lessonId,
  moduleId,
  isSelected,
  onSelect,
  bumpScreenPayload,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() =>
    JSON.stringify(screen.payload, null, 2),
  );

  const pendingRef = useRef<unknown>(screen.payload);
  const lastSavedJson = useRef(JSON.stringify(screen.payload));
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Debounce live preview bumps so dragging regions / story items does not re-render the whole workspace every frame. */
  const previewBumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPreviewRef = useRef<{ screenId: string; payload: unknown } | null>(
    null,
  );
  /** Tracks server identity so we do not treat local-only payload edits as “already saved”. */
  const lastKnownScreenIdRef = useRef<string | undefined>(undefined);
  const lastKnownUpdatedAtRef = useRef<string | undefined>(undefined);

  const payloadSig = JSON.stringify(screen.payload);
  useEffect(() => {
    pendingRef.current = screen.payload;
    setJsonDraft(JSON.stringify(screen.payload, null, 2));

    const idChanged = lastKnownScreenIdRef.current !== screen.id;
    if (idChanged) {
      lastKnownScreenIdRef.current = screen.id;
      lastKnownUpdatedAtRef.current = screen.updated_at;
      lastSavedJson.current = payloadSig;
      return;
    }

    const serverRowChanged = lastKnownUpdatedAtRef.current !== screen.updated_at;
    if (serverRowChanged) {
      lastKnownUpdatedAtRef.current = screen.updated_at;
      lastSavedJson.current = payloadSig;
    }
    // Do not depend on payloadSig alone: parent can briefly re-render with stale
    // RSC data while the server row revision is unchanged; merge in LessonEditorWorkspace
    // prevents that, and pushLive still owns pendingRef for live edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payloadSig omitted intentionally
  }, [screen.id, screen.updated_at]);

  const clearSaveTimer = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  const scheduleBackgroundRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    // Refresh in the background after save settles; this avoids disrupting active typing.
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      startTransition(() => {
        router.refresh();
      });
    }, 1500);
  }, [router]);

  const flushPreviewBump = useCallback(() => {
    if (previewBumpTimerRef.current) {
      clearTimeout(previewBumpTimerRef.current);
      previewBumpTimerRef.current = null;
    }
    const pending = pendingPreviewRef.current;
    if (pending) {
      bumpScreenPayload(pending.screenId, pending.payload);
      pendingPreviewRef.current = null;
    }
  }, [bumpScreenPayload]);

  useEffect(
    () => () => {
      if (previewBumpTimerRef.current) {
        clearTimeout(previewBumpTimerRef.current);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      const pending = pendingPreviewRef.current;
      if (pending) bumpScreenPayload(pending.screenId, pending.payload);
    },
    [bumpScreenPayload],
  );

  const persistPayload = useCallback(
    async (payload: unknown): Promise<boolean> => {
      setErr(null);
      setIsSaving(true);
      try {
        const fd = new FormData();
        fd.set("payload_json", JSON.stringify(payload));
        await updateScreenPayload(
          screen.id,
          lessonId,
          moduleId,
          screen.screen_type,
          fd,
        );
        if (DEBUG_SAVE_PIPELINE) {
          console.debug("[lesson-editor] persist ok", {
            screenId: screen.id,
            screenType: screen.screen_type,
            ts: Date.now(),
          });
        }
        lastSavedJson.current = JSON.stringify(payload);
        setJsonDraft(JSON.stringify(payload, null, 2));
        return true;
      } catch (e) {
        if (DEBUG_SAVE_PIPELINE) {
          console.debug("[lesson-editor] persist failed", { screenId: screen.id, error: e });
        }
        setErr(e instanceof Error ? e.message : "Save failed");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [lessonId, moduleId, screen.id, screen.screen_type],
  );

  /**
   * Serialize saves so quick edits cannot be overwritten by an older in-flight request.
   * If edits continue while saving, run another pass with the latest payload.
   */
  const persistLatestPending = useCallback(async (): Promise<boolean> => {
    saveQueuedRef.current = true;
    if (saveInFlightRef.current) return true;

    let savedAnything = false;
    while (saveQueuedRef.current) {
      saveQueuedRef.current = false;
      const raw = pendingRef.current;
      if (JSON.stringify(raw) === lastSavedJson.current) continue;

      saveInFlightRef.current = true;
      const ok = await persistPayload(raw);
      saveInFlightRef.current = false;
      if (!ok) return false;
      savedAnything = true;

      if (JSON.stringify(pendingRef.current) !== lastSavedJson.current) {
        saveQueuedRef.current = true;
      }
    }
    return savedAnything;
  }, [persistPayload]);

  const saveNow = useCallback(async () => {
    flushPreviewBump();
    setSaveHint(null);
    clearSaveTimer();
    const raw = pendingRef.current;
    if (JSON.stringify(raw) === lastSavedJson.current) {
      setSaveHint("Already saved — no pending changes.");
      window.setTimeout(() => setSaveHint(null), 3000);
      return;
    }
    const ok = await persistLatestPending();
    if (ok) {
      bumpScreenPayload(screen.id, pendingRef.current);
      setSaveHint("Saved. Refreshing…");
      startTransition(() => {
        router.refresh();
      });
      window.setTimeout(() => {
        setSaveHint(null);
      }, 2500);
    }
  }, [
    bumpScreenPayload,
    clearSaveTimer,
    flushPreviewBump,
    persistLatestPending,
    router,
    screen.id,
  ]);

  /** After typing pauses (~3s) — avoids saving mid-word and clobbering the editor on refresh. */
  const scheduleDebouncedPersist = useCallback(() => {
    clearSaveTimer();
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null;
      const raw = pendingRef.current;
      if (JSON.stringify(raw) === lastSavedJson.current) return;
      void persistLatestPending().then((ok) => {
        if (ok) scheduleBackgroundRefresh();
      });
    }, 3000);
  }, [clearSaveTimer, persistLatestPending, scheduleBackgroundRefresh]);

  const pushLive = useCallback(
    (p: unknown) => {
      pendingRef.current = p;
      pendingPreviewRef.current = { screenId: screen.id, payload: p };
      if (previewBumpTimerRef.current) {
        clearTimeout(previewBumpTimerRef.current);
      }
      previewBumpTimerRef.current = setTimeout(() => {
        previewBumpTimerRef.current = null;
        const pending = pendingPreviewRef.current;
        if (pending) {
          bumpScreenPayload(pending.screenId, pending.payload);
        }
      }, 200);
      scheduleDebouncedPersist();
    },
    [bumpScreenPayload, screen.id, scheduleDebouncedPersist],
  );

  /** When focus leaves this screen card, save immediately so nothing is lost if the user navigates away. */
  function onBlurCapture(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    flushPreviewBump();
    clearSaveTimer();
    const raw = pendingRef.current;
    if (JSON.stringify(raw) === lastSavedJson.current) return;
    void persistLatestPending().then((ok) => {
      if (ok) scheduleBackgroundRefresh();
    });
  }

  const storySyncKey = `${screen.id}:${screen.updated_at ?? ""}`;

  const parsed = useMemo(
    () => parseScreenPayload(screen.screen_type, screen.payload),
    [screen.screen_type, screen.payload],
  );

  return (
    <div
      className={`rounded border bg-white p-4 ${
        isSelected ? "ring-2 ring-sky-600" : ""
      }`}
      id={`screen-${screen.id}`}
      onBlurCapture={onBlurCapture}
    >
      <button
        type="button"
        onClick={onSelect}
        className="mb-2 w-full rounded-md text-left font-semibold hover:underline active:bg-neutral-100"
      >
        #{index} · {screen.screen_type}
        {screen.screen_type === "interaction"
          ? ` · ${getInteractionSubtype(screen.payload) ?? "?"}`
          : ""}
      </button>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void saveNow()}
          className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Save screen now
        </button>
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="rounded px-1 text-sm text-neutral-600 underline hover:bg-neutral-50 active:bg-neutral-100"
        >
          {showJson ? "Hide" : "Show"} advanced JSON
        </button>
        {isSaving ? (
          <span className="text-xs font-medium text-neutral-500">Saving…</span>
        ) : null}
      </div>
      {saveHint ? (
        <p
          className={`mb-2 text-xs font-medium ${
            saveHint.startsWith("Already") ? "text-neutral-600" : "text-green-800"
          }`}
        >
          {saveHint}
        </p>
      ) : null}
      {err ? (
        <p className="mb-2 rounded bg-red-50 px-2 py-1 text-sm text-red-800">{err}</p>
      ) : null}
      {showJson ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={jsonDraft}
            onChange={(e) => {
              const v = e.target.value;
              setJsonDraft(v);
              try {
                const p = JSON.parse(v);
                pushLive(p);
              } catch {
                /* incomplete JSON */
              }
            }}
            rows={10}
            className="w-full rounded border font-mono text-xs"
          />
          <p className="text-xs text-neutral-500">
            Valid JSON syncs the preview immediately; leaving this box saves to the server after a short pause.
          </p>
        </div>
      ) : null}
      {!showJson && parsed ? (
        <StructuredFields
          screenType={screen.screen_type}
          parsed={parsed}
          onLivePayload={pushLive}
          busy={false}
          storySyncKey={
            screen.screen_type === "story" ? storySyncKey : undefined
          }
        />
      ) : !showJson && !parsed ? (
        <p className="text-sm text-red-700">
          Payload is invalid for this screen type. Fix it in advanced JSON.
        </p>
      ) : null}
    </div>
  );
}

function StructuredFields({
  screenType,
  parsed,
  onLivePayload,
  busy,
  storySyncKey,
}: {
  screenType: string;
  parsed: ScreenPayload;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
  /** When set, StoryFields only resets from props when this key changes (server row), not on every live edit. */
  storySyncKey?: string;
}) {
  if (screenType === "start" && parsed.type === "start") {
    return <StartFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
  }
  if (screenType === "story" && parsed.type === "story") {
    return (
      <StoryFields
        syncKey={storySyncKey ?? `${parsed.type}-fallback`}
        initial={parsed}
        onLivePayload={onLivePayload}
        busy={busy}
      />
    );
  }
  if (screenType === "interaction" && parsed.type === "interaction") {
    switch (parsed.subtype) {
      case "mc_quiz":
        return <McQuizFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "true_false":
        return <TrueFalseFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "short_answer":
        return <ShortAnswerFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "essay":
        return <EssayFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "fill_blanks":
        return <FillBlanksFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "fix_text":
        return <FixTextFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "click_targets":
        return <ClickTargetsFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "drag_sentence":
        return <DragSentenceFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "hotspot_info":
        return <HotspotInfoFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "hotspot_gate":
        return <HotspotGateFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "listen_hotspot_sequence":
        return (
          <ListenHotspotSequenceFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />
        );
      case "listen_color_write":
        return (
          <ListenColorWriteFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />
        );
      case "letter_mixup":
        return <LetterMixupFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "word_shape_hunt":
        return <WordShapeHuntFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "table_complete":
        return <TableCompleteFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "sorting_game":
        return <SortingGameFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "drag_match":
        return <DragMatchFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "sound_sort":
        return <SoundSortFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "voice_question":
        return <VoiceQuestionFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "guided_dialogue":
        return <GuidedDialogueFields initial={parsed} onLivePayload={onLivePayload} busy={busy} />;
      case "presentation_interactive":
        return (
          <PresentationInteractiveFields
            initial={parsed}
            onLivePayload={onLivePayload}
            busy={busy}
          />
        );
      default:
        return (
          <p className="text-sm text-neutral-600">
            Use advanced JSON for this interaction subtype.
          </p>
        );
    }
  }
  return null;
}

function labelClass() {
  return "mt-2 block text-sm font-medium text-neutral-800";
}

function StartFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "start" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [image_url, setImageUrl] = useState(initial.image_url ?? "");
  const [image_fit, setImageFit] = useState<"cover" | "contain">(initial.image_fit ?? "cover");
  const [cta_label, setCta] = useState(initial.cta_label ?? "Start learning");
  const [read_aloud_title, setReadAloudTitle] = useState(initial.read_aloud_title ?? "");

  useEffect(() => {
    setImageUrl(initial.image_url ?? "");
    setImageFit(initial.image_fit ?? "cover");
    setCta(initial.cta_label ?? "Start learning");
    setReadAloudTitle(initial.read_aloud_title ?? "");
  }, [initial.image_url, initial.image_fit, initial.cta_label, initial.read_aloud_title]);

  function emit(image: string, fit: "cover" | "contain", cta: string, readTitle: string) {
    onLivePayload({
      type: "start",
      image_url: image.trim() || undefined,
      image_fit: fit,
      cta_label: cta.trim() || "Start learning",
      read_aloud_title: readTitle.trim() || undefined,
    });
  }

  return (
    <div className="space-y-2">
      <MediaUrlControls
        label="Start screen image"
        value={image_url}
        onChange={(v) => {
          setImageUrl(v);
          emit(v, image_fit, cta_label, read_aloud_title);
        }}
        disabled={busy}
      />
      <label className={labelClass()}>
        Image display
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={image_fit}
          onChange={(e) => {
            const v = (e.target.value === "contain" ? "contain" : "cover") as "cover" | "contain";
            setImageFit(v);
            emit(image_url, v, cta_label, read_aloud_title);
          }}
        >
          <option value="cover">Fill frame (crop if needed)</option>
          <option value="contain">Show whole image (fit inside)</option>
        </select>
      </label>
      <label className={labelClass()}>
        Button label
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={cta_label}
          onChange={(e) => {
            const v = e.target.value;
            setCta(v);
            emit(image_url, image_fit, v, read_aloud_title);
          }}
        />
      </label>
      <label className={labelClass()}>
        Read-aloud title (optional — overrides lesson name for “Hear title”)
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={read_aloud_title}
          onChange={(e) => {
            const v = e.target.value;
            setReadAloudTitle(v);
            emit(image_url, image_fit, cta_label, v);
          }}
        />
      </label>
    </div>
  );
}

function McQuizFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "mc_quiz" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const parseOptionsFromText = useCallback((opts: string) => {
    return opts
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean)
      .map((label: string, idx: number) => ({ id: `opt_${idx + 1}`, label }));
  }, []);
  const resolveCorrectOptionId = useCallback(
    (opts: string, candidate: string) => {
      const options = parseOptionsFromText(opts);
      const optionIds = new Set(options.map((o: { id: string }) => o.id));
      const resolvedCorrect = optionIds.has(candidate) ? candidate : (options[0]?.id ?? "");
      return { options, resolvedCorrect };
    },
    [parseOptionsFromText],
  );
  const [question, setQ] = useState(initial.question);
  const [image_url, setImg] = useState(initial.image_url ?? "");
  const [image_fit, setImageFit] = useState(initial.image_fit ?? "cover");
  const [optionsText, setOpts] = useState(
    initial.options.map((o: { id: string; label: string }) => o.label).join("\n"),
  );
  const [correct_option_id, setCorrect] = useState(initial.correct_option_id ?? "");
  const [shuffle_options, setShuffleOptions] = useState(initial.shuffle_options ?? false);
  const [tip_text, setTip] = useState(initial.guide?.tip_text ?? "");
  const localDraftSigRef = useRef("");

  useEffect(() => {
    const { options, resolvedCorrect } = resolveCorrectOptionId(optionsText, correct_option_id);
    localDraftSigRef.current = JSON.stringify({
      question,
      image_url: image_url || undefined,
      image_fit,
      options,
      correct_option_id: resolvedCorrect,
      shuffle_options,
      guide_tip_text: tip_text || "",
    });
  }, [
    question,
    image_url,
    image_fit,
    optionsText,
    correct_option_id,
    shuffle_options,
    tip_text,
    resolveCorrectOptionId,
  ]);

  useEffect(() => {
    const incomingOptionsText = initial.options
      .map((o: { id: string; label: string }) => o.label)
      .join("\n");
    const incomingSig = JSON.stringify({
      question: initial.question,
      image_url: initial.image_url ?? undefined,
      image_fit: initial.image_fit ?? "cover",
      options: initial.options,
      correct_option_id: initial.correct_option_id ?? "",
      shuffle_options: initial.shuffle_options ?? false,
      guide_tip_text: initial.guide?.tip_text ?? "",
    });
    // Ignore parent re-renders that only reflect our in-progress local typing.
    if (incomingSig === localDraftSigRef.current) return;
    setQ(initial.question);
    setImg(initial.image_url ?? "");
    setImageFit(initial.image_fit ?? "cover");
    setOpts(incomingOptionsText);
    setCorrect(initial.correct_option_id ?? "");
    setShuffleOptions(initial.shuffle_options ?? false);
    setTip(initial.guide?.tip_text ?? "");
  }, [
    initial.question,
    initial.image_url,
    initial.image_fit,
    initial.options,
    initial.correct_option_id,
    initial.shuffle_options,
    initial.guide?.tip_text,
  ]);

  function emitFrom(
    q: string,
    img: string,
    fit: "cover" | "contain",
    opts: string,
    correct: string,
    shuffle: boolean,
    tip: string,
  ) {
    const { options, resolvedCorrect } = resolveCorrectOptionId(opts, correct);
    emitLive(onLivePayload, mcQuizPayloadSchema, {
      type: "interaction",
      subtype: "mc_quiz",
      question: q,
      image_url: img || undefined,
      image_fit: fit,
      options,
      correct_option_id: resolvedCorrect,
      shuffle_options: shuffle,
      guide: tip ? { tip_text: tip } : undefined,
    });
  }

  return (
    <div className="space-y-2">
      <label className={labelClass()}>
        Question
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={question}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            emitFrom(v, image_url, image_fit, optionsText, correct_option_id, shuffle_options, tip_text);
          }}
        />
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emitFrom(question, v, image_fit, optionsText, correct_option_id, shuffle_options, tip_text);
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Image display
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={image_fit}
          onChange={(e) => {
            const v = (e.target.value === "contain" ? "contain" : "cover") as "cover" | "contain";
            setImageFit(v);
            emitFrom(question, image_url, v, optionsText, correct_option_id, shuffle_options, tip_text);
          }}
        >
          <option value="cover">Fill frame (crop if needed)</option>
          <option value="contain">Show whole image (fit inside)</option>
        </select>
      </label>
      <label className={labelClass()}>
        Answer options (one option per line)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
          rows={5}
          value={optionsText}
          onChange={(e) => {
            const v = e.target.value;
            const { resolvedCorrect } = resolveCorrectOptionId(v, correct_option_id);
            setOpts(v);
            setCorrect(resolvedCorrect);
            emitFrom(question, image_url, image_fit, v, resolvedCorrect, shuffle_options, tip_text);
          }}
        />
      </label>
      <label className={labelClass()}>
        Correct answer
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={correct_option_id}
          onChange={(e) => {
            const v = e.target.value;
            setCorrect(v);
            emitFrom(question, image_url, image_fit, optionsText, v, shuffle_options, tip_text);
          }}
        >
          {optionsText
            .split("\n")
            .map((line: string) => line.trim())
            .filter(Boolean)
            .map((label: string, idx: number) => {
              const id = `opt_${idx + 1}`;
              return (
                <option key={id} value={id}>
                  {label}
                </option>
              );
            })}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input
          type="checkbox"
          checked={shuffle_options}
          onChange={(e) => {
            const v = e.target.checked;
            setShuffleOptions(v);
            emitFrom(question, image_url, image_fit, optionsText, correct_option_id, v, tip_text);
          }}
        />
        Shuffle answer order for students
      </label>
      <label className={labelClass()}>
        Guide tip (optional)
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={tip_text}
          onChange={(e) => {
            const v = e.target.value;
            setTip(v);
            emitFrom(question, image_url, image_fit, optionsText, correct_option_id, shuffle_options, v);
          }}
        />
      </label>
    </div>
  );
}

function TrueFalseFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "true_false" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [statement, setS] = useState(initial.statement);
  const [correct, setC] = useState(initial.correct);
  const [image_url, setImg] = useState(initial.image_url ?? "");

  useEffect(() => {
    setS(initial.statement);
    setC(initial.correct);
    setImg(initial.image_url ?? "");
  }, [initial.statement, initial.correct, initial.image_url]);

  function emit(st: string, cor: boolean, img: string) {
    emitLive(onLivePayload, trueFalsePayloadSchema, {
      type: "interaction",
      subtype: "true_false",
      statement: st,
      correct: cor,
      image_url: img || undefined,
    });
  }

  return (
    <div className="space-y-2">
      <label className={labelClass()}>
        Statement
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={3}
          value={statement}
          onChange={(e) => {
            const v = e.target.value;
            setS(v);
            emit(v, correct, image_url);
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={correct}
          onChange={(e) => {
            const v = e.target.checked;
            setC(v);
            emit(statement, v, image_url);
          }}
        />
        Correct answer is True
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(statement, correct, v);
        }}
        disabled={busy}
        compact
      />
    </div>
  );
}

function ShortAnswerFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "short_answer" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [prompt, setP] = useState(initial.prompt);
  const [acceptable, setAcc] = useState(initial.acceptable_answers.join("\n"));
  const [case_insensitive, setCi] = useState(initial.case_insensitive ?? true);
  const [normalize_whitespace, setNw] = useState(initial.normalize_whitespace ?? true);
  const [image_url, setImg] = useState(initial.image_url ?? "");

  const acceptableAnswersSig = JSON.stringify(initial.acceptable_answers);
  useEffect(() => {
    setP(initial.prompt);
    setAcc(initial.acceptable_answers.join("\n"));
    setCi(initial.case_insensitive ?? true);
    setNw(initial.normalize_whitespace ?? true);
    setImg(initial.image_url ?? "");
  }, [
    initial.prompt,
    acceptableAnswersSig,
    initial.case_insensitive,
    initial.normalize_whitespace,
    initial.image_url,
  ]);

  function emit(
    pr: string,
    acc: string,
    ci: boolean,
    nw: boolean,
    img: string,
  ) {
    const acceptable_answers = parseAcceptableAnswersInput(acc);
    emitLive(onLivePayload, shortAnswerPayloadSchema, {
      type: "interaction",
      subtype: "short_answer",
      prompt: pr,
      acceptable_answers,
      case_insensitive: ci,
      normalize_whitespace: nw,
      image_url: img || undefined,
    });
  }

  return (
    <div className="space-y-2">
      <label className={labelClass()}>
        Prompt
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={prompt}
          onChange={(e) => {
            const v = e.target.value;
            setP(v);
            emit(v, acceptable, case_insensitive, normalize_whitespace, image_url);
          }}
        />
      </label>
      <label className={labelClass()}>
        Acceptable answers — one per line, or several on one line separated by{" "}
        <strong>semicolons</strong> (e.g. <code>Hello; Hi</code>). If you use a single line with{" "}
        <strong>commas</strong> only, answers split on commas.
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={4}
          value={acceptable}
          onChange={(e) => {
            const v = e.target.value;
            setAcc(v);
            emit(prompt, v, case_insensitive, normalize_whitespace, image_url);
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={case_insensitive}
          onChange={(e) => {
            const v = e.target.checked;
            setCi(v);
            emit(prompt, acceptable, v, normalize_whitespace, image_url);
          }}
        />
        Case-insensitive
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={normalize_whitespace}
          onChange={(e) => {
            const v = e.target.checked;
            setNw(v);
            emit(prompt, acceptable, case_insensitive, v, image_url);
          }}
        />
        Normalize whitespace
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(prompt, acceptable, case_insensitive, normalize_whitespace, v);
        }}
        disabled={busy}
        compact
      />
    </div>
  );
}

function EssayFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "essay" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [prompt, setP] = useState(initial.prompt);
  const [min_chars, setMin] = useState(initial.min_chars ?? 0);
  const [image_url, setImg] = useState(initial.image_url ?? "");
  const [keywordsText, setKeywordsText] = useState(
    (initial.keywords ?? []).join("\n"),
  );
  const [feedback_text, setFeedback] = useState(initial.feedback_text ?? "");
  const [show_keywords_to_students, setShowKw] = useState(
    initial.show_keywords_to_students ?? false,
  );

  useEffect(() => {
    setP(initial.prompt);
    setMin(initial.min_chars ?? 0);
    setImg(initial.image_url ?? "");
    setKeywordsText((initial.keywords ?? []).join("\n"));
    setFeedback(initial.feedback_text ?? "");
    setShowKw(initial.show_keywords_to_students ?? false);
  }, [
    initial.prompt,
    initial.min_chars,
    initial.image_url,
    initial.keywords,
    initial.feedback_text,
    initial.show_keywords_to_students,
  ]);

  function emit(
    pr: string,
    min: number,
    img: string,
    kwRaw: string,
    fb: string,
    showKw: boolean,
  ) {
    const keywords = parseAcceptableAnswersInput(kwRaw);
    emitLive(onLivePayload, essayPayloadSchema, {
      type: "interaction",
      subtype: "essay",
      prompt: pr,
      min_chars: min || undefined,
      image_url: img || undefined,
      keywords: keywords.length ? keywords : undefined,
      feedback_text: fb.trim() || undefined,
      show_keywords_to_students: showKw,
    });
  }

  return (
    <div className="space-y-2">
      <label className={labelClass()}>
        Prompt
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={4}
          value={prompt}
          onChange={(e) => {
            const v = e.target.value;
            setP(v);
            emit(v, min_chars, image_url, keywordsText, feedback_text, show_keywords_to_students);
          }}
        />
      </label>
      <label className={labelClass()}>
        Keywords or phrases students might use (optional — one per line or semicolon-separated)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={3}
          value={keywordsText}
          onChange={(e) => {
            const v = e.target.value;
            setKeywordsText(v);
            emit(prompt, min_chars, image_url, v, feedback_text, show_keywords_to_students);
          }}
        />
      </label>
      <label className={labelClass()}>
        Feedback for students (optional — shown after they submit)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={3}
          value={feedback_text}
          onChange={(e) => {
            const v = e.target.value;
            setFeedback(v);
            emit(prompt, min_chars, image_url, keywordsText, v, show_keywords_to_students);
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={show_keywords_to_students}
          onChange={(e) => {
            const v = e.target.checked;
            setShowKw(v);
            emit(prompt, min_chars, image_url, keywordsText, feedback_text, v);
          }}
        />
        Show keyword ideas to students while they write
      </label>
      <label className={labelClass()}>
        Minimum characters (0 = none)
        <input
          type="number"
          min={0}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={min_chars}
          onChange={(e) => {
            const v = Number(e.target.value);
            setMin(v);
            emit(prompt, v, image_url, keywordsText, feedback_text, show_keywords_to_students);
          }}
        />
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(prompt, min_chars, v, keywordsText, feedback_text, show_keywords_to_students);
        }}
        disabled={busy}
        compact
      />
    </div>
  );
}

/** One word-bank entry per line; keeps commas and spaces inside a line. */
function parseFillBlanksWordBankInput(raw: string): string[] {
  return raw
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function FillBlanksFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "fill_blanks" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [starredText, setStarred] = useState(() =>
    payloadToStarredText(initial.template, initial.blanks),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [wordBankDraft, setWb] = useState(() =>
    (initial.word_bank ?? []).join("\n"),
  );
  const [image_url, setImg] = useState(initial.image_url ?? "");
  const [image_fit, setImageFit] = useState<"cover" | "contain">(initial.image_fit ?? "cover");
  const [image_size, setImageSize] = useState<"small" | "normal">(initial.image_size ?? "normal");
  const [body_text, setBody] = useState(initial.body_text ?? "");

  const lastGoodRef = useRef({
    template: initial.template,
    blanks: initial.blanks,
  });

  const blanksSig = JSON.stringify(initial.blanks);
  const wordBankSig = JSON.stringify(initial.word_bank ?? []);

  useEffect(() => {
    setStarred(payloadToStarredText(initial.template, initial.blanks));
    setParseError(null);
    setWb((initial.word_bank ?? []).join("\n"));
    setImg(initial.image_url ?? "");
    setImageFit(initial.image_fit ?? "cover");
    setImageSize(initial.image_size ?? "normal");
    setBody(initial.body_text ?? "");
    lastGoodRef.current = { template: initial.template, blanks: initial.blanks };
  }, [
    initial.template,
    blanksSig,
    wordBankSig,
    initial.image_url,
    initial.image_fit,
    initial.image_size,
    initial.body_text,
  ]);

  function tryEmit(
    starred: string,
    wb: string,
    img: string,
    fit: "cover" | "contain",
    size: "small" | "normal",
    intro: string,
  ) {
    const word_bank = parseFillBlanksWordBankInput(wb);
    const base = {
      type: "interaction" as const,
      subtype: "fill_blanks" as const,
      word_bank: word_bank.length ? word_bank : undefined,
      image_url: img || undefined,
      image_fit: fit,
      image_size: size,
      body_text: intro || undefined,
      guide: initial.guide,
    };
    const r = starredTextToPayload(starred);
    if (r.ok) {
      setParseError(null);
      lastGoodRef.current = { template: r.template, blanks: r.blanks };
      emitLive(onLivePayload, fillBlanksPayloadSchema, {
        ...base,
        template: r.template,
        blanks: r.blanks,
      });
      return;
    }
    setParseError(r.error);
    const { template, blanks } = lastGoodRef.current;
    emitLive(onLivePayload, fillBlanksPayloadSchema, {
      ...base,
      template,
      blanks,
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-600">
        Type your sentence and wrap each blank in <strong>asterisks</strong>. Synonyms:{" "}
        <code>*big|large*</code>. Example: <code>The *cat* sat on the *mat*</code>.
      </p>
      <label className={labelClass()}>
        Sentence with blanks
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={4}
          value={starredText}
          onChange={(e) => {
            const v = e.target.value;
            setStarred(v);
            tryEmit(v, wordBankDraft, image_url, image_fit, image_size, body_text);
          }}
        />
      </label>
      {parseError ? (
        <p className="text-sm text-amber-900">{parseError}</p>
      ) : null}
      <label className={labelClass()}>
        Word bank (optional — one entry per line; commas and spaces inside a line are kept)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={3}
          value={wordBankDraft}
          onChange={(e) => {
            const v = e.target.value;
            setWb(v);
            tryEmit(starredText, v, image_url, image_fit, image_size, body_text);
          }}
        />
      </label>
      <label className={labelClass()}>
        Intro text (optional)
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            tryEmit(starredText, wordBankDraft, image_url, image_fit, image_size, v);
          }}
        />
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          tryEmit(starredText, wordBankDraft, v, image_fit, image_size, body_text);
        }}
        disabled={busy}
        compact
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className={labelClass()}>
          Image display
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={image_fit}
            onChange={(e) => {
              const v = (e.target.value === "contain" ? "contain" : "cover") as "cover" | "contain";
              setImageFit(v);
              tryEmit(starredText, wordBankDraft, image_url, v, image_size, body_text);
            }}
          >
            <option value="cover">Fill frame (crop if needed)</option>
            <option value="contain">Show whole image (fit inside)</option>
          </select>
        </label>
        <label className={labelClass()}>
          Image size
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={image_size}
            onChange={(e) => {
              const v = (e.target.value === "small" ? "small" : "normal") as "small" | "normal";
              setImageSize(v);
              tryEmit(starredText, wordBankDraft, image_url, image_fit, v, body_text);
            }}
          >
            <option value="normal">Normal</option>
            <option value="small">Small</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function FixTextFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "fix_text" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [broken_text, setB] = useState(initial.broken_text);
  const [acceptableText, setA] = useState(initial.acceptable.join("\n"));
  const [image_url, setImg] = useState(initial.image_url ?? "");
  const [body_text, setBody] = useState(initial.body_text ?? "");

  const acceptableSig = JSON.stringify(initial.acceptable);
  useEffect(() => {
    setB(initial.broken_text);
    setA(initial.acceptable.join("\n"));
    setImg(initial.image_url ?? "");
    setBody(initial.body_text ?? "");
  }, [initial.broken_text, acceptableSig, initial.image_url, initial.body_text]);

  function emit(br: string, acc: string, img: string, intro: string) {
    const acceptable = parseAcceptableAnswersInput(acc);
    emitLive(onLivePayload, fixTextPayloadSchema, {
      type: "interaction",
      subtype: "fix_text",
      broken_text: br,
      acceptable,
      image_url: img || undefined,
      body_text: intro || undefined,
      case_insensitive: initial.case_insensitive ?? true,
      normalize_whitespace: initial.normalize_whitespace ?? true,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-2">
      <label className={labelClass()}>
        Broken text (shown to student)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={3}
          value={broken_text}
          onChange={(e) => {
            const v = e.target.value;
            setB(v);
            emit(v, acceptableText, image_url, body_text);
          }}
        />
      </label>
      <label className={labelClass()}>
        Acceptable corrected answers — one per line, or use <strong>semicolons</strong> on one line; a
        single comma-only line splits on commas.
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={4}
          value={acceptableText}
          onChange={(e) => {
            const v = e.target.value;
            setA(v);
            emit(broken_text, v, image_url, body_text);
          }}
        />
      </label>
      <label className={labelClass()}>
        Intro (optional)
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(broken_text, acceptableText, image_url, v);
          }}
        />
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(broken_text, acceptableText, v, body_text);
        }}
        disabled={busy}
        compact
      />
    </div>
  );
}

function ClickTargetsFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "click_targets" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [body_text, setBody] = useState(initial.body_text);
  const [image_url, setImg] = useState(initial.image_url);
  const [targets, setTargets] = useState<RectPercent[]>(() =>
    initial.targets.map((t) => ({ ...t })),
  );
  const [mode, setMode] = useState<"single" | "treasure">(() =>
    (initial.treasure_target_ids?.length ?? 0) > 0 ? "treasure" : "single",
  );
  const [correct_target_id, setCorrect] = useState(initial.correct_target_id ?? "");
  const [treasureIds, setTreasureIds] = useState<string[]>(
    () => initial.treasure_target_ids ?? [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setBody(initial.body_text);
    setImg(initial.image_url);
    setTargets(initial.targets.map((t) => ({ ...t })));
    setMode((initial.treasure_target_ids?.length ?? 0) > 0 ? "treasure" : "single");
    setCorrect(initial.correct_target_id ?? "");
    setTreasureIds(initial.treasure_target_ids ?? []);
    setSelectedId(null);
  }, [
    initial.body_text,
    initial.image_url,
    initial.correct_target_id,
    initial.treasure_target_ids,
    initial.targets,
  ]);

  function emit(
    body: string,
    img: string,
    tgs: RectPercent[],
    m: "single" | "treasure",
    cor: string,
    treasures: string[],
  ) {
    const base = {
      type: "interaction" as const,
      subtype: "click_targets" as const,
      body_text: body,
      image_url: img,
      targets: tgs,
      guide: initial.guide,
    };
    const payload =
      m === "treasure" && treasures.length > 0
        ? { ...base, treasure_target_ids: treasures }
        : { ...base, correct_target_id: cor };
    emitLive(onLivePayload, clickTargetsPayloadSchema, payload);
  }

  function pushEmit(
    nextT: RectPercent[],
    nextMode = mode,
    nextCor = correct_target_id,
    nextTreasure = treasureIds,
  ) {
    setTargets(nextT);
    emit(body_text, image_url, nextT, nextMode, nextCor, nextTreasure);
  }

  const selected = targets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Instructions
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(v, image_url, targets, mode, correct_target_id, treasureIds);
          }}
        />
      </label>
      <MediaUrlControls
        label="Background image"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(body_text, v, targets, mode, correct_target_id, treasureIds);
        }}
        disabled={busy}
        compact
      />
      <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-sm font-semibold text-neutral-800">Tap mode</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ct-mode"
              checked={mode === "single"}
              onChange={() => {
                setMode("single");
                const first = targets[0]?.id ?? "";
                setCorrect(first);
                setTreasureIds([]);
                emit(body_text, image_url, targets, "single", first, []);
              }}
            />
            One correct target
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ct-mode"
              checked={mode === "treasure"}
              onChange={() => {
                setMode("treasure");
                const all = targets.map((t) => t.id);
                setTreasureIds(all);
                setCorrect("");
                emit(body_text, image_url, targets, "treasure", "", all);
              }}
            />
            Find all (treasure hunt — tap every listed target; others are decoys)
          </label>
        </div>
      </div>
      {image_url ? (
        <RectRegionEditor
          imageUrl={image_url}
          regions={targets}
          onRegionsChange={(next) => pushEmit(next)}
          selectedId={selectedId}
          onSelect={setSelectedId}
          disabled={busy}
        />
      ) : (
        <p className="text-sm text-amber-800">Add a background image to place targets.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
          onClick={() => {
            const id = nextRegionId(targets, "t");
            const next = [...targets, defaultRegion(id)];
            pushEmit(next);
            setSelectedId(id);
          }}
        >
          Add target
        </button>
        <button
          type="button"
          disabled={busy || !selectedId}
          className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
          onClick={() => {
            if (!selectedId) return;
            const next = targets.filter((t) => t.id !== selectedId);
            const nextTreasure = treasureIds.filter((id) => id !== selectedId);
            const nextCor =
              correct_target_id === selectedId ? next[0]?.id ?? "" : correct_target_id;
            setSelectedId(null);
            setTreasureIds(nextTreasure);
            setCorrect(nextCor);
            emit(body_text, image_url, next, mode, nextCor, nextTreasure);
            setTargets(next);
          }}
        >
          Remove selected
        </button>
      </div>
      {mode === "single" ? (
        <label className={labelClass()}>
          Correct target
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={correct_target_id}
            onChange={(e) => {
              const v = e.target.value;
              setCorrect(v);
              emit(body_text, image_url, targets, mode, v, treasureIds);
            }}
          >
            <option value="">—</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.id}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="space-y-1">
          <span className={labelClass()}>Targets students must find (check all that apply)</span>
          <ul className="space-y-1">
            {targets.map((t) => (
              <li key={t.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={treasureIds.includes(t.id)}
                    onChange={(e) => {
                      const on = e.target.checked;
                      const next = on
                        ? [...treasureIds, t.id]
                        : treasureIds.filter((id) => id !== t.id);
                      setTreasureIds(next);
                      emit(body_text, image_url, targets, mode, correct_target_id, next);
                    }}
                  />
                  {t.label || t.id}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {selected ? (
        <div className="grid gap-2 rounded border border-neutral-200 p-3 sm:grid-cols-2">
          <p className="col-span-full text-sm font-semibold">Selected: {selected.id}</p>
          <label className={labelClass()}>
            Label (optional)
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.label ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = targets.map((t) =>
                  t.id === selected.id ? { ...t, label: v || undefined } : t,
                );
                pushEmit(next);
              }}
            />
          </label>
          {(["x_percent", "y_percent", "w_percent", "h_percent"] as const).map((key) => (
            <label key={key} className={labelClass()}>
              {key.replace("_percent", "")} %
              <input
                type="number"
                step={0.1}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selected[key]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  const next = targets.map((t) =>
                    t.id === selected.id ? { ...t, [key]: n } : t,
                  );
                  pushEmit(next);
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DragSentenceFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "drag_sentence" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [body_text, setBody] = useState(initial.body_text ?? "");
  const [image_url, setImg] = useState(initial.image_url ?? "");
  const [blankCount, setBlankCount] = useState(() =>
    Math.max(1, initial.sentence_slots.length || 2),
  );
  const [bank, setBank] = useState(initial.word_bank.join("\n"));
  const [order, setOrder] = useState(initial.correct_order.join("\n"));

  useEffect(() => {
    setBody(initial.body_text ?? "");
    setImg(initial.image_url ?? "");
    setBlankCount(Math.max(1, initial.sentence_slots.length || 2));
    setBank(initial.word_bank.join("\n"));
    setOrder(initial.correct_order.join("\n"));
  }, [
    initial.body_text,
    initial.image_url,
    initial.sentence_slots,
    initial.word_bank,
    initial.correct_order,
  ]);

  const word_bank = bank
    .split("\n")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const correct_order = order
    .split("\n")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const bankSet = new Set(word_bank);
  const orderInBank =
    correct_order.length === 0 ||
    correct_order.every((w) => bankSet.has(w));

  function emit(
    intro: string,
    img: string,
    nBlanks: number,
    bk: string,
    ord: string,
  ) {
    const wb = bk
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const co = ord
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const slots = Array.from({ length: Math.max(1, nBlanks) }, () => "");
    emitLive(onLivePayload, dragSentencePayloadSchema, {
      type: "interaction",
      subtype: "drag_sentence",
      body_text: intro || undefined,
      image_url: img || undefined,
      sentence_slots: slots,
      word_bank: wb,
      correct_order: co,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-2">
      <label className={labelClass()}>
        Intro (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(v, image_url, blankCount, bank, order);
          }}
        />
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(body_text, v, blankCount, bank, order);
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Number of blanks (word slots)
        <input
          type="number"
          min={1}
          max={20}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={blankCount}
          onChange={(e) => {
            const n = Math.max(1, Math.min(20, Number(e.target.value) || 1));
            setBlankCount(n);
            emit(body_text, image_url, n, bank, order);
          }}
        />
      </label>
      <label className={labelClass()}>
        Word bank (one word per line — includes correct words and any extras)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={4}
          value={bank}
          onChange={(e) => {
            const v = e.target.value;
            setBank(v);
            emit(body_text, image_url, blankCount, v, order);
          }}
        />
      </label>
      <label className={labelClass()}>
        Correct order (one word per line, top to bottom — must match number of blanks)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={4}
          value={order}
          onChange={(e) => {
            const v = e.target.value;
            setOrder(v);
            emit(body_text, image_url, blankCount, bank, v);
          }}
        />
      </label>
      {correct_order.length > 0 && correct_order.length !== blankCount ? (
        <p className="text-xs text-amber-800">
          Tip: You have {blankCount} blank(s) but {correct_order.length} word(s) in the correct
          order. They should match for the activity to work.
        </p>
      ) : null}
      {!orderInBank ? (
        <p className="text-xs text-amber-800">
          Tip: Every word in “correct order” should also appear in the word bank.
        </p>
      ) : null}
    </div>
  );
}

type PresentationElementState = {
  id: string;
  kind: "image" | "text" | "shape" | "line" | "button";
  x_percent: number;
  y_percent: number;
  w_percent: number;
  h_percent: number;
  z_index: number;
  visible?: boolean;
  label?: string;
  text?: string;
  image_url?: string;
  color_hex?: string;
  line_width_px?: number;
  draggable_mode?: "none" | "free" | "check_target";
  drop_target_id?: string;
  actions?: Array<
    | {
        type: "info_popup";
        title?: string;
        body?: string;
        image_url?: string;
        video_url?: string;
      }
    | { type: "navigate_slide"; target: "next" | "prev" | "slide_id"; slide_id?: string }
    | { type: "show_element"; element_id: string }
    | { type: "hide_element"; element_id: string }
    | { type: "toggle_element"; element_id: string }
  >;
};

type PresentationSlideState = {
  id: string;
  title?: string;
  body_text?: string;
  background_image_url?: string;
  background_color?: string;
  video_url?: string;
  image_fit?: "cover" | "contain";
  elements: PresentationElementState[];
};

function newPresentationId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function PresentationInteractiveFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "presentation_interactive" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [bodyText, setBodyText] = useState(initial.body_text ?? "");
  const [passRule, setPassRule] = useState(initial.pass_rule ?? "drag_targets_complete");
  const [slides, setSlides] = useState<PresentationSlideState[]>(() =>
    initial.slides.map((s) => ({ ...s, elements: s.elements.map((e) => ({ ...e })) })),
  );
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    () => initial.slides[0]?.id ?? null,
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  useEffect(() => {
    const nextSlides = initial.slides.map((s) => ({ ...s, elements: s.elements.map((e) => ({ ...e })) }));
    setTitle(initial.title ?? "");
    setBodyText(initial.body_text ?? "");
    setPassRule(initial.pass_rule ?? "drag_targets_complete");
    setSlides(nextSlides);
    setSelectedSlideId(nextSlides[0]?.id ?? null);
    setSelectedElementId(null);
  }, [initial]);

  const selectedSlide = slides.find((s) => s.id === selectedSlideId) ?? slides[0] ?? null;
  const selectedElement = selectedSlide?.elements.find((e) => e.id === selectedElementId) ?? null;

  function emit(nextSlides: PresentationSlideState[], nextTitle = title, nextBodyText = bodyText, nextPassRule = passRule) {
    emitLive(onLivePayload, presentationInteractivePayloadSchema, {
      type: "interaction",
      subtype: "presentation_interactive",
      title: nextTitle || undefined,
      body_text: nextBodyText || undefined,
      pass_rule: nextPassRule,
      slides: nextSlides,
      guide: initial.guide,
    });
  }

  function patchSlide(slideId: string, patcher: (slide: PresentationSlideState) => PresentationSlideState) {
    const nextSlides = slides.map((s) => (s.id === slideId ? patcher(s) : s));
    setSlides(nextSlides);
    emit(nextSlides);
  }

  function patchSelectedElement(patcher: (el: PresentationElementState) => PresentationElementState) {
    if (!selectedSlide || !selectedElement) return;
    patchSlide(selectedSlide.id, (slide) => ({
      ...slide,
      elements: slide.elements.map((el) => (el.id === selectedElement.id ? patcher(el) : el)),
    }));
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Presentation title (optional)
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={title}
          onChange={(e) => {
            const v = e.target.value;
            setTitle(v);
            emit(slides, v);
          }}
        />
      </label>
      <label className={labelClass()}>
        Intro text (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={bodyText}
          onChange={(e) => {
            const v = e.target.value;
            setBodyText(v);
            emit(slides, title, v);
          }}
        />
      </label>
      <label className={labelClass()}>
        Pass rule
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={passRule}
          onChange={(e) => {
            const v = e.target.value as "drag_targets_complete" | "visit_all_slides";
            setPassRule(v);
            emit(slides, title, bodyText, v);
          }}
        >
          <option value="drag_targets_complete">Complete drag target checks</option>
          <option value="visit_all_slides">Visit all slides</option>
        </select>
      </label>

      <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              disabled={busy}
              className={`rounded border px-2 py-1 text-xs font-semibold ${
                slide.id === selectedSlide?.id ? "border-sky-500 bg-sky-100 text-sky-900" : "border-neutral-300 bg-white"
              }`}
              onClick={() => {
                setSelectedSlideId(slide.id);
                setSelectedElementId(null);
              }}
            >
              {slide.title?.trim() || `Slide ${idx + 1}`}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            className="rounded border border-dashed border-neutral-400 bg-white px-2 py-1 text-xs font-semibold"
            onClick={() => {
              const nextSlide: PresentationSlideState = {
                id: newPresentationId("slide"),
                title: `Slide ${slides.length + 1}`,
                image_fit: "cover",
                elements: [],
              };
              const nextSlides = [...slides, nextSlide];
              setSlides(nextSlides);
              setSelectedSlideId(nextSlide.id);
              setSelectedElementId(null);
              emit(nextSlides);
            }}
          >
            + Slide
          </button>
          <button
            type="button"
            disabled={busy || !selectedSlide || slides.length <= 1}
            className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-800"
            onClick={() => {
              if (!selectedSlide || slides.length <= 1) return;
              const nextSlides = slides.filter((s) => s.id !== selectedSlide.id);
              setSlides(nextSlides);
              setSelectedSlideId(nextSlides[0]?.id ?? null);
              setSelectedElementId(null);
              emit(nextSlides);
            }}
          >
            Delete slide
          </button>
        </div>
      </div>

      {selectedSlide ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3">
            <MediaUrlControls
              label="Slide background image"
              value={selectedSlide.background_image_url ?? ""}
              onChange={(v) =>
                patchSlide(selectedSlide.id, (slide) => ({
                  ...slide,
                  background_image_url: v || undefined,
                }))
              }
              disabled={busy}
              compact
            />
            <label className={labelClass()}>
              Slide title
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selectedSlide.title ?? ""}
                onChange={(e) =>
                  patchSlide(selectedSlide.id, (slide) => ({ ...slide, title: e.target.value || undefined }))
                }
              />
            </label>
            <label className={labelClass()}>
              Image fit
              <select
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selectedSlide.image_fit ?? "cover"}
                onChange={(e) =>
                  patchSlide(selectedSlide.id, (slide) => ({
                    ...slide,
                    image_fit: e.target.value as "cover" | "contain",
                  }))
                }
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>

            {selectedSlide.background_image_url ? (
              <RectRegionEditor
                imageUrl={selectedSlide.background_image_url}
                imageFit={selectedSlide.image_fit ?? "cover"}
                regions={selectedSlide.elements.map((el) => ({
                  id: el.id,
                  x_percent: el.x_percent,
                  y_percent: el.y_percent,
                  w_percent: el.w_percent,
                  h_percent: el.h_percent,
                  label: el.label ?? `${el.kind}:${el.id}`,
                }))}
                onRegionsChange={(nextRegions) => {
                  patchSlide(selectedSlide.id, (slide) => ({
                    ...slide,
                    elements: nextRegions.map((region) => {
                      const prev = slide.elements.find((el) => el.id === region.id);
                      return {
                        ...(prev ?? {
                          id: region.id,
                          kind: "button" as const,
                          z_index: slide.elements.length,
                        }),
                        x_percent: region.x_percent,
                        y_percent: region.y_percent,
                        w_percent: region.w_percent,
                        h_percent: region.h_percent,
                        label: region.label,
                      };
                    }),
                  }));
                }}
                selectedId={selectedElementId}
                onSelect={setSelectedElementId}
                disabled={busy}
              />
            ) : (
              <p className="text-sm text-amber-800">Add a slide background image to place elements.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {(["text", "image", "button", "shape", "line"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  disabled={busy}
                  className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold"
                  onClick={() => {
                    const base = defaultRegion(nextRegionId(
                      selectedSlide.elements.map((e) => ({
                        id: e.id,
                        x_percent: e.x_percent,
                        y_percent: e.y_percent,
                        w_percent: e.w_percent,
                        h_percent: e.h_percent,
                      })),
                      "el",
                    ));
                    const id = newPresentationId("el");
                    const nextElement: PresentationElementState = {
                      ...base,
                      id,
                      kind,
                      z_index: selectedSlide.elements.length,
                      visible: true,
                      label: kind === "button" ? "Button" : kind,
                      text: kind === "text" || kind === "button" ? "Text" : undefined,
                      color_hex: kind === "shape" || kind === "line" ? "#0ea5e9" : undefined,
                      draggable_mode: "none",
                    };
                    patchSlide(selectedSlide.id, (slide) => ({
                      ...slide,
                      elements: [...slide.elements, nextElement],
                    }));
                    setSelectedElementId(id);
                  }}
                >
                  + {kind}
                </button>
              ))}
              <button
                type="button"
                disabled={busy || !selectedElement}
                className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700"
                onClick={() => {
                  if (!selectedElement) return;
                  patchSlide(selectedSlide.id, (slide) => ({
                    ...slide,
                    elements: slide.elements.filter((el) => el.id !== selectedElement.id),
                  }));
                  setSelectedElementId(null);
                }}
              >
                Remove selected
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded border border-neutral-200 bg-neutral-50 p-3">
            {selectedElement ? (
              <>
                <p className="text-sm font-semibold">Element: {selectedElement.id}</p>
                <label className={labelClass()}>
                  Kind
                  <select
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={selectedElement.kind}
                    onChange={(e) =>
                      patchSelectedElement((el) => ({
                        ...el,
                        kind: e.target.value as PresentationElementState["kind"],
                      }))
                    }
                  >
                    <option value="text">text</option>
                    <option value="image">image</option>
                    <option value="button">button</option>
                    <option value="shape">shape</option>
                    <option value="line">line</option>
                  </select>
                </label>
                <label className={labelClass()}>
                  Label
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={selectedElement.label ?? ""}
                    onChange={(e) =>
                      patchSelectedElement((el) => ({ ...el, label: e.target.value || undefined }))
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedElement.visible ?? true}
                    onChange={(e) =>
                      patchSelectedElement((el) => ({ ...el, visible: e.target.checked }))
                    }
                  />
                  Visible
                </label>
                <label className={labelClass()}>
                  Text
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={selectedElement.text ?? ""}
                    onChange={(e) =>
                      patchSelectedElement((el) => ({ ...el, text: e.target.value || undefined }))
                    }
                  />
                </label>
                <MediaUrlControls
                  label="Element image URL"
                  value={selectedElement.image_url ?? ""}
                  onChange={(v) => patchSelectedElement((el) => ({ ...el, image_url: v || undefined }))}
                  disabled={busy}
                  compact
                />
                <label className={labelClass()}>
                  Color (hex)
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={selectedElement.color_hex ?? ""}
                    onChange={(e) =>
                      patchSelectedElement((el) => ({ ...el, color_hex: e.target.value || undefined }))
                    }
                  />
                </label>
                <label className={labelClass()}>
                  Drag mode
                  <select
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={selectedElement.draggable_mode ?? "none"}
                    onChange={(e) =>
                      patchSelectedElement((el) => ({
                        ...el,
                        draggable_mode: e.target.value as "none" | "free" | "check_target",
                      }))
                    }
                  >
                    <option value="none">none</option>
                    <option value="free">free drag</option>
                    <option value="check_target">drag check target</option>
                  </select>
                </label>
                {(selectedElement.draggable_mode ?? "none") === "check_target" ? (
                  <label className={labelClass()}>
                    Drop target element
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={selectedElement.drop_target_id ?? ""}
                      onChange={(e) =>
                        patchSelectedElement((el) => ({
                          ...el,
                          drop_target_id: e.target.value || undefined,
                        }))
                      }
                    >
                      <option value="">Choose target...</option>
                      {selectedSlide.elements
                        .filter((el) => el.id !== selectedElement.id)
                        .map((el) => (
                          <option key={el.id} value={el.id}>
                            {el.label || el.id}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}

                <div className="space-y-2 rounded border border-neutral-200 bg-white p-2">
                  <p className="text-xs font-semibold text-neutral-800">Actions on click</p>
                  {(selectedElement.actions ?? []).map((action, idx) => (
                    <div key={`action-${idx}`} className="space-y-1 rounded border border-neutral-200 p-2">
                      <div className="flex gap-2">
                        <select
                          className="min-w-0 flex-1 rounded border px-1 py-1 text-xs"
                          value={action.type}
                          onChange={(e) => {
                            const type = e.target.value as NonNullable<
                              PresentationElementState["actions"]
                            >[number]["type"];
                            patchSelectedElement((el) => {
                              const actions = [...(el.actions ?? [])];
                              actions[idx] =
                                type === "info_popup" ?
                                  { type: "info_popup" }
                                : type === "navigate_slide" ?
                                  { type: "navigate_slide", target: "next" }
                                : { type, element_id: el.id };
                              return { ...el, actions };
                            });
                          }}
                        >
                          <option value="info_popup">info_popup</option>
                          <option value="navigate_slide">navigate_slide</option>
                          <option value="show_element">show_element</option>
                          <option value="hide_element">hide_element</option>
                          <option value="toggle_element">toggle_element</option>
                        </select>
                        <button
                          type="button"
                          className="rounded border border-red-300 px-1 text-xs text-red-700"
                          onClick={() =>
                            patchSelectedElement((el) => ({
                              ...el,
                              actions: (el.actions ?? []).filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                      {action.type === "info_popup" ? (
                        <>
                          <input
                            className="w-full rounded border px-1 py-1 text-xs"
                            placeholder="Popup title"
                            value={action.title ?? ""}
                            onChange={(e) =>
                              patchSelectedElement((el) => {
                                const actions = [...(el.actions ?? [])];
                                const a = actions[idx];
                                if (!a || a.type !== "info_popup") return el;
                                actions[idx] = { ...a, title: e.target.value || undefined };
                                return { ...el, actions };
                              })
                            }
                          />
                          <textarea
                            className="w-full rounded border px-1 py-1 text-xs"
                            rows={2}
                            placeholder="Popup body"
                            value={action.body ?? ""}
                            onChange={(e) =>
                              patchSelectedElement((el) => {
                                const actions = [...(el.actions ?? [])];
                                const a = actions[idx];
                                if (!a || a.type !== "info_popup") return el;
                                actions[idx] = { ...a, body: e.target.value || undefined };
                                return { ...el, actions };
                              })
                            }
                          />
                        </>
                      ) : null}
                      {action.type === "navigate_slide" ? (
                        <select
                          className="w-full rounded border px-1 py-1 text-xs"
                          value={action.target}
                          onChange={(e) =>
                            patchSelectedElement((el) => {
                              const actions = [...(el.actions ?? [])];
                              const a = actions[idx];
                              if (!a || a.type !== "navigate_slide") return el;
                              actions[idx] = { ...a, target: e.target.value as "next" | "prev" | "slide_id" };
                              return { ...el, actions };
                            })
                          }
                        >
                          <option value="next">next</option>
                          <option value="prev">prev</option>
                          <option value="slide_id">specific slide</option>
                        </select>
                      ) : null}
                      {action.type === "navigate_slide" && action.target === "slide_id" ? (
                        <select
                          className="w-full rounded border px-1 py-1 text-xs"
                          value={action.slide_id ?? ""}
                          onChange={(e) =>
                            patchSelectedElement((el) => {
                              const actions = [...(el.actions ?? [])];
                              const a = actions[idx];
                              if (!a || a.type !== "navigate_slide") return el;
                              actions[idx] = { ...a, slide_id: e.target.value || undefined };
                              return { ...el, actions };
                            })
                          }
                        >
                          <option value="">Choose slide...</option>
                          {slides.map((slide) => (
                            <option key={slide.id} value={slide.id}>
                              {slide.title || slide.id}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {(action.type === "show_element" ||
                        action.type === "hide_element" ||
                        action.type === "toggle_element") ? (
                        <select
                          className="w-full rounded border px-1 py-1 text-xs"
                          value={action.element_id}
                          onChange={(e) =>
                            patchSelectedElement((el) => {
                              const actions = [...(el.actions ?? [])];
                              const a = actions[idx];
                              if (
                                !a ||
                                (a.type !== "show_element" && a.type !== "hide_element" && a.type !== "toggle_element")
                              ) {
                                return el;
                              }
                              actions[idx] = { ...a, element_id: e.target.value };
                              return { ...el, actions };
                            })
                          }
                        >
                          {selectedSlide.elements.map((el) => (
                            <option key={el.id} value={el.id}>
                              {el.label || el.id}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-900"
                    onClick={() =>
                      patchSelectedElement((el) => ({
                        ...el,
                        actions: [...(el.actions ?? []), { type: "info_popup" }],
                      }))
                    }
                  >
                    + Add action
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-600">Select an element on the canvas to edit it.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type HotspotInfoItemState = {
  id: string;
  x_percent: number;
  y_percent: number;
  w_percent: number;
  h_percent: number;
  title?: string;
  body?: string;
  label?: string;
};

function HotspotInfoFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "hotspot_info" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [image_url, setImg] = useState(initial.image_url);
  const [body_text, setBody] = useState(initial.body_text ?? "");
  const [require_all_viewed, setReq] = useState(initial.require_all_viewed ?? false);
  const [hotspots, setHotspots] = useState<HotspotInfoItemState[]>(() =>
    initial.hotspots.map((h) => ({ ...h })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setImg(initial.image_url);
    setBody(initial.body_text ?? "");
    setReq(initial.require_all_viewed ?? false);
    setHotspots(initial.hotspots.map((h) => ({ ...h })));
    setSelectedId(null);
  }, [initial.image_url, initial.body_text, initial.require_all_viewed, initial.hotspots]);

  function emit(
    img: string,
    intro: string,
    req: boolean,
    hs: HotspotInfoItemState[],
  ) {
    emitLive(onLivePayload, hotspotInfoPayloadSchema, {
      type: "interaction",
      subtype: "hotspot_info",
      image_url: img,
      body_text: intro || undefined,
      hotspots: hs,
      require_all_viewed: req,
      guide: initial.guide,
    });
  }

  function rectsFromHotspots(hs: HotspotInfoItemState[]): RectPercent[] {
    return hs.map((h) => ({
      id: h.id,
      x_percent: h.x_percent,
      y_percent: h.y_percent,
      w_percent: h.w_percent,
      h_percent: h.h_percent,
      label: h.label,
    }));
  }

  function mergeRectsIntoHotspots(
    hs: HotspotInfoItemState[],
    rects: RectPercent[],
  ): HotspotInfoItemState[] {
    return rects.map((r) => {
      const prev = hs.find((x) => x.id === r.id);
      return {
        id: r.id,
        x_percent: r.x_percent,
        y_percent: r.y_percent,
        w_percent: r.w_percent,
        h_percent: r.h_percent,
        label: r.label,
        title: prev?.title,
        body: prev?.body,
      };
    });
  }

  const selected = hotspots.find((h) => h.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <MediaUrlControls
        label="Hotspot scene image"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(v, body_text, require_all_viewed, hotspots);
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Intro (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(image_url, v, require_all_viewed, hotspots);
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={require_all_viewed}
          onChange={(e) => {
            const v = e.target.checked;
            setReq(v);
            emit(image_url, body_text, v, hotspots);
          }}
        />
        Require all hotspots before Next
      </label>
      {image_url ? (
        <RectRegionEditor
          imageUrl={image_url}
          regions={rectsFromHotspots(hotspots)}
          onRegionsChange={(rects) => {
            const next = mergeRectsIntoHotspots(hotspots, rects);
            setHotspots(next);
            emit(image_url, body_text, require_all_viewed, next);
          }}
          selectedId={selectedId}
          onSelect={setSelectedId}
          disabled={busy}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
          onClick={() => {
            const id = nextRegionId(rectsFromHotspots(hotspots), "h");
            const base = defaultRegion(id);
            const next: HotspotInfoItemState[] = [
              ...hotspots,
              { ...base, title: "Title", body: "Information for students." },
            ];
            setHotspots(next);
            setSelectedId(id);
            emit(image_url, body_text, require_all_viewed, next);
          }}
        >
          Add hotspot
        </button>
        <button
          type="button"
          disabled={busy || !selectedId}
          className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
          onClick={() => {
            if (!selectedId) return;
            const next = hotspots.filter((h) => h.id !== selectedId);
            setHotspots(next);
            setSelectedId(null);
            emit(image_url, body_text, require_all_viewed, next);
          }}
        >
          Remove selected
        </button>
      </div>
      {selected ? (
        <div className="space-y-2 rounded border border-neutral-200 p-3">
          <p className="text-sm font-semibold">Edit hotspot ({selected.id})</p>
          <label className={labelClass()}>
            Short label (on map)
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.label ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = hotspots.map((h) =>
                  h.id === selected.id ? { ...h, label: v || undefined } : h,
                );
                setHotspots(next);
                emit(image_url, body_text, require_all_viewed, next);
              }}
            />
          </label>
          <label className={labelClass()}>
            Popup title
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.title ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = hotspots.map((h) =>
                  h.id === selected.id ? { ...h, title: v || undefined } : h,
                );
                setHotspots(next);
                emit(image_url, body_text, require_all_viewed, next);
              }}
            />
          </label>
          <label className={labelClass()}>
            Popup body
            <textarea
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              rows={3}
              value={selected.body ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = hotspots.map((h) =>
                  h.id === selected.id ? { ...h, body: v || undefined } : h,
                );
                setHotspots(next);
                emit(image_url, body_text, require_all_viewed, next);
              }}
            />
          </label>
          {(["x_percent", "y_percent", "w_percent", "h_percent"] as const).map((key) => (
            <label key={key} className={labelClass()}>
              {key.replace("_percent", "")} %
              <input
                type="number"
                step={0.1}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selected[key]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  const next = hotspots.map((h) =>
                    h.id === selected.id ? { ...h, [key]: n } : h,
                  );
                  setHotspots(next);
                  emit(image_url, body_text, require_all_viewed, next);
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HotspotGateFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "hotspot_gate" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [image_url, setImg] = useState(initial.image_url);
  const [body_text, setBody] = useState(initial.body_text ?? "");
  const [mode, setMode] = useState(initial.mode);
  const [correct_target_id, setCorrect] = useState(initial.correct_target_id ?? "");
  const [orderIds, setOrderIds] = useState<string[]>(() => [...(initial.order ?? [])]);
  const [targets, setTargets] = useState<RectPercent[]>(() =>
    initial.targets.map((t) => ({ ...t })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setImg(initial.image_url);
    setBody(initial.body_text ?? "");
    setMode(initial.mode);
    setCorrect(initial.correct_target_id ?? "");
    setOrderIds(
      initial.mode === "sequence" &&
        (initial.order?.length ?? 0) === 0 &&
        initial.targets.length > 0
        ? initial.targets.map((t) => t.id)
        : [...(initial.order ?? [])],
    );
    setTargets(initial.targets.map((t) => ({ ...t })));
    setSelectedId(null);
  }, [
    initial.image_url,
    initial.body_text,
    initial.mode,
    initial.correct_target_id,
    initial.order,
    initial.targets,
  ]);

  function emit(
    img: string,
    intro: string,
    m: "single" | "sequence" | "all",
    cor: string,
    order: string[],
    tgs: RectPercent[],
  ) {
    emitLive(onLivePayload, hotspotGatePayloadSchema, {
      type: "interaction",
      subtype: "hotspot_gate",
      image_url: img,
      body_text: intro || undefined,
      mode: m,
      targets: tgs,
      correct_target_id: m === "single" ? cor || undefined : undefined,
      order: m === "sequence" ? order : undefined,
      guide: initial.guide,
    });
  }

  function pushEmit(nextT: RectPercent[], nextOrder = orderIds, nextCor = correct_target_id) {
    setTargets(nextT);
    emit(image_url, body_text, mode, nextCor, nextOrder, nextT);
  }

  const selected = targets.find((t) => t.id === selectedId) ?? null;

  function moveOrder(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= orderIds.length) return;
    const next = [...orderIds];
    [next[i], next[j]] = [next[j], next[i]];
    setOrderIds(next);
    emit(image_url, body_text, mode, correct_target_id, next, targets);
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Mode
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={mode}
          onChange={(e) => {
            const v = e.target.value as "single" | "sequence" | "all";
            setMode(v);
            let nextOrder = orderIds;
            if (v === "sequence" && orderIds.length === 0 && targets.length > 0) {
              nextOrder = targets.map((t) => t.id);
              setOrderIds(nextOrder);
            }
            emit(image_url, body_text, v, correct_target_id, nextOrder, targets);
          }}
        >
          <option value="single">Single correct tap</option>
          <option value="sequence">Sequence (order matters)</option>
          <option value="all">Tap all</option>
        </select>
      </label>
      <MediaUrlControls
        label="Hotspot scene image"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(v, body_text, mode, correct_target_id, orderIds, targets);
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Instructions (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(image_url, v, mode, correct_target_id, orderIds, targets);
          }}
        />
      </label>
      {image_url ? (
        <RectRegionEditor
          imageUrl={image_url}
          regions={targets}
          onRegionsChange={(next) => pushEmit(next)}
          selectedId={selectedId}
          onSelect={setSelectedId}
          disabled={busy}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
          onClick={() => {
            const id = nextRegionId(targets, "g");
            const next = [...targets, defaultRegion(id)];
            let nextOrder = orderIds;
            if (mode === "sequence") {
              nextOrder = [...orderIds, id];
              setOrderIds(nextOrder);
            }
            setSelectedId(id);
            emit(image_url, body_text, mode, correct_target_id, nextOrder, next);
            setTargets(next);
          }}
        >
          Add target
        </button>
        <button
          type="button"
          disabled={busy || !selectedId}
          className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
          onClick={() => {
            if (!selectedId) return;
            const next = targets.filter((t) => t.id !== selectedId);
            const nextOrder = orderIds.filter((id) => id !== selectedId);
            const nextCor = correct_target_id === selectedId ? next[0]?.id ?? "" : correct_target_id;
            setOrderIds(nextOrder);
            setCorrect(nextCor);
            setSelectedId(null);
            emit(image_url, body_text, mode, nextCor, nextOrder, next);
            setTargets(next);
          }}
        >
          Remove selected
        </button>
      </div>
      {mode === "single" ? (
        <label className={labelClass()}>
          Correct target
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={correct_target_id}
            onChange={(e) => {
              const v = e.target.value;
              setCorrect(v);
              emit(image_url, body_text, mode, v, orderIds, targets);
            }}
          >
            <option value="">—</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.id}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {mode === "sequence" ? (
        <div className="space-y-1">
          <span className={labelClass()}>Tap order (top first)</span>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {orderIds.map((oid, i) => (
              <li key={`${oid}-${i}`} className="flex flex-wrap items-center gap-2">
                <span>{oid}</span>
                <button
                  type="button"
                  className="rounded border px-1 text-xs"
                  onClick={() => moveOrder(i, -1)}
                  disabled={i === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border px-1 text-xs"
                  onClick={() => moveOrder(i, 1)}
                  disabled={i === orderIds.length - 1}
                >
                  Down
                </button>
              </li>
            ))}
          </ol>
          <p className="text-xs text-neutral-500">
            Add targets above, then arrange order. Order list includes only ids you add to the sequence
            (new targets in sequence mode are appended).
          </p>
        </div>
      ) : null}
      {selected ? (
        <div className="grid gap-2 rounded border border-neutral-200 p-3 sm:grid-cols-2">
          <p className="col-span-full text-sm font-semibold">Selected: {selected.id}</p>
          <label className={labelClass()}>
            Label (optional)
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.label ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = targets.map((t) =>
                  t.id === selected.id ? { ...t, label: v || undefined } : t,
                );
                pushEmit(next);
              }}
            />
          </label>
          {(["x_percent", "y_percent", "w_percent", "h_percent"] as const).map((key) => (
            <label key={key} className={labelClass()}>
              {key.replace("_percent", "")} %
              <input
                type="number"
                step={0.1}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selected[key]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  const next = targets.map((t) =>
                    t.id === selected.id ? { ...t, [key]: n } : t,
                  );
                  pushEmit(next);
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type DragZoneRow = { id: string; label: string };
type DragTokenRow = { id: string; label: string };

function nextDragRowId<T extends { id: string }>(rows: T[], prefix: string) {
  const ids = new Set(rows.map((r) => r.id));
  let n = rows.length + 1;
  let id = `${prefix}${n}`;
  while (ids.has(id)) {
    n += 1;
    id = `${prefix}${n}`;
  }
  return id;
}

function DragMatchFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "drag_match" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [body_text, setBody] = useState(initial.body_text ?? "");
  const [image_url, setImg] = useState(initial.image_url ?? "");
  const [zones, setZones] = useState<DragZoneRow[]>(() =>
    initial.zones.map((z) => ({ id: z.id, label: z.label ?? "" })),
  );
  const [tokens, setTokens] = useState<DragTokenRow[]>(() =>
    initial.tokens.map((t) => ({ id: t.id, label: t.label })),
  );
  const [tokenZone, setTokenZone] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const t of initial.tokens) {
      m[t.id] = initial.correct_map[t.id] ?? initial.zones[0]?.id ?? "";
    }
    return m;
  });

  useEffect(() => {
    setBody(initial.body_text ?? "");
    setImg(initial.image_url ?? "");
    setZones(initial.zones.map((z) => ({ id: z.id, label: z.label ?? "" })));
    setTokens(initial.tokens.map((t) => ({ id: t.id, label: t.label })));
    const m: Record<string, string> = {};
    for (const t of initial.tokens) {
      m[t.id] = initial.correct_map[t.id] ?? initial.zones[0]?.id ?? "";
    }
    setTokenZone(m);
  }, [
    initial.body_text,
    initial.image_url,
    initial.zones,
    initial.tokens,
    initial.correct_map,
  ]);

  const zoneIds = new Set(zones.map((z) => z.id));

  function emit(
    intro: string,
    img: string,
    zs: DragZoneRow[],
    toks: DragTokenRow[],
    tz: Record<string, string>,
  ) {
    const correct_map: Record<string, string> = {};
    for (const t of toks) {
      const zid = tz[t.id] ?? zs[0]?.id ?? "";
      correct_map[t.id] = zid;
    }
    emitLive(onLivePayload, dragMatchPayloadSchema, {
      type: "interaction",
      subtype: "drag_match",
      body_text: intro || undefined,
      image_url: img || undefined,
      zones: zs.map((z) => ({
        id: z.id,
        label: z.label.trim() || undefined,
      })),
      tokens: toks.map((t) => ({ id: t.id, label: t.label.trim() || t.id })),
      correct_map,
      guide: initial.guide,
    });
  }

  const mapValid =
    zones.length >= 1 &&
    tokens.length >= 1 &&
    tokens.every((t) => zoneIds.has(tokenZone[t.id] ?? ""));

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Intro (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(v, image_url, zones, tokens, tokenZone);
          }}
        />
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(body_text, v, zones, tokens, tokenZone);
        }}
        disabled={busy}
        compact
      />
      <div className="rounded border border-neutral-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Zones (drop targets)</span>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-neutral-400 bg-white px-2 py-1 text-xs font-semibold"
            onClick={() => {
              const id = nextDragRowId(zones, "z");
              const nextZ = [...zones, { id, label: "" }];
              setZones(nextZ);
              emit(body_text, image_url, nextZ, tokens, tokenZone);
            }}
          >
            Add zone
          </button>
        </div>
        <ul className="space-y-2">
          {zones.map((z) => (
            <li
              key={z.id}
              className="grid gap-2 rounded border border-neutral-100 bg-neutral-50/80 p-2 sm:grid-cols-[1fr_2fr_auto]"
            >
              <label className={labelClass()}>
                Zone id
                <input
                  className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
                  value={z.id}
                  onChange={(e) => {
                    const newId = e.target.value.trim();
                    if (!newId) return;
                    const nextZ = zones.map((row) =>
                      row.id === z.id ? { ...row, id: newId } : row,
                    );
                    const nextTz = { ...tokenZone };
                    for (const k of Object.keys(nextTz)) {
                      if (nextTz[k] === z.id) nextTz[k] = newId;
                    }
                    setTokenZone(nextTz);
                    setZones(nextZ);
                    emit(body_text, image_url, nextZ, tokens, nextTz);
                  }}
                />
              </label>
              <label className={labelClass()}>
                Label (optional)
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={z.label}
                  onChange={(e) => {
                    const v = e.target.value;
                    const nextZ = zones.map((row) =>
                      row.id === z.id ? { ...row, label: v } : row,
                    );
                    setZones(nextZ);
                    emit(body_text, image_url, nextZ, tokens, tokenZone);
                  }}
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={busy || zones.length <= 1}
                  className="w-full rounded border border-red-200 px-2 py-1 text-xs text-red-800"
                  onClick={() => {
                    const fallback = zones.find((row) => row.id !== z.id)?.id ?? "";
                    const nextZ = zones.filter((row) => row.id !== z.id);
                    const nextTz = { ...tokenZone };
                    for (const t of tokens) {
                      if (nextTz[t.id] === z.id) nextTz[t.id] = fallback;
                    }
                    setTokenZone(nextTz);
                    setZones(nextZ);
                    emit(body_text, image_url, nextZ, tokens, nextTz);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded border border-neutral-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Tokens (draggable items)</span>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-neutral-400 bg-white px-2 py-1 text-xs font-semibold"
            onClick={() => {
              const id = nextDragRowId(tokens, "tok");
              const defaultZ = zones[0]?.id ?? "";
              const nextT = [...tokens, { id, label: "" }];
              const nextTz = { ...tokenZone, [id]: defaultZ };
              setTokens(nextT);
              setTokenZone(nextTz);
              emit(body_text, image_url, zones, nextT, nextTz);
            }}
          >
            Add token
          </button>
        </div>
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="grid gap-2 rounded border border-neutral-100 bg-neutral-50/80 p-2 lg:grid-cols-[1fr_2fr_2fr_auto]"
            >
              <label className={labelClass()}>
                Token id
                <input
                  className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
                  value={t.id}
                  onChange={(e) => {
                    const newId = e.target.value.trim();
                    if (!newId) return;
                    const nextT = tokens.map((row) =>
                      row.id === t.id ? { ...row, id: newId } : row,
                    );
                    const nextTz = { ...tokenZone };
                    const prevZ = nextTz[t.id];
                    delete nextTz[t.id];
                    nextTz[newId] = prevZ ?? zones[0]?.id ?? "";
                    setTokenZone(nextTz);
                    setTokens(nextT);
                    emit(body_text, image_url, zones, nextT, nextTz);
                  }}
                />
              </label>
              <label className={labelClass()}>
                Label (shown to students)
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={t.label}
                  onChange={(e) => {
                    const v = e.target.value;
                    const nextT = tokens.map((row) =>
                      row.id === t.id ? { ...row, label: v } : row,
                    );
                    setTokens(nextT);
                    emit(body_text, image_url, zones, nextT, tokenZone);
                  }}
                />
              </label>
              <label className={labelClass()}>
                Matches zone
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={tokenZone[t.id] ?? ""}
                  onChange={(e) => {
                    const zid = e.target.value;
                    const nextTz = { ...tokenZone, [t.id]: zid };
                    setTokenZone(nextTz);
                    emit(body_text, image_url, zones, tokens, nextTz);
                  }}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label ? `${z.label} (${z.id})` : z.id}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={busy || tokens.length <= 1}
                  className="w-full rounded border border-red-200 px-2 py-1 text-xs text-red-800"
                  onClick={() => {
                    const nextT = tokens.filter((row) => row.id !== t.id);
                    const nextTz = { ...tokenZone };
                    delete nextTz[t.id];
                    setTokens(nextT);
                    setTokenZone(nextTz);
                    emit(body_text, image_url, zones, nextT, nextTz);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {!mapValid ? (
        <p className="text-xs text-amber-800">
          Each token needs a valid zone. Add at least one zone and one token, and pick a zone for
          every token.
        </p>
      ) : null}
    </div>
  );
}

type SoundSortChoiceRow = { id: string; image_url: string; label: string };

function SoundSortFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "sound_sort" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [body_text, setBody] = useState(initial.body_text ?? "");
  const [prompt_audio_url, setAudio] = useState(initial.prompt_audio_url);
  const [choices, setChoices] = useState<SoundSortChoiceRow[]>(() =>
    initial.choices.map((c) => ({
      id: c.id,
      image_url: c.image_url,
      label: c.label ?? "",
    })),
  );
  const [correct_choice_id, setCorrect] = useState(initial.correct_choice_id);

  useEffect(() => {
    setBody(initial.body_text ?? "");
    setAudio(initial.prompt_audio_url);
    setChoices(
      initial.choices.map((c) => ({
        id: c.id,
        image_url: c.image_url,
        label: c.label ?? "",
      })),
    );
    setCorrect(initial.correct_choice_id);
  }, [initial.body_text, initial.prompt_audio_url, initial.choices, initial.correct_choice_id]);

  function emit(intro: string, audio: string, ch: SoundSortChoiceRow[], cor: string) {
    const ids = new Set(ch.map((c) => c.id));
    let correct = cor;
    if (!ids.has(correct) && ch[0]) correct = ch[0].id;
    emitLive(onLivePayload, soundSortPayloadSchema, {
      type: "interaction",
      subtype: "sound_sort",
      body_text: intro || undefined,
      prompt_audio_url: audio,
      choices: ch.map((c) => ({
        id: c.id,
        image_url: c.image_url,
        label: c.label.trim() || undefined,
      })),
      correct_choice_id: correct,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Instructions (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(v, prompt_audio_url, choices, correct_choice_id);
          }}
        />
      </label>
      <label className={labelClass()}>
        Prompt audio URL
        <input
          type="url"
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={prompt_audio_url}
          onChange={(e) => {
            const v = e.target.value;
            setAudio(v);
            emit(body_text, v, choices, correct_choice_id);
          }}
        />
      </label>
      <div className="rounded border border-neutral-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Picture choices</span>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-neutral-400 bg-white px-2 py-1 text-xs font-semibold"
            onClick={() => {
              const id = nextDragRowId(choices, "c");
              const next = [...choices, { id, image_url: "", label: "" }];
              setChoices(next);
              const cor = correct_choice_id || id;
              setCorrect(cor);
              emit(body_text, prompt_audio_url, next, cor);
            }}
          >
            Add choice
          </button>
        </div>
        <ul className="space-y-3">
          {choices.map((c) => (
            <li
              key={c.id}
              className="rounded border border-neutral-100 bg-neutral-50/80 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sound-sort-correct"
                    checked={correct_choice_id === c.id}
                    onChange={() => {
                      setCorrect(c.id);
                      emit(body_text, prompt_audio_url, choices, c.id);
                    }}
                  />
                  Correct answer
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass()}>
                  Choice id
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
                    value={c.id}
                    onChange={(e) => {
                      const newId = e.target.value.trim();
                      if (!newId) return;
                      const next = choices.map((row) =>
                        row.id === c.id ? { ...row, id: newId } : row,
                      );
                      setChoices(next);
                      const nextCor =
                        correct_choice_id === c.id ? newId : correct_choice_id;
                      setCorrect(nextCor);
                      emit(body_text, prompt_audio_url, next, nextCor);
                    }}
                  />
                </label>
                <label className={labelClass()}>
                  Label (optional)
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={c.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = choices.map((row) =>
                        row.id === c.id ? { ...row, label: v } : row,
                      );
                      setChoices(next);
                      emit(body_text, prompt_audio_url, next, correct_choice_id);
                    }}
                  />
                </label>
              </div>
              <div className="mt-2">
                <MediaUrlControls
                  label="Choice image"
                  value={c.image_url}
                  onChange={(v) => {
                    const next = choices.map((row) =>
                      row.id === c.id ? { ...row, image_url: v } : row,
                    );
                    setChoices(next);
                    emit(body_text, prompt_audio_url, next, correct_choice_id);
                  }}
                  disabled={busy}
                  compact
                />
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  disabled={busy || choices.length <= 2}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-800"
                  onClick={() => {
                    const next = choices.filter((row) => row.id !== c.id);
                    setChoices(next);
                    let nextCor = correct_choice_id;
                    if (correct_choice_id === c.id) nextCor = next[0]?.id ?? "";
                    setCorrect(nextCor);
                    emit(body_text, prompt_audio_url, next, nextCor);
                  }}
                >
                  Remove choice
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {choices.length < 2 ? (
        <p className="text-xs text-amber-800">Add at least two picture choices (required for this activity).</p>
      ) : null}
      <p className="text-xs text-neutral-600">
        Students tap “Hear sound” then choose a picture. Use short audio files (MP3/OGG URLs).
      </p>
    </div>
  );
}

function ListenHotspotSequenceFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "listen_hotspot_sequence" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [image_url, setImg] = useState(initial.image_url);
  const [body_text, setBody] = useState(initial.body_text ?? "");
  const [prompt_audio_url, setPromptAudio] = useState(initial.prompt_audio_url);
  const [allow_replay, setAllowReplay] = useState(initial.allow_replay ?? true);
  const [orderIds, setOrderIds] = useState<string[]>(() => [...initial.order]);
  const [targets, setTargets] = useState<RectPercent[]>(() => initial.targets.map((t) => ({ ...t })));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setImg(initial.image_url);
    setBody(initial.body_text ?? "");
    setPromptAudio(initial.prompt_audio_url);
    setAllowReplay(initial.allow_replay ?? true);
    setOrderIds([...initial.order]);
    setTargets(initial.targets.map((t) => ({ ...t })));
    setSelectedId(null);
  }, [initial]);

  function emit(
    img: string,
    intro: string,
    audio: string,
    replay: boolean,
    order: string[],
    tgs: RectPercent[],
  ) {
    emitLive(onLivePayload, listenHotspotSequencePayloadSchema, {
      type: "interaction",
      subtype: "listen_hotspot_sequence",
      image_url: img,
      body_text: intro || undefined,
      prompt_audio_url: audio,
      allow_replay: replay,
      targets: tgs,
      order,
      guide: initial.guide,
    });
  }

  function moveOrder(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= orderIds.length) return;
    const next = [...orderIds];
    [next[i], next[j]] = [next[j], next[i]];
    setOrderIds(next);
    emit(image_url, body_text, prompt_audio_url, allow_replay, next, targets);
  }

  const selected = targets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <MediaUrlControls
        label="Hotspot scene image"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(v, body_text, prompt_audio_url, allow_replay, orderIds, targets);
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Prompt audio URL
        <input
          type="url"
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={prompt_audio_url}
          onChange={(e) => {
            const v = e.target.value;
            setPromptAudio(v);
            emit(image_url, body_text, v, allow_replay, orderIds, targets);
          }}
        />
      </label>
      <label className={labelClass()}>
        Instructions (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(image_url, v, prompt_audio_url, allow_replay, orderIds, targets);
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allow_replay}
          onChange={(e) => {
            const v = e.target.checked;
            setAllowReplay(v);
            emit(image_url, body_text, prompt_audio_url, v, orderIds, targets);
          }}
        />
        Allow replaying prompt audio
      </label>
      {image_url ? (
        <RectRegionEditor
          imageUrl={image_url}
          regions={targets}
          onRegionsChange={(next) => {
            setTargets(next);
            emit(image_url, body_text, prompt_audio_url, allow_replay, orderIds, next);
          }}
          selectedId={selectedId}
          onSelect={setSelectedId}
          disabled={busy}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
          onClick={() => {
            const id = nextRegionId(targets, "ls");
            const next = [...targets, defaultRegion(id)];
            setTargets(next);
            setOrderIds((prev) => [...prev, id]);
            setSelectedId(id);
            emit(image_url, body_text, prompt_audio_url, allow_replay, [...orderIds, id], next);
          }}
        >
          Add target
        </button>
      </div>
      <div className="space-y-1">
        <span className={labelClass()}>Tap order (top first)</span>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {orderIds.map((oid, i) => (
            <li key={`${oid}-${i}`} className="flex items-center gap-2">
              <span>{oid}</span>
              <button type="button" className="rounded border px-1 text-xs" onClick={() => moveOrder(i, -1)} disabled={i === 0}>
                Up
              </button>
              <button
                type="button"
                className="rounded border px-1 text-xs"
                onClick={() => moveOrder(i, 1)}
                disabled={i === orderIds.length - 1}
              >
                Down
              </button>
            </li>
          ))}
        </ol>
      </div>
      {selected ? (
        <div className="grid gap-2 rounded border border-neutral-200 p-3 sm:grid-cols-2">
          <p className="col-span-full text-sm font-semibold">Selected: {selected.id}</p>
          <label className={labelClass()}>
            Label (optional)
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.label ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = targets.map((t) => (t.id === selected.id ? { ...t, label: v || undefined } : t));
                setTargets(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, orderIds, next);
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

type ListenColorWriteTarget = RectPercent & {
  expected_mode: "color" | "text";
  expected_value: string;
};

function ListenColorWriteFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "listen_color_write" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [image_url, setImg] = useState(initial.image_url);
  const [body_text, setBody] = useState(initial.body_text ?? "");
  const [prompt_audio_url, setPromptAudio] = useState(initial.prompt_audio_url ?? "");
  const [allow_replay, setAllowReplay] = useState(initial.allow_replay ?? true);
  const [allow_overwrite, setAllowOverwrite] = useState(initial.allow_overwrite ?? true);
  const [require_all_targets, setRequireAllTargets] = useState(initial.require_all_targets ?? true);
  const [shuffle_text_options, setShuffleTextOptions] = useState(initial.shuffle_text_options ?? false);
  const [palette, setPalette] = useState(() => initial.palette.map((p) => ({ ...p })));
  const [text_options, setTextOptions] = useState(() => initial.text_options.map((t) => ({ ...t })));
  const [targets, setTargets] = useState<ListenColorWriteTarget[]>(
    () => initial.targets.map((t) => ({ ...t })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setImg(initial.image_url);
    setBody(initial.body_text ?? "");
    setPromptAudio(initial.prompt_audio_url ?? "");
    setAllowReplay(initial.allow_replay ?? true);
    setAllowOverwrite(initial.allow_overwrite ?? true);
    setRequireAllTargets(initial.require_all_targets ?? true);
    setShuffleTextOptions(initial.shuffle_text_options ?? false);
    setPalette(initial.palette.map((p) => ({ ...p })));
    setTextOptions(initial.text_options.map((t) => ({ ...t })));
    setTargets(initial.targets.map((t) => ({ ...t })));
    setSelectedId(null);
  }, [initial]);

  function emit(
    img: string,
    intro: string,
    audio: string,
    replay: boolean,
    overwrite: boolean,
    requireAll: boolean,
    shuffleText: boolean,
    nextPalette: { id: string; label: string; color_hex: string }[],
    nextTextOptions: { id: string; label: string }[],
    nextTargets: ListenColorWriteTarget[],
  ) {
    emitLive(onLivePayload, listenColorWritePayloadSchema, {
      type: "interaction",
      subtype: "listen_color_write",
      image_url: img,
      body_text: intro || undefined,
      prompt_audio_url: audio || undefined,
      allow_replay: replay,
      allow_overwrite: overwrite,
      require_all_targets: requireAll,
      shuffle_text_options: shuffleText,
      palette: nextPalette,
      text_options: nextTextOptions,
      targets: nextTargets,
      guide: initial.guide,
    });
  }

  const selected = targets.find((t) => t.id === selectedId) ?? null;
  const colorIds = new Set(palette.map((p) => p.id));
  const textIds = new Set(text_options.map((t) => t.id));

  return (
    <div className="space-y-3">
      <MediaUrlControls
        label="Activity image"
        value={image_url}
        onChange={(v) => {
          setImg(v);
          emit(v, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, targets);
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Prompt audio URL (optional)
        <input
          type="url"
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={prompt_audio_url}
          onChange={(e) => {
            const v = e.target.value;
            setPromptAudio(v);
            emit(image_url, body_text, v, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, targets);
          }}
        />
      </label>
      <label className={labelClass()}>
        Instructions (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={body_text}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            emit(image_url, v, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, targets);
          }}
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allow_replay}
            onChange={(e) => {
              const v = e.target.checked;
              setAllowReplay(v);
              emit(image_url, body_text, prompt_audio_url, v, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, targets);
            }}
          />
          Allow replay audio
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allow_overwrite}
            onChange={(e) => {
              const v = e.target.checked;
              setAllowOverwrite(v);
              emit(image_url, body_text, prompt_audio_url, allow_replay, v, require_all_targets, shuffle_text_options, palette, text_options, targets);
            }}
          />
          Allow replacing answers
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={require_all_targets}
            onChange={(e) => {
              const v = e.target.checked;
              setRequireAllTargets(v);
              emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, v, shuffle_text_options, palette, text_options, targets);
            }}
          />
          Require all targets
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shuffle_text_options}
            onChange={(e) => {
              const v = e.target.checked;
              setShuffleTextOptions(v);
              emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, v, palette, text_options, targets);
            }}
          />
          Shuffle text options
        </label>
      </div>

      <div className="space-y-2 rounded border border-neutral-200 p-3">
        <p className="text-sm font-semibold">Color palette</p>
        {palette.map((p) => (
          <div key={p.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={p.id}
              onChange={(e) => {
                const v = e.target.value.trim();
                const next = palette.map((row) => (row.id === p.id ? { ...row, id: v || row.id } : row));
                setPalette(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, next, text_options, targets);
              }}
              placeholder="id"
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              value={p.label}
              onChange={(e) => {
                const v = e.target.value;
                const next = palette.map((row) => (row.id === p.id ? { ...row, label: v } : row));
                setPalette(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, next, text_options, targets);
              }}
              placeholder="label"
            />
            <input
              className="h-9 w-full rounded border px-1"
              type="color"
              value={p.color_hex}
              onChange={(e) => {
                const v = e.target.value;
                const next = palette.map((row) => (row.id === p.id ? { ...row, color_hex: v } : row));
                setPalette(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, next, text_options, targets);
              }}
            />
            <button
              type="button"
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-800"
              disabled={busy || palette.length <= 1}
              onClick={() => {
                const next = palette.filter((row) => row.id !== p.id);
                setPalette(next);
                const nextTargets = targets.map((t) =>
                  t.expected_mode === "color" && t.expected_value === p.id
                    ? { ...t, expected_value: next[0]?.id ?? "" }
                    : t,
                );
                setTargets(nextTargets);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, next, text_options, nextTargets);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
          onClick={() => {
            const id = `color_${palette.length + 1}`;
            const next = [...palette, { id, label: `Color ${palette.length + 1}`, color_hex: "#f59e0b" }];
            setPalette(next);
            emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, next, text_options, targets);
          }}
        >
          Add color
        </button>
      </div>

      <div className="space-y-2 rounded border border-neutral-200 p-3">
        <p className="text-sm font-semibold">Text options</p>
        {text_options.map((t) => (
          <div key={t.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={t.id}
              onChange={(e) => {
                const v = e.target.value.trim();
                const next = text_options.map((row) => (row.id === t.id ? { ...row, id: v || row.id } : row));
                setTextOptions(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, next, targets);
              }}
              placeholder="id"
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              value={t.label}
              onChange={(e) => {
                const v = e.target.value;
                const next = text_options.map((row) => (row.id === t.id ? { ...row, label: v } : row));
                setTextOptions(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, next, targets);
              }}
              placeholder="label"
            />
            <button
              type="button"
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-800"
              disabled={busy || text_options.length <= 1}
              onClick={() => {
                const next = text_options.filter((row) => row.id !== t.id);
                setTextOptions(next);
                const nextTargets = targets.map((target) =>
                  target.expected_mode === "text" && target.expected_value === t.id
                    ? { ...target, expected_value: next[0]?.id ?? "" }
                    : target,
                );
                setTargets(nextTargets);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, next, nextTargets);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
          onClick={() => {
            const id = `text_${text_options.length + 1}`;
            const next = [...text_options, { id, label: `Word ${text_options.length + 1}` }];
            setTextOptions(next);
            emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, next, targets);
          }}
        >
          Add text option
        </button>
      </div>

      {image_url ? (
        <RectRegionEditor
          imageUrl={image_url}
          regions={targets}
          onRegionsChange={(next) => {
            const normalized = next.map((region) => {
              const prev = targets.find((t) => t.id === region.id);
              if (prev) return { ...region, expected_mode: prev.expected_mode, expected_value: prev.expected_value };
              return { ...region, expected_mode: "color" as const, expected_value: palette[0]?.id ?? "" };
            });
            setTargets(normalized);
            emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, normalized);
          }}
          selectedId={selectedId}
          onSelect={setSelectedId}
          disabled={busy}
        />
      ) : null}

      <button
        type="button"
        disabled={busy}
        className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
        onClick={() => {
          const id = nextRegionId(targets, "lcw");
          const next = [...targets, { ...defaultRegion(id), expected_mode: "color" as const, expected_value: palette[0]?.id ?? "" }];
          setTargets(next);
          setSelectedId(id);
          emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, next);
        }}
      >
        Add target
      </button>

      {selected ? (
        <div className="grid gap-2 rounded border border-neutral-200 p-3 sm:grid-cols-2">
          <p className="col-span-full text-sm font-semibold">Selected: {selected.id}</p>
          <label className={labelClass()}>
            Label (optional)
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.label ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = targets.map((t) => (t.id === selected.id ? { ...t, label: v || undefined } : t));
                setTargets(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, next);
              }}
            />
          </label>
          <label className={labelClass()}>
            Expected mode
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.expected_mode}
              onChange={(e) => {
                const mode = e.target.value as "color" | "text";
                const defaultValue = mode === "color" ? (palette[0]?.id ?? "") : (text_options[0]?.id ?? "");
                const next = targets.map((t) =>
                  t.id === selected.id ? { ...t, expected_mode: mode, expected_value: defaultValue } : t,
                );
                setTargets(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, next);
              }}
            >
              <option value="color">Color</option>
              <option value="text">Text</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass()}>Expected value</span>
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selected.expected_value}
              onChange={(e) => {
                const v = e.target.value;
                const next = targets.map((t) => (t.id === selected.id ? { ...t, expected_value: v } : t));
                setTargets(next);
                emit(image_url, body_text, prompt_audio_url, allow_replay, allow_overwrite, require_all_targets, shuffle_text_options, palette, text_options, next);
              }}
            >
              {selected.expected_mode === "color"
                ? palette.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.id})
                    </option>
                  ))
                : text_options.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.id})
                    </option>
                  ))}
            </select>
          </label>
        </div>
      ) : null}
      {(targets.some((t) => t.expected_mode === "color" && !colorIds.has(t.expected_value)) ||
        targets.some((t) => t.expected_mode === "text" && !textIds.has(t.expected_value))) ? (
        <p className="text-xs text-amber-800">
          Some targets reference removed options. Select each target and set a valid expected value.
        </p>
      ) : null}
    </div>
  );
}

function LetterMixupFields({
  initial,
  onLivePayload,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "letter_mixup" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [prompt, setPrompt] = useState(initial.prompt);
  const [image_url, setImageUrl] = useState(initial.image_url ?? "");
  const [shuffle_letters, setShuffleLetters] = useState(initial.shuffle_letters ?? true);
  const [case_sensitive, setCaseSensitive] = useState(initial.case_sensitive ?? false);
  const [items, setItems] = useState(() => initial.items.map((it) => ({ ...it })));

  function emit(next: typeof items, nextPrompt = prompt, nextImage = image_url) {
    emitLive(onLivePayload, letterMixupPayloadSchema, {
      type: "interaction",
      subtype: "letter_mixup",
      prompt: nextPrompt,
      image_url: nextImage || undefined,
      shuffle_letters,
      case_sensitive,
      items: next,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Prompt
        <textarea className="mt-1 w-full rounded border px-2 py-1 text-sm" rows={2} value={prompt} onChange={(e) => { const v = e.target.value; setPrompt(v); emit(items, v, image_url); }} />
      </label>
      <MediaUrlControls label="Image (optional)" value={image_url} onChange={(v) => { setImageUrl(v); emit(items, prompt, v); }} compact />
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={shuffle_letters} onChange={(e) => { const v = e.target.checked; setShuffleLetters(v); emit(items); }} />
          Shuffle letters
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={case_sensitive} onChange={(e) => { const v = e.target.checked; setCaseSensitive(v); emit(items); }} />
          Case sensitive
        </label>
      </div>
      {items.map((it) => (
        <div key={it.id} className="rounded border border-neutral-200 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded border px-2 py-1 text-sm" value={it.id} placeholder="id" onChange={(e) => { const v = e.target.value.trim(); const next = items.map((row) => row.id === it.id ? { ...row, id: v || row.id } : row); setItems(next); emit(next); }} />
            <input className="rounded border px-2 py-1 text-sm" value={it.target_word} placeholder="target word" onChange={(e) => { const v = e.target.value; const next = items.map((row) => row.id === it.id ? { ...row, target_word: v } : row); setItems(next); emit(next); }} />
          </div>
          <input className="mt-2 w-full rounded border px-2 py-1 text-sm" value={(it.accepted_words ?? []).join(", ")} placeholder="accepted words (comma separated)" onChange={(e) => { const vals = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); const next = items.map((row) => row.id === it.id ? { ...row, accepted_words: vals.length ? vals : undefined } : row); setItems(next); emit(next); }} />
          <button type="button" className="mt-2 rounded border border-red-200 px-2 py-1 text-xs text-red-800" disabled={items.length <= 1} onClick={() => { const next = items.filter((row) => row.id !== it.id); setItems(next); emit(next); }}>
            Remove item
          </button>
        </div>
      ))}
      <button type="button" className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50" onClick={() => { const next = [...items, { id: `item_${items.length + 1}`, target_word: "word" }]; setItems(next); emit(next); }}>
        Add item
      </button>
    </div>
  );
}

function WordShapeHuntFields({
  initial,
  onLivePayload,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "word_shape_hunt" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [prompt, setPrompt] = useState(initial.prompt);
  const [image_url, setImageUrl] = useState(initial.image_url ?? "");
  const [prompt_audio_url, setPromptAudio] = useState(initial.prompt_audio_url ?? "");
  const [shape_layout, setShapeLayout] = useState(initial.shape_layout);
  const [shuffle_chunks, setShuffleChunks] = useState(initial.shuffle_chunks ?? false);
  const [word_chunks, setWordChunks] = useState(() => initial.word_chunks.map((w) => ({ ...w })));

  function emit(next: typeof word_chunks, nextPrompt = prompt) {
    emitLive(onLivePayload, wordShapeHuntPayloadSchema, {
      type: "interaction",
      subtype: "word_shape_hunt",
      prompt: nextPrompt,
      image_url: image_url || undefined,
      prompt_audio_url: prompt_audio_url || undefined,
      shape_layout,
      shuffle_chunks,
      word_chunks: next,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Prompt
        <textarea className="mt-1 w-full rounded border px-2 py-1 text-sm" rows={2} value={prompt} onChange={(e) => { const v = e.target.value; setPrompt(v); emit(word_chunks, v); }} />
      </label>
      <MediaUrlControls label="Image (optional)" value={image_url} onChange={(v) => { setImageUrl(v); emit(word_chunks); }} compact />
      <label className={labelClass()}>
        Prompt audio URL (optional)
        <input type="url" className="mt-1 w-full rounded border px-2 py-1 text-sm" value={prompt_audio_url} onChange={(e) => { setPromptAudio(e.target.value); emit(word_chunks); }} />
      </label>
      <label className={labelClass()}>
        Shape layout
        <select className="mt-1 w-full rounded border px-2 py-1 text-sm" value={shape_layout} onChange={(e) => { setShapeLayout(e.target.value as "line" | "wave" | "circle"); emit(word_chunks); }}>
          <option value="line">Line</option>
          <option value="wave">Wave</option>
          <option value="circle">Circle</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={shuffle_chunks} onChange={(e) => { setShuffleChunks(e.target.checked); emit(word_chunks); }} />
        Shuffle chunks
      </label>
      {word_chunks.map((w) => (
        <div key={w.id} className="grid gap-2 rounded border border-neutral-200 p-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input className="rounded border px-2 py-1 text-sm" value={w.id} onChange={(e) => { const v = e.target.value.trim(); const next = word_chunks.map((row) => row.id === w.id ? { ...row, id: v || row.id } : row); setWordChunks(next); emit(next); }} />
          <input className="rounded border px-2 py-1 text-sm" value={w.text} onChange={(e) => { const v = e.target.value; const next = word_chunks.map((row) => row.id === w.id ? { ...row, text: v } : row); setWordChunks(next); emit(next); }} />
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={w.is_vocab} onChange={(e) => { const next = word_chunks.map((row) => row.id === w.id ? { ...row, is_vocab: e.target.checked } : row); setWordChunks(next); emit(next); }} />
            vocab
          </label>
          <button type="button" className="rounded border border-red-200 px-2 py-1 text-xs text-red-800" disabled={word_chunks.length <= 2} onClick={() => { const next = word_chunks.filter((row) => row.id !== w.id); setWordChunks(next); emit(next); }}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50" onClick={() => { const next = [...word_chunks, { id: `chunk_${word_chunks.length + 1}`, text: "word", is_vocab: false }]; setWordChunks(next); emit(next); }}>
        Add chunk
      </button>
    </div>
  );
}

function TableCompleteFields({
  initial,
  onLivePayload,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "table_complete" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [prompt, setPrompt] = useState(initial.prompt);
  const [input_mode, setInputMode] = useState(initial.input_mode);
  const [left_column_label, setLeft] = useState(initial.left_column_label);
  const [right_column_label, setRight] = useState(initial.right_column_label);
  const [rows, setRows] = useState(() => initial.rows.map((r) => ({ ...r })));
  const [token_bank, setTokenBank] = useState(() => (initial.token_bank ?? []).map((t) => ({ ...t })));
  const [case_insensitive, setCaseInsensitive] = useState(initial.case_insensitive ?? true);
  const [normalize_whitespace, setNormalizeWhitespace] = useState(initial.normalize_whitespace ?? true);

  function emit(nextRows: typeof rows, nextTokens = token_bank, nextMode = input_mode) {
    emitLive(onLivePayload, tableCompletePayloadSchema, {
      type: "interaction",
      subtype: "table_complete",
      prompt,
      left_column_label,
      right_column_label,
      input_mode: nextMode,
      rows: nextRows,
      token_bank: nextTokens,
      case_insensitive,
      normalize_whitespace,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Prompt
        <textarea className="mt-1 w-full rounded border px-2 py-1 text-sm" rows={2} value={prompt} onChange={(e) => { setPrompt(e.target.value); emit(rows); }} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="rounded border px-2 py-1 text-sm" value={left_column_label} placeholder="Left column" onChange={(e) => { setLeft(e.target.value); emit(rows); }} />
        <input className="rounded border px-2 py-1 text-sm" value={right_column_label} placeholder="Right column" onChange={(e) => { setRight(e.target.value); emit(rows); }} />
      </div>
      <label className={labelClass()}>
        Input mode
        <select className="mt-1 w-full rounded border px-2 py-1 text-sm" value={input_mode} onChange={(e) => { const v = e.target.value as "typing" | "tokens"; setInputMode(v); emit(rows, token_bank, v); }}>
          <option value="typing">Typing</option>
          <option value="tokens">Tokens</option>
        </select>
      </label>
      {rows.map((r) => (
        <div key={r.id} className="rounded border border-neutral-200 p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded border px-2 py-1 text-sm" value={r.id} onChange={(e) => { const v = e.target.value.trim(); const next = rows.map((row) => row.id === r.id ? { ...row, id: v || row.id } : row); setRows(next); emit(next); }} />
            <input className="rounded border px-2 py-1 text-sm" value={r.prompt_text} onChange={(e) => { const v = e.target.value; const next = rows.map((row) => row.id === r.id ? { ...row, prompt_text: v } : row); setRows(next); emit(next); }} />
          </div>
          {input_mode === "typing" ? (
            <input className="mt-2 w-full rounded border px-2 py-1 text-sm" value={(r.accepted_answers ?? []).join(", ")} placeholder="Accepted answers (comma separated)" onChange={(e) => { const vals = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); const next = rows.map((row) => row.id === r.id ? { ...row, accepted_answers: vals } : row); setRows(next); emit(next); }} />
          ) : (
            <select className="mt-2 w-full rounded border px-2 py-1 text-sm" value={r.expected_token_id ?? ""} onChange={(e) => { const v = e.target.value; const next = rows.map((row) => row.id === r.id ? { ...row, expected_token_id: v || undefined } : row); setRows(next); emit(next); }}>
              <option value="">Select token</option>
              {token_bank.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}
        </div>
      ))}
      <button type="button" className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50" onClick={() => { const next = [...rows, { id: `row_${rows.length + 1}`, prompt_text: "Prompt", accepted_answers: ["Answer"] }]; setRows(next); emit(next); }}>
        Add row
      </button>
      {input_mode === "tokens" ? (
        <div className="space-y-2 rounded border border-neutral-200 p-3">
          <p className="text-sm font-semibold">Token bank</p>
          {token_bank.map((t) => (
            <div key={t.id} className="grid gap-2 sm:grid-cols-2">
              <input className="rounded border px-2 py-1 text-sm" value={t.id} onChange={(e) => { const v = e.target.value.trim(); const next = token_bank.map((row) => row.id === t.id ? { ...row, id: v || row.id } : row); setTokenBank(next); emit(rows, next); }} />
              <input className="rounded border px-2 py-1 text-sm" value={t.label} onChange={(e) => { const v = e.target.value; const next = token_bank.map((row) => row.id === t.id ? { ...row, label: v } : row); setTokenBank(next); emit(rows, next); }} />
            </div>
          ))}
          <button type="button" className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50" onClick={() => { const next = [...token_bank, { id: `tok_${token_bank.length + 1}`, label: "Token" }]; setTokenBank(next); emit(rows, next); }}>
            Add token
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={case_insensitive} onChange={(e) => { setCaseInsensitive(e.target.checked); emit(rows); }} /> Case insensitive</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={normalize_whitespace} onChange={(e) => { setNormalizeWhitespace(e.target.checked); emit(rows); }} /> Normalize whitespace</label>
        </div>
      )}
    </div>
  );
}

function SortingGameFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "sorting_game" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [prompt, setPrompt] = useState(initial.prompt);
  const [prompt_audio_url, setPromptAudio] = useState(initial.prompt_audio_url ?? "");
  const [containers, setContainers] = useState<typeof initial.containers>(() =>
    initial.containers.map((c) => ({
      ...c,
      display: {
        ...c.display,
        // Keep older payloads valid while editing by ensuring at least text or image.
        text: c.display.text ?? c.id,
        show_text: c.display.show_text ?? true,
        show_image: c.display.show_image ?? true,
        image_fit: c.display.image_fit ?? "contain",
      },
    })),
  );
  const [objects, setObjects] = useState<typeof initial.objects>(() =>
    initial.objects.map((o) => ({
      ...o,
      display: {
        ...o.display,
        // Same compatibility fallback for older payloads.
        text: o.display.text ?? o.id,
        show_text: o.display.show_text ?? true,
        show_image: o.display.show_image ?? true,
        image_fit: o.display.image_fit ?? "contain",
      },
    })),
  );
  const [shuffle_objects, setShuffleObjects] = useState(initial.shuffle_objects ?? true);
  const [allow_reassign, setAllowReassign] = useState(initial.allow_reassign ?? true);

  function emit(
    nextPrompt = prompt,
    nextPromptAudio = prompt_audio_url,
    nextContainers = containers,
    nextObjects = objects,
    nextShuffle = shuffle_objects,
    nextAllowReassign = allow_reassign,
  ) {
    emitLive(onLivePayload, sortingGamePayloadSchema, {
      type: "interaction",
      subtype: "sorting_game",
      prompt: nextPrompt,
      prompt_audio_url: nextPromptAudio || undefined,
      containers: nextContainers,
      objects: nextObjects,
      shuffle_objects: nextShuffle,
      allow_reassign: nextAllowReassign,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Prompt
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={prompt}
          onChange={(e) => {
            const next = e.target.value;
            setPrompt(next);
            emit(next);
          }}
        />
      </label>
      <label className={labelClass()}>
        Prompt audio URL (optional)
        <input
          type="url"
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={prompt_audio_url}
          onChange={(e) => {
            const next = e.target.value;
            setPromptAudio(next);
            emit(prompt, next);
          }}
        />
      </label>
      <div className="space-y-2 rounded border border-neutral-200 p-3">
        <p className="text-sm font-semibold">Containers (min 2)</p>
        {containers.map((c) => (
          <div key={c.id} className="space-y-2 rounded border border-neutral-200 bg-white p-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={c.id}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const nextId = v || c.id;
                  const nextContainers = containers.map((row) =>
                    row.id === c.id ?
                      {
                        ...row,
                        id: nextId,
                        display: {
                          ...row.display,
                          text: row.display.text ?? nextId,
                        },
                      }
                    : row,
                  );
                  const nextObjects = objects.map((obj) =>
                    obj.target_container_id === c.id ?
                      { ...obj, target_container_id: nextId }
                    : obj,
                  );
                  setContainers(nextContainers);
                  setObjects(nextObjects);
                  emit(prompt, prompt_audio_url, nextContainers, nextObjects);
                }}
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={c.display.text ?? ""}
                placeholder="text (optional)"
                onChange={(e) => {
                  const nextContainers = containers.map((row) =>
                    row.id === c.id ?
                      { ...row, display: { ...row.display, text: e.target.value || undefined } }
                    : row,
                  );
                  setContainers(nextContainers);
                  emit(prompt, prompt_audio_url, nextContainers, objects);
                }}
              />
            </div>
            <MediaUrlControls
              label="Container image (optional)"
              compact
              value={c.display.image_url ?? ""}
              onChange={(v) => {
                const nextContainers = containers.map((row) =>
                  row.id === c.id ?
                    { ...row, display: { ...row.display, image_url: v || undefined } }
                  : row,
                );
                setContainers(nextContainers);
                emit(prompt, prompt_audio_url, nextContainers, objects);
              }}
              disabled={busy}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={c.display.show_text ?? true}
                  onChange={(e) => {
                    const nextContainers = containers.map((row) =>
                      row.id === c.id ?
                        { ...row, display: { ...row.display, show_text: e.target.checked } }
                      : row,
                    );
                    setContainers(nextContainers);
                    emit(prompt, prompt_audio_url, nextContainers, objects);
                  }}
                />
                Show text
              </label>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={c.display.show_image ?? true}
                  onChange={(e) => {
                    const nextContainers = containers.map((row) =>
                      row.id === c.id ?
                        { ...row, display: { ...row.display, show_image: e.target.checked } }
                      : row,
                    );
                    setContainers(nextContainers);
                    emit(prompt, prompt_audio_url, nextContainers, objects);
                  }}
                />
                Show image
              </label>
              <label className="text-xs font-medium">
                Image fit
                <select
                  className="ml-1 rounded border px-1 py-0.5 text-xs"
                  value={c.display.image_fit ?? "contain"}
                  onChange={(e) => {
                    const fit = e.target.value as "contain" | "cover";
                    const nextContainers = containers.map((row) =>
                      row.id === c.id ?
                        { ...row, display: { ...row.display, image_fit: fit } }
                      : row,
                    );
                    setContainers(nextContainers);
                    emit(prompt, prompt_audio_url, nextContainers, objects);
                  }}
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </label>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-sm"
            onClick={() => {
              const id = nextDragRowId(containers, "c");
              const nextContainers = [...containers, { id, display: { text: id } }];
              setContainers(nextContainers);
              emit(prompt, prompt_audio_url, nextContainers, objects);
            }}
          >
            Add container
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-sm"
            onClick={() => {
              if (containers.length <= 2) return;
              const removeId = containers[containers.length - 1].id;
              const nextContainers = containers.filter((row) => row.id !== removeId);
              const fallbackId = nextContainers[0]?.id ?? removeId;
              const nextObjects = objects.map((obj) =>
                obj.target_container_id === removeId ?
                  { ...obj, target_container_id: fallbackId }
                : obj,
              );
              setContainers(nextContainers);
              setObjects(nextObjects);
              emit(prompt, prompt_audio_url, nextContainers, nextObjects);
            }}
          >
            Remove last container
          </button>
        </div>
      </div>
      <div className="space-y-2 rounded border border-neutral-200 p-3">
        <p className="text-sm font-semibold">Objects</p>
        {objects.map((o) => (
          <div key={o.id} className="space-y-2 rounded border border-neutral-200 bg-white p-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={o.id}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const nextObjects = objects.map((row) =>
                    row.id === o.id ? { ...row, id: v || row.id } : row,
                  );
                  setObjects(nextObjects);
                  emit(prompt, prompt_audio_url, containers, nextObjects);
                }}
              />
              <input
                className="rounded border px-2 py-1 text-sm"
                value={o.display.text ?? ""}
                placeholder="text (optional)"
                onChange={(e) => {
                  const nextObjects = objects.map((row) =>
                    row.id === o.id ?
                      { ...row, display: { ...row.display, text: e.target.value || undefined } }
                    : row,
                  );
                  setObjects(nextObjects);
                  emit(prompt, prompt_audio_url, containers, nextObjects);
                }}
              />
              <select
                className="rounded border px-2 py-1 text-sm"
                value={o.target_container_id}
                onChange={(e) => {
                  const v = e.target.value;
                  const nextObjects = objects.map((row) =>
                    row.id === o.id ? { ...row, target_container_id: v } : row,
                  );
                  setObjects(nextObjects);
                  emit(prompt, prompt_audio_url, containers, nextObjects);
                }}
              >
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}
                  </option>
                ))}
              </select>
            </div>
            <MediaUrlControls
              label="Object image (optional)"
              compact
              value={o.display.image_url ?? ""}
              onChange={(v) => {
                const nextObjects = objects.map((row) =>
                  row.id === o.id ?
                    { ...row, display: { ...row.display, image_url: v || undefined } }
                  : row,
                );
                setObjects(nextObjects);
                emit(prompt, prompt_audio_url, containers, nextObjects);
              }}
              disabled={busy}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={o.display.show_text ?? true}
                  onChange={(e) => {
                    const nextObjects = objects.map((row) =>
                      row.id === o.id ?
                        { ...row, display: { ...row.display, show_text: e.target.checked } }
                      : row,
                    );
                    setObjects(nextObjects);
                    emit(prompt, prompt_audio_url, containers, nextObjects);
                  }}
                />
                Show text
              </label>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={o.display.show_image ?? true}
                  onChange={(e) => {
                    const nextObjects = objects.map((row) =>
                      row.id === o.id ?
                        { ...row, display: { ...row.display, show_image: e.target.checked } }
                      : row,
                    );
                    setObjects(nextObjects);
                    emit(prompt, prompt_audio_url, containers, nextObjects);
                  }}
                />
                Show image
              </label>
              <label className="text-xs font-medium">
                Image fit
                <select
                  className="ml-1 rounded border px-1 py-0.5 text-xs"
                  value={o.display.image_fit ?? "contain"}
                  onChange={(e) => {
                    const fit = e.target.value as "contain" | "cover";
                    const nextObjects = objects.map((row) =>
                      row.id === o.id ?
                        { ...row, display: { ...row.display, image_fit: fit } }
                      : row,
                    );
                    setObjects(nextObjects);
                    emit(prompt, prompt_audio_url, containers, nextObjects);
                  }}
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </label>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-sm"
            onClick={() => {
              const id = nextDragRowId(objects, "o");
              const fallbackContainerId = containers[0]?.id ?? "c1";
              const nextObjects = [
                ...objects,
                { id, display: { text: id }, target_container_id: fallbackContainerId },
              ];
              setObjects(nextObjects);
              emit(prompt, prompt_audio_url, containers, nextObjects);
            }}
          >
            Add object
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-sm"
            onClick={() => {
              if (objects.length <= 2) return;
              const removeId = objects[objects.length - 1].id;
              const nextObjects = objects.filter((row) => row.id !== removeId);
              setObjects(nextObjects);
              emit(prompt, prompt_audio_url, containers, nextObjects);
            }}
          >
            Remove last object
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shuffle_objects}
            onChange={(e) => {
              const next = e.target.checked;
              setShuffleObjects(next);
              emit(prompt, prompt_audio_url, containers, objects, next, allow_reassign);
            }}
          />{" "}
          Shuffle objects
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allow_reassign}
            onChange={(e) => {
              const next = e.target.checked;
              setAllowReassign(next);
              emit(prompt, prompt_audio_url, containers, objects, shuffle_objects, next);
            }}
          />{" "}
          Allow reassign
        </label>
      </div>
    </div>
  );
}

function VoiceQuestionFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "voice_question" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [prompt, setPrompt] = useState(initial.prompt);
  const [image_url, setImageUrl] = useState(initial.image_url ?? "");
  const [prompt_audio_url, setPromptAudioUrl] = useState(initial.prompt_audio_url ?? "");
  const [max_duration_seconds, setMaxDurationSeconds] = useState(initial.max_duration_seconds ?? 90);
  const [max_attempts, setMaxAttempts] = useState(initial.max_attempts ?? 3);
  const [require_playback_before_submit, setRequirePlaybackBeforeSubmit] = useState(
    initial.require_playback_before_submit ?? false,
  );

  useEffect(() => {
    setPrompt(initial.prompt);
    setImageUrl(initial.image_url ?? "");
    setPromptAudioUrl(initial.prompt_audio_url ?? "");
    setMaxDurationSeconds(initial.max_duration_seconds ?? 90);
    setMaxAttempts(initial.max_attempts ?? 3);
    setRequirePlaybackBeforeSubmit(initial.require_playback_before_submit ?? false);
  }, [initial]);

  function emit(
    nextPrompt: string,
    nextImage: string,
    nextPromptAudio: string,
    nextMaxDuration: number,
    nextMaxAttempts: number,
    nextRequirePlayback: boolean,
  ) {
    emitLive(onLivePayload, voiceQuestionPayloadSchema, {
      type: "interaction",
      subtype: "voice_question",
      prompt: nextPrompt,
      image_url: nextImage || undefined,
      prompt_audio_url: nextPromptAudio || undefined,
      max_duration_seconds: nextMaxDuration,
      max_attempts: nextMaxAttempts,
      require_playback_before_submit: nextRequirePlayback,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-2">
      <label className={labelClass()}>
        Prompt
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={3}
          value={prompt}
          onChange={(e) => {
            const v = e.target.value;
            setPrompt(v);
            emit(v, image_url, prompt_audio_url, max_duration_seconds, max_attempts, require_playback_before_submit);
          }}
        />
      </label>
      <MediaUrlControls
        label="Image (optional)"
        value={image_url}
        onChange={(v) => {
          setImageUrl(v);
          emit(prompt, v, prompt_audio_url, max_duration_seconds, max_attempts, require_playback_before_submit);
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Prompt audio URL (optional)
        <input
          type="url"
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={prompt_audio_url}
          onChange={(e) => {
            const v = e.target.value;
            setPromptAudioUrl(v);
            emit(prompt, image_url, v, max_duration_seconds, max_attempts, require_playback_before_submit);
          }}
        />
      </label>
      <label className={labelClass()}>
        Max recording duration (seconds)
        <input
          type="number"
          min={5}
          max={300}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={max_duration_seconds}
          onChange={(e) => {
            const v = Math.max(5, Math.min(300, Number(e.target.value) || 90));
            setMaxDurationSeconds(v);
            emit(prompt, image_url, prompt_audio_url, v, max_attempts, require_playback_before_submit);
          }}
        />
      </label>
      <label className={labelClass()}>
        Max attempts
        <input
          type="number"
          min={1}
          max={10}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={max_attempts}
          onChange={(e) => {
            const v = Math.max(1, Math.min(10, Number(e.target.value) || 3));
            setMaxAttempts(v);
            emit(prompt, image_url, prompt_audio_url, max_duration_seconds, v, require_playback_before_submit);
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={require_playback_before_submit}
          onChange={(e) => {
            const v = e.target.checked;
            setRequirePlaybackBeforeSubmit(v);
            emit(prompt, image_url, prompt_audio_url, max_duration_seconds, max_attempts, v);
          }}
        />
        Require students to playback before submit
      </label>
    </div>
  );
}

function GuidedDialogueFields({
  initial,
  onLivePayload,
  busy,
}: {
  initial: Extract<ScreenPayload, { type: "interaction"; subtype: "guided_dialogue" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  type Turn = (typeof initial.turns)[number];
  const [character_name, setCharacterName] = useState(initial.character_name);
  const [character_image_url, setCharacterImageUrl] = useState(initial.character_image_url);
  const [intro_text, setIntroText] = useState(initial.intro_text ?? "");
  const [turns, setTurns] = useState<Turn[]>(() => initial.turns.map((t) => ({ ...t })));
  const [require_turn_audio_playback, setRequireTurnAudioPlayback] = useState(
    initial.require_turn_audio_playback ?? false,
  );
  const [allow_retry_each_turn, setAllowRetryEachTurn] = useState(initial.allow_retry_each_turn ?? true);

  useEffect(() => {
    setCharacterName(initial.character_name);
    setCharacterImageUrl(initial.character_image_url);
    setIntroText(initial.intro_text ?? "");
    setTurns(initial.turns.map((t) => ({ ...t })));
    setRequireTurnAudioPlayback(initial.require_turn_audio_playback ?? false);
    setAllowRetryEachTurn(initial.allow_retry_each_turn ?? true);
  }, [initial]);

  function emit(next: {
    character_name: string;
    character_image_url: string;
    intro_text: string;
    turns: Turn[];
    require_turn_audio_playback: boolean;
    allow_retry_each_turn: boolean;
  }) {
    emitLive(onLivePayload, guidedDialoguePayloadSchema, {
      type: "interaction",
      subtype: "guided_dialogue",
      character_name: next.character_name,
      character_image_url: next.character_image_url,
      intro_text: next.intro_text || undefined,
      turns: next.turns,
      require_turn_audio_playback: next.require_turn_audio_playback,
      allow_retry_each_turn: next.allow_retry_each_turn,
      guide: initial.guide,
    });
  }

  return (
    <div className="space-y-3">
      <label className={labelClass()}>
        Character name
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={character_name}
          onChange={(e) => {
            const v = e.target.value;
            setCharacterName(v);
            emit({ character_name: v, character_image_url, intro_text, turns, require_turn_audio_playback, allow_retry_each_turn });
          }}
        />
      </label>
      <MediaUrlControls
        label="Character image"
        value={character_image_url}
        onChange={(v) => {
          setCharacterImageUrl(v);
          emit({ character_name, character_image_url: v, intro_text, turns, require_turn_audio_playback, allow_retry_each_turn });
        }}
        disabled={busy}
        compact
      />
      <label className={labelClass()}>
        Intro text (optional)
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={intro_text}
          onChange={(e) => {
            const v = e.target.value;
            setIntroText(v);
            emit({ character_name, character_image_url, intro_text: v, turns, require_turn_audio_playback, allow_retry_each_turn });
          }}
        />
      </label>
      <div className="space-y-2 rounded border border-neutral-200 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-800">Dialogue turns</p>
          <button
            type="button"
            className="rounded border border-neutral-400 bg-white px-2 py-1 text-xs font-semibold"
            onClick={() => {
              const id = `turn_${turns.length + 1}`;
              const next = [...turns, { id, prompt_text: "New turn prompt", max_duration_seconds: 90 }];
              setTurns(next);
              emit({ character_name, character_image_url, intro_text, turns: next, require_turn_audio_playback, allow_retry_each_turn });
            }}
            disabled={busy}
          >
            Add turn
          </button>
        </div>
        {turns.map((turn, i) => (
          <div key={turn.id} className="space-y-2 rounded border border-neutral-200 bg-neutral-50 p-2">
            <p className="text-xs font-semibold text-neutral-700">Turn {i + 1}</p>
            <label className={labelClass()}>
              Turn id
              <input
                className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
                value={turn.id}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = turns.map((t, idx) => (idx === i ? { ...t, id: v } : t));
                  setTurns(next);
                  emit({ character_name, character_image_url, intro_text, turns: next, require_turn_audio_playback, allow_retry_each_turn });
                }}
              />
            </label>
            <label className={labelClass()}>
              Character prompt
              <textarea
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                rows={2}
                value={turn.prompt_text}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = turns.map((t, idx) => (idx === i ? { ...t, prompt_text: v } : t));
                  setTurns(next);
                  emit({ character_name, character_image_url, intro_text, turns: next, require_turn_audio_playback, allow_retry_each_turn });
                }}
              />
            </label>
            <label className={labelClass()}>
              Prompt audio URL (optional)
              <input
                type="url"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={turn.prompt_audio_url ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = turns.map((t, idx) => (idx === i ? { ...t, prompt_audio_url: v || undefined } : t));
                  setTurns(next);
                  emit({ character_name, character_image_url, intro_text, turns: next, require_turn_audio_playback, allow_retry_each_turn });
                }}
              />
            </label>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={require_turn_audio_playback}
          onChange={(e) => {
            const v = e.target.checked;
            setRequireTurnAudioPlayback(v);
            emit({ character_name, character_image_url, intro_text, turns, require_turn_audio_playback: v, allow_retry_each_turn });
          }}
        />
        Require audio prompts to be played before recording
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allow_retry_each_turn}
          onChange={(e) => {
            const v = e.target.checked;
            setAllowRetryEachTurn(v);
            emit({ character_name, character_image_url, intro_text, turns, require_turn_audio_playback, allow_retry_each_turn: v });
          }}
        />
        Allow retry per turn
      </label>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { LiveGameLandingShell } from "@/components/live-game/LiveGameLandingShell";
import { LiveGameQuestionSetCarousel } from "@/components/live-game/LiveGameQuestionSetCarousel";
import {
  LIVE_GAME_DEFAULT_PLAYER_COLOR,
  setLiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import {
  ENGLISH_CRAFT_DURATION_OPTIONS,
  ENGLISH_CRAFT_MODE,
  formatEnglishCraftDurationSelectValue,
  normalizeEnglishCraftDurationMinutes,
  parseEnglishCraftDurationSelectValue,
  type EnglishCraftSessionDuration,
} from "@/lib/live-game/modes/english-craft/config";
import {
  LIVE_GAME_DEFAULT_AVATAR_ID,
  type LiveGameCharacterId,
} from "@/lib/live-game/characters/live-game-characters";
import { LiveGameCharacterPicker } from "@/components/live-game/LiveGameCharacterPicker";
import type { LiveGameQuestionSetCard } from "@/lib/live-game/question-banks/types";
import {
  fetchPublishedQuestionSets,
  resolveInitialQuestionSetSelection,
  writeLastSelectedQuestionSetId,
} from "@/lib/live-game/question-banks/question-sets-api-client";
import { duplicateQuestionSet } from "@/lib/live-game/question-banks/question-sets-editor-api";
import {
  canCreateHostRoom,
  reconcileSelectedClassId,
  resolveHostClassLoadState,
  resolveHostSetsLoadState,
  shouldLoadClassesEagerly,
  type TeacherClassOption,
} from "@/lib/live-game/host-setup-loading";
import {
  diagnosticFetch,
  recordLiveGameDiagnostic,
} from "@/lib/live-game/diagnostics/client";

export function LiveGameHostPage({
  initialClassId = "",
  initialQuestionSetId = "",
}: {
  initialClassId?: string;
  initialQuestionSetId?: string;
}) {
  const router = useRouter();
  const setupMountedAtRef = useRef(0);
  const creationIdRef = useRef<string | null>(null);
  const [displayName, setDisplayName] = useState("Teacher");
  const [avatarId, setAvatarId] = useState<LiveGameCharacterId>(LIVE_GAME_DEFAULT_AVATAR_ID);
  const [durationMinutes, setDurationMinutes] = useState<EnglishCraftSessionDuration>(
    ENGLISH_CRAFT_MODE.defaultDurationMinutes as EnglishCraftSessionDuration,
  );
  const [questionSets, setQuestionSets] = useState<LiveGameQuestionSetCard[]>([]);
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string | null>(
    initialQuestionSetId.trim() || null,
  );
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [setsRetryCount, setSetsRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesRequested, setClassesRequested] = useState(false);
  const [classesRetryCount, setClassesRetryCount] = useState(0);
  const classesInFlightRef = useRef(false);
  const setsRequestedRef = useRef(false);

  const elapsedSinceMountMs = useCallback(() => {
    const started = setupMountedAtRef.current || 0;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    return Math.max(0, Math.round(now - started));
  }, []);

  const loadQuestionSets = useCallback(
    async (options?: { bypassCache?: boolean; isRetry?: boolean }) => {
      setSetsLoading(true);
      setSetsError(null);
      if (options?.isRetry) setSetsRetryCount((count) => count + 1);
      try {
        const sets = await fetchPublishedQuestionSets({
          bypassCache: options?.bypassCache === true || options?.isRetry === true,
        });
        setQuestionSets(sets);
        setSelectedQuestionSetId((current) => {
          const preferred = initialQuestionSetId.trim();
          if (preferred && sets.some((set) => set.id === preferred)) {
            return preferred;
          }
          if (current && sets.some((set) => set.id === current)) {
            return current;
          }
          return resolveInitialQuestionSetSelection(sets);
        });
        recordLiveGameDiagnostic("entry", "question_sets_selector_ready", {
          resultCount: sets.length,
          selectorReadyMs: elapsedSinceMountMs(),
          firstUsableRenderMs: elapsedSinceMountMs(),
          retryCount: options?.isRetry ? setsRetryCount + 1 : 0,
          blockingSetup: false,
        });
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Could not load question sets.";
        setSetsError(message);
        setQuestionSets([]);
        setSelectedQuestionSetId(null);
      } finally {
        setSetsLoading(false);
      }
    },
    [elapsedSinceMountMs, initialQuestionSetId, setsRetryCount],
  );

  const loadClasses = useCallback(
    async (options?: { isRetry?: boolean }) => {
      if (classesInFlightRef.current) return;
      classesInFlightRef.current = true;
      setClassesRequested(true);
      setClassesLoading(true);
      setClassesError(null);
      if (options?.isRetry) setClassesRetryCount((count) => count + 1);
      try {
        const response = await diagnosticFetch(
          "/api/live-game/classes",
          { cache: "no-store" },
          {
            phase: "entry",
            name: "teacher_classes_load",
            detail: {
              classLoadDeferred: !shouldLoadClassesEagerly(initialClassId),
              blockingSetup: false,
              retryCount: options?.isRetry ? classesRetryCount + 1 : 0,
            },
          },
        );
        const payload = (await response.json()) as {
          classes?: TeacherClassOption[];
          error?: string;
          meta?: { resultCount?: number; queryCount?: number; queryStrategy?: string };
        };
        if (!response.ok) throw new Error(payload.error ?? "Could not load classes.");
        const availableClasses = payload.classes ?? [];
        setClasses(availableClasses);
        setSelectedClassId((current) => reconcileSelectedClassId(current, availableClasses));
        recordLiveGameDiagnostic("entry", "teacher_classes_selector_ready", {
          resultCount: availableClasses.length,
          selectorReadyMs: elapsedSinceMountMs(),
          queryCount: payload.meta?.queryCount ?? 1,
          queryStrategy: payload.meta?.queryStrategy ?? "single_select",
          classLoadDeferred: !shouldLoadClassesEagerly(initialClassId),
          blockingSetup: false,
          retryCount: options?.isRetry ? classesRetryCount + 1 : 0,
        });
      } catch (loadError) {
        setClassesError(
          loadError instanceof Error ? loadError.message : "Could not load classes.",
        );
      } finally {
        setClassesLoading(false);
        classesInFlightRef.current = false;
      }
    },
    [classesRetryCount, elapsedSinceMountMs, initialClassId],
  );

  useEffect(() => {
    setupMountedAtRef.current =
      typeof performance === "undefined" ? Date.now() : performance.now();
    recordLiveGameDiagnostic("entry", "host_setup_mounted", {
      firstUsableRenderMs: 0,
      classLoadDeferred: !shouldLoadClassesEagerly(initialClassId),
      blockingSetup: false,
    });
    if (setsRequestedRef.current) return;
    setsRequestedRef.current = true;
    void loadQuestionSets();
  }, [initialClassId, loadQuestionSets]);

  useEffect(() => {
    // Only eager-load classes when deep-linked with ?classId= so the selection can be validated.
    if (!shouldLoadClassesEagerly(initialClassId)) return;
    if (classesRequested || classesInFlightRef.current) return;
    void loadClasses();
    // Intentionally once per deep-link class id; loadClasses identity changes with retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deferred eager load on mount only
  }, [initialClassId]);

  const selectedSet =
    questionSets.find((set) => set.id === selectedQuestionSetId) ?? null;

  const setsState = resolveHostSetsLoadState({
    loading: setsLoading,
    error: setsError,
    count: questionSets.length,
  });
  const classState = resolveHostClassLoadState({
    requested: classesRequested,
    loading: classesLoading,
    error: classesError,
    count: classes.length,
  });

  function handleSelectQuestionSet(id: string) {
    setSelectedQuestionSetId(id);
    writeLastSelectedQuestionSetId(id);
  }

  function handleClassSelectInteraction() {
    if (classesRequested || classesInFlightRef.current) return;
    void loadClasses();
  }

  async function handleEditQuestionSet(id: string) {
    const card = questionSets.find((set) => set.id === id);
    if (!card) return;

    setEditingSetId(id);
    setError(null);
    try {
      const draftId =
        card.visibility === "system" ? (await duplicateQuestionSet(id)).id : id;
      router.push(`/live-game/question-sets/${draftId}/edit`);
    } catch (editError) {
      const message =
        editError instanceof Error ? editError.message : "Could not open question editor.";
      setError(message);
      setEditingSetId(null);
    }
  }

  async function handleCreate(questionSetId?: string) {
    const setId = questionSetId ?? selectedQuestionSetId;
    const name = displayName.trim();
    if (!name) {
      setError("Enter your name.");
      return;
    }
    if (!setId) {
      setError("Choose a question set.");
      return;
    }

    if (!creationIdRef.current) {
      creationIdRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ?
          crypto.randomUUID()
        : "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12);
    }
    const creationId = creationIdRef.current;

    setIsSubmitting(true);
    setError(null);
    recordLiveGameDiagnostic("room", "create_room_click", {
      hasClass: Boolean(selectedClassId),
      durationMinutes: durationMinutes ?? "unlimited",
      creationIdPrefix: creationId.slice(0, 8),
    });
    writeLastSelectedQuestionSetId(setId);

    try {
      const response = await diagnosticFetch("/api/live-game/sessions/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          modeId: ENGLISH_CRAFT_MODE.id,
          durationMinutes,
          avatarId,
          questionSetId: setId,
          classId: selectedClassId || null,
          creationId,
        }),
      }, { phase: "room", name: "host_room_create", detail: { creationIdPrefix: creationId.slice(0, 8) } });

      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        userId?: string;
        mapId?: string;
        durationMinutes?: number;
        questionSetId?: string;
        questionSetVersion?: number;
        classId?: string | null;
        classTitle?: string | null;
      };

      if (!response.ok || !payload.sessionId || !payload.userId) {
        throw new Error(payload.error ?? "Could not create a live game room.");
      }

      creationIdRef.current = null;

      setLiveGameSessionContext({
        sessionId: payload.sessionId,
        role: "host",
        displayName: name,
        color: LIVE_GAME_DEFAULT_PLAYER_COLOR,
        userId: payload.userId,
        classId: payload.classId ?? null,
        classTitle: payload.classTitle ?? null,
        avatarId,
        modeId: ENGLISH_CRAFT_MODE.id,
        mapId: payload.mapId ?? ENGLISH_CRAFT_MODE.defaultMapId,
        durationMinutes: normalizeEnglishCraftDurationMinutes(
          payload.durationMinutes ?? durationMinutes ?? ENGLISH_CRAFT_MODE.defaultDurationMinutes,
        ),
        questionSetId: payload.questionSetId ?? setId,
        questionSetVersion: payload.questionSetVersion ?? selectedSet?.version ?? 1,
      });

      recordLiveGameDiagnostic("room", "host_session_context_saved", { sessionId: payload.sessionId });
      router.push(`/live-game/${payload.sessionId}`);
      recordLiveGameDiagnostic("room", "host_session_navigation_requested", { sessionId: payload.sessionId });
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Could not create a live game room.";
      setError(message);
      setIsSubmitting(false);
    }
  }

  const createEnabled = canCreateHostRoom({
    isSubmitting,
    setsLoading,
    selectedQuestionSetId,
    classesLoading,
  });

  return (
    <LiveGameLandingShell
      eyebrow="Teacher setup"
      title="Build a lively English session."
      description={`${ENGLISH_CRAFT_MODE.title}: ${ENGLISH_CRAFT_MODE.subtitle}. Choose the practice, invite your students, and play together.`}
      wide
    >
      <div>
        <h2 className="text-xl font-extrabold text-kid-ink">Room details</h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/70">
          Mode: {ENGLISH_CRAFT_MODE.title} — {ENGLISH_CRAFT_MODE.subtitle}
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Your name</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Save this game to a class</span>
        <select
          value={selectedClassId}
          onFocus={handleClassSelectInteraction}
          onPointerDown={handleClassSelectInteraction}
          onChange={(event) => setSelectedClassId(event.target.value)}
          className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
        >
          <option value="">One-off game (no class project)</option>
          {classes.map((teacherClass) => (
            <option key={teacherClass.id} value={teacherClass.id}>
              {teacherClass.title}
            </option>
          ))}
        </select>
        <span className="block text-xs font-semibold text-kid-ink/65">
          {classState === "idle" ?
            "Optional. Open the menu to load your classes."
          : classState === "loading" ?
            "Loading classes..."
          : classState === "empty" ?
            "No active classes yet. You can still create a one-off game."
          : "Class games add their completed rounds to that class’s Live Game project."}
        </span>
        {classesError ?
          <span className="block space-y-1">
            <span className="block text-xs font-semibold text-red-700">{classesError}</span>
            <KidButton variant="secondary" onClick={() => void loadClasses({ isRetry: true })}>
              Retry classes
            </KidButton>
          </span>
        : null}
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Session length (minutes)</span>
        <select
          value={formatEnglishCraftDurationSelectValue(durationMinutes)}
          onChange={(event) =>
            setDurationMinutes(parseEnglishCraftDurationSelectValue(event.target.value))
          }
          className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
        >
          {ENGLISH_CRAFT_DURATION_OPTIONS.map((mins) => (
            <option key={mins} value={mins}>
              {mins} minutes
            </option>
          ))}
        </select>
      </label>

      <LiveGameCharacterPicker value={avatarId} onChange={setAvatarId} compact />

      <div className="space-y-2">
        <span className="text-sm font-bold text-kid-ink">Question set</span>
        {setsState === "loading" ?
          <p className="text-sm font-semibold text-kid-ink/70">Loading question sets...</p>
        : setsState === "error" ?
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700">{setsError}</p>
            <KidButton
              variant="secondary"
              onClick={() => void loadQuestionSets({ bypassCache: true, isRetry: true })}
            >
              Retry
            </KidButton>
          </div>
        : setsState === "empty" ?
          <p className="text-sm font-semibold text-kid-ink/70">No published question sets.</p>
        : <>
            <LiveGameQuestionSetCarousel
              sets={questionSets}
              selectedId={selectedQuestionSetId}
              onSelect={handleSelectQuestionSet}
              onPlay={(id) => void handleCreate(id)}
              onEdit={(id) => void handleEditQuestionSet(id)}
              disabled={isSubmitting}
              editingId={editingSetId}
            />
            {selectedSet ?
              <p className="text-sm font-semibold text-kid-ink/70">
                Selected: {selectedSet.learningObjective}
              </p>
            : null}
          </>
        }
      </div>

      {error ?
        <p className="text-sm font-semibold text-red-700">{error}</p>
      : null}

      <KidButton
        variant="primary"
        disabled={!createEnabled}
        onClick={() => void handleCreate()}
      >
        {isSubmitting ? "Creating..." : "Create English Craft room"}
      </KidButton>
    </LiveGameLandingShell>
  );
}
